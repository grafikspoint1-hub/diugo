import { ConflictException, HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ResetAdminCredentialsDto, VerifyAdminRecoveryDto } from './dto/admin-recovery.dto';
import { SmsService } from './sms.service';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
const OTP_TTL_MS = 5 * 60_000;
const OTP_COOLDOWN_MS = 60_000;
const RECOVERY_TOKEN_TTL_MS = 10 * 60_000;
const RATE_WINDOW_MS = 60 * 60_000;
class TooManyRequestsException extends HttpException {
  constructor(message: string) { super(message, HttpStatus.TOO_MANY_REQUESTS); }
}

@Injectable()
export class AdminAuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly sms: SmsService) {}

  async login(dto: LoginDto, ipAddress: string) {
    const identifier = dto.identifier.trim();
    const identifierFingerprint = this.fingerprint(identifier.toLowerCase());
    const since = new Date(Date.now() - 15 * 60_000);
    const [byIp, byIdentifier] = await Promise.all([
      this.prisma.adminLoginAttempt.count({ where: { ipAddress, succeeded: false, createdAt: { gte: since } } }),
      this.prisma.adminLoginAttempt.count({ where: { identifierFingerprint, succeeded: false, createdAt: { gte: since } } }),
    ]);
    if (byIp >= 10 || byIdentifier >= 5) throw new TooManyRequestsException('Too many sign-in attempts. Try again later.');

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }, { phone: identifier }], role: { in: ADMIN_ROLES } },
    });
    const passwordValid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !passwordValid || user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      await this.recordLoginAttempt(identifierFingerprint, ipAddress, false);
      await this.audit(user?.id, 'ADMIN_LOGIN_FAILED', 'User', user?.id, ipAddress);
      throw new UnauthorizedException('Invalid admin login credentials');
    }

    await this.recordLoginAttempt(identifierFingerprint, ipAddress, true);
    await this.audit(user.id, 'ADMIN_LOGIN_SUCCEEDED', 'User', user.id, ipAddress);
    const safeUser = { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role, sessionVersion: user.sessionVersion });
    return { user: safeUser, accessToken };
  }

  recoveryInfo() {
    const phone = this.recoveryPhone();
    return { phone: phone ? this.maskPhone(phone) : null, available: Boolean(phone), message: phone ? undefined : 'Admin account recovery is not configured.' };
  }

  async requestOtp(ipAddress: string) {
    const phone = this.requireRecoveryPhone();
    this.requireSmsConfiguration();
    const phoneFingerprint = this.fingerprint(phone);
    await this.checkRecoveryRate(phoneFingerprint, ipAddress);
    const admin = await this.prisma.user.findFirst({ where: { phone, role: { in: ADMIN_ROLES } } });
    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const now = new Date();
    const request = await this.prisma.$transaction(async (tx: any) => {
      await tx.adminRecoveryRequest.updateMany({
        where: { phoneFingerprint, completedAt: null },
        data: { completedAt: now, expiresAt: now, recoveryTokenHash: null },
      });
      return tx.adminRecoveryRequest.create({ data: {
        adminUserId: admin?.id ?? null, phoneFingerprint, ipAddress,
        otpHash: this.otpHash(otp), expiresAt: new Date(now.getTime() + OTP_TTL_MS), lastSentAt: now,
      } });
    });
    if (admin) {
      try { await this.sms.send(phone, `Your DIU GO admin recovery code is ${otp}. It expires in 5 minutes. Do not share it.`); }
      catch (error) { await this.invalidateOtp(request.id); throw error; }
    }
    await this.audit(admin?.id, 'ADMIN_RECOVERY_OTP_REQUESTED', 'AdminRecoveryRequest', request.id, ipAddress);
    return { requestId: request.id, message: 'If the configured recovery number is eligible, a verification code has been sent.' };
  }

  async resendOtp(requestId: string, ipAddress: string) {
    const phone = this.requireRecoveryPhone();
    this.requireSmsConfiguration();
    const request = await this.prisma.adminRecoveryRequest.findFirst({ where: { id: requestId, ipAddress } });
    if (!request || request.completedAt || request.verifiedAt || request.lockedUntil && request.lockedUntil > new Date()) throw new UnauthorizedException('This recovery request is no longer available. Start again.');
    if (Date.now() - request.lastSentAt.getTime() < OTP_COOLDOWN_MS) throw new TooManyRequestsException('Wait 60 seconds before requesting another code.');
    await this.checkRecoveryRate(request.phoneFingerprint, ipAddress);
    if (request.resendCount >= 4) throw new TooManyRequestsException('Too many code requests. Start again later.');
    const admin = request.adminUserId ? await this.prisma.user.findFirst({ where: { id: request.adminUserId, phone, role: { in: ADMIN_ROLES } } }) : null;
    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const now = new Date();
    await this.prisma.adminRecoveryRequest.update({ where: { id: request.id }, data: {
      otpHash: this.otpHash(otp), expiresAt: new Date(now.getTime() + OTP_TTL_MS), lastSentAt: now,
      resendCount: { increment: 1 }, attemptCount: 0, verifiedAt: null, recoveryTokenHash: null, recoveryTokenExpiresAt: null,
    } });
    if (admin) {
      try { await this.sms.send(phone, `Your DIU GO admin recovery code is ${otp}. It expires in 5 minutes. Do not share it.`); }
      catch (error) { await this.invalidateOtp(request.id); throw error; }
    }
    await this.audit(admin?.id, 'ADMIN_RECOVERY_OTP_RESENT', 'AdminRecoveryRequest', request.id, ipAddress);
    return { requestId: request.id, message: 'If the configured recovery number is eligible, a verification code has been sent.' };
  }

  async verifyOtp(dto: VerifyAdminRecoveryDto, ipAddress: string) {
    const request = await this.prisma.adminRecoveryRequest.findFirst({ where: { id: dto.requestId, ipAddress } });
    const now = new Date();
    if (!request || !request.adminUserId || request.completedAt || request.verifiedAt || request.expiresAt <= now || request.lockedUntil && request.lockedUntil > now) {
      throw new UnauthorizedException('The code is invalid or expired. Request a new code.');
    }
    if (!this.safeEqual(this.otpHash(dto.otp), request.otpHash)) {
      const nextAttempts = request.attemptCount + 1;
      const failedAttempt = await this.prisma.adminRecoveryRequest.updateMany({
        where: { id: request.id, verifiedAt: null, completedAt: null, attemptCount: { lt: 5 }, expiresAt: { gt: now } },
        data: { attemptCount: { increment: 1 }, ...(nextAttempts >= 5 ? { lockedUntil: new Date(now.getTime() + 15 * 60_000) } : {}) },
      });
      if (failedAttempt.count !== 1) throw new UnauthorizedException('The code is invalid or expired.');
      await this.audit(request.adminUserId, 'ADMIN_RECOVERY_OTP_FAILED', 'AdminRecoveryRequest', request.id, ipAddress);
      throw new UnauthorizedException(nextAttempts >= 5 ? 'Too many incorrect codes. Start recovery again later.' : 'The code is invalid or expired.');
    }
    const token = randomBytes(32).toString('base64url');
    const configuredPhone = this.requireRecoveryPhone();
    const admin = await this.prisma.user.findFirst({ where: { id: request.adminUserId, phone: configuredPhone, role: { in: ADMIN_ROLES } }, select: { id: true } });
    if (!admin) throw new UnauthorizedException('The code is invalid or expired. Request a new code.');
    const claimed = await this.prisma.$transaction(async (tx: any) => {
      const result = await tx.adminRecoveryRequest.updateMany({
        where: { id: request.id, otpHash: request.otpHash, verifiedAt: null, completedAt: null, expiresAt: { gt: now }, attemptCount: { lt: 5 } },
        data: { verifiedAt: now, recoveryTokenHash: this.tokenHash(token), recoveryTokenExpiresAt: new Date(now.getTime() + RECOVERY_TOKEN_TTL_MS) },
      });
      if (result.count !== 1) return false;
      await tx.user.update({ where: { id: admin.id }, data: { phoneVerifiedAt: now } });
      await tx.auditLog.create({ data: { actorId: admin.id, action: 'ADMIN_RECOVERY_OTP_VERIFIED', entityType: 'AdminRecoveryRequest', entityId: request.id, ipAddress } });
      return true;
    });
    if (!claimed) throw new UnauthorizedException('The code is invalid or expired. Request a new code.');
    return { recoveryToken: token, expiresInSeconds: RECOVERY_TOKEN_TTL_MS / 1000 };
  }

  async reset(dto: ResetAdminCredentialsDto, ipAddress: string) {
    if (dto.username !== dto.confirmUsername) throw new ConflictException('The usernames do not match.');
    if (dto.password !== dto.confirmPassword) throw new ConflictException('The passwords do not match.');
    if (!this.isStrongPassword(dto.password)) throw new ConflictException('Use at least 12 characters with uppercase, lowercase, number, and symbol characters.');
    const normalizedPassword = dto.password.toLowerCase();
    const common = new Set(['password123!', 'admin123456!', 'welcome12345!', 'qwerty123456!', 'p@ssw0rd1234!', 'letmein12345!']);
    if (common.has(normalizedPassword) || /^(password|admin|qwerty|welcome|letmein|iloveyou|changeme|mydiu)/i.test(dto.password)) throw new ConflictException('Choose a less common password.');
    const tokenHash = this.tokenHash(dto.recoveryToken);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const now = new Date();
    let adminId: string;
    try {
      adminId = await this.prisma.$transaction(async (tx: any) => {
        const request = await tx.adminRecoveryRequest.findFirst({ where: { recoveryTokenHash: tokenHash, verifiedAt: { not: null }, recoveryTokenExpiresAt: { gt: now }, completedAt: null, adminUserId: { not: null } } });
        if (!request?.adminUserId) throw new UnauthorizedException('Recovery authorization is invalid or expired.');
        const claim = await tx.adminRecoveryRequest.updateMany({ where: { id: request.id, recoveryTokenHash: tokenHash, completedAt: null, recoveryTokenExpiresAt: { gt: now } }, data: { completedAt: now, recoveryTokenHash: null } });
        if (claim.count !== 1) throw new UnauthorizedException('Recovery authorization is invalid or expired.');
        const duplicate = await tx.user.findFirst({ where: { username: dto.username, NOT: { id: request.adminUserId } }, select: { id: true } });
        if (duplicate) throw new ConflictException('That username is already in use.');
        await tx.user.update({ where: { id: request.adminUserId }, data: { username: dto.username, passwordHash, sessionVersion: { increment: 1 } } });
        await tx.adminRecoveryRequest.updateMany({ where: { adminUserId: request.adminUserId, completedAt: null }, data: { completedAt: now, recoveryTokenHash: null } });
        await tx.auditLog.create({ data: { actorId: request.adminUserId, action: 'ADMIN_CREDENTIALS_RESET', entityType: 'User', entityId: request.adminUserId, ipAddress } });
        await tx.auditLog.create({ data: { actorId: request.adminUserId, action: 'ADMIN_USERNAME_CHANGED', entityType: 'User', entityId: request.adminUserId, ipAddress } });
        await tx.auditLog.create({ data: { actorId: request.adminUserId, action: 'ADMIN_SESSIONS_INVALIDATED', entityType: 'User', entityId: request.adminUserId, ipAddress } });
        return request.adminUserId;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error instanceof ConflictException || error instanceof UnauthorizedException) throw error;
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') throw new ConflictException('That username is already in use.');
      throw error;
    }
    let confirmationSmsSent = false;
    const phone = this.recoveryPhone();
    if (phone) {
      try { await this.sms.send(phone, 'Your DIU GO admin login details were updated. If you did not make this change, contact your system operator immediately.'); confirmationSmsSent = true; }
      catch { confirmationSmsSent = false; }
    }
    return { message: 'Admin login details updated successfully. Please sign in again using your new credentials.', confirmationSmsSent };
  }

  private recoveryPhone(): string | null {
    const value = process.env.ADMIN_RECOVERY_PHONE?.trim() ?? '';
    return /^\+91[6-9]\d{9}$/.test(value) ? value : null;
  }
  private requireRecoveryPhone() {
    const phone = this.recoveryPhone();
    if (!phone) throw new ServiceUnavailableException(process.env.NODE_ENV === 'production' ? 'Account recovery is unavailable.' : 'Set ADMIN_RECOVERY_PHONE to a valid +91 Indian mobile number.');
    return phone;
  }
  private requireSmsConfiguration() {
    if (process.env.SMS_PROVIDER?.toLowerCase() !== 'twilio' || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_PHONE) {
      if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('Account recovery is unavailable.');
      throw new ServiceUnavailableException('SMS recovery is not configured. Set SMS_PROVIDER=twilio and the Twilio credentials in the backend environment.');
    }
  }
  private async checkRecoveryRate(phoneFingerprint: string, ipAddress: string) {
    const since = new Date(Date.now() - RATE_WINDOW_MS);
    const now = new Date();
    const [byIp, byPhone, blocked] = await Promise.all([
      this.prisma.adminRecoveryRequest.count({ where: { ipAddress, createdAt: { gte: since } } }),
      this.prisma.adminRecoveryRequest.count({ where: { phoneFingerprint, createdAt: { gte: since } } }),
      this.prisma.adminRecoveryRequest.findFirst({ where: { OR: [{ ipAddress }, { phoneFingerprint }], lockedUntil: { gt: now }, completedAt: null }, select: { id: true } }),
    ]);
    if (blocked || byIp >= 5 || byPhone >= 5) throw new TooManyRequestsException('Too many recovery requests. Try again later.');
  }
  private async invalidateOtp(id: string) {
    await this.prisma.adminRecoveryRequest.update({ where: { id }, data: { expiresAt: new Date(), otpHash: this.otpHash(randomBytes(32).toString('hex')) } });
  }
  private otpHash(value: string) { return createHmac('sha256', process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || 'local-only-otp-hash-secret').update(value).digest('hex'); }
  private tokenHash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private fingerprint(value: string) { return createHmac('sha256', process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || 'local-only-otp-hash-secret').update(value).digest('hex'); }
  private safeEqual(a: string, b: string) { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
  private maskPhone(phone: string) { return `${phone.slice(0, 3)} ••••••${phone.slice(-4)}`; }
  private isStrongPassword(password: string) { return password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password); }
  private recordLoginAttempt(identifierFingerprint: string, ipAddress: string, succeeded: boolean) { return this.prisma.adminLoginAttempt.create({ data: { identifierFingerprint, ipAddress, succeeded } }); }
  private audit(actorId: string | undefined, action: string, entityType: string, entityId: string | undefined, ipAddress: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entityType, entityId, ipAddress } });
  }
}
