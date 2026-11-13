const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ConflictException, UnauthorizedException, ServiceUnavailableException } = require('@nestjs/common');
const bcrypt = require('bcryptjs');
const { createHmac, createHash } = require('node:crypto');
const { AdminAuthService } = require('../dist/src/auth/admin-auth.service.js');

function basePrisma(overrides = {}) {
  return {
    adminLoginAttempt: { count: async () => 0, create: async () => ({}) },
    adminRecoveryRequest: { findFirst: async () => null, count: async () => 0 },
    user: { findFirst: async () => null },
    auditLog: { create: async () => ({}) },
    ...overrides,
  };
}

test('admin login accepts only a matching active admin and returns a session-versioned JWT', async () => {
  const passwordHash = await bcrypt.hash('StrongPassword123!', 4);
  const user = { id: 'admin-1', name: 'Operator', username: 'island.admin', email: null, phone: null, role: 'SUPER_ADMIN', status: 'ACTIVE', sessionVersion: 3, passwordHash };
  const prisma = basePrisma({ user: { findFirst: async ({ where }) => {
    assert.ok(where.role.in.includes('ADMIN'));
    return user;
  } } });
  let claims;
  const service = new AdminAuthService(prisma, { signAsync: async value => { claims = value; return 'signed-token'; } }, {});
  const result = await service.login({ identifier: 'island.admin', password: 'StrongPassword123!' }, '127.0.0.1');
  assert.equal(result.accessToken, 'signed-token');
  assert.equal(result.user.username, 'island.admin');
  assert.equal(claims.sessionVersion, 3);
  assert.equal('passwordHash' in result.user, false);
});

test('admin login rejects an unknown identifier without minting a token', async () => {
  const prisma = basePrisma();
  let signed = false;
  const service = new AdminAuthService(prisma, { signAsync: async () => { signed = true; return 'token'; } }, {});
  await assert.rejects(service.login({ identifier: 'unknown.admin', password: 'SomePassword123!' }, '127.0.0.1'), UnauthorizedException);
  assert.equal(signed, false);
});

test('recovery request fails closed when the SMS provider is not configured', async () => {
  const old = { phone: process.env.ADMIN_RECOVERY_PHONE, provider: process.env.SMS_PROVIDER, sid: process.env.TWILIO_ACCOUNT_SID, token: process.env.TWILIO_AUTH_TOKEN, from: process.env.TWILIO_FROM_PHONE };
  process.env.ADMIN_RECOVERY_PHONE = '+918866383477';
  delete process.env.SMS_PROVIDER; delete process.env.TWILIO_ACCOUNT_SID; delete process.env.TWILIO_AUTH_TOKEN; delete process.env.TWILIO_FROM_PHONE;
  const service = new AdminAuthService(basePrisma(), {}, {});
  try { await assert.rejects(service.requestOtp('127.0.0.1'), ServiceUnavailableException); }
  finally {
    for (const [key, value] of [['ADMIN_RECOVERY_PHONE', old.phone], ['SMS_PROVIDER', old.provider], ['TWILIO_ACCOUNT_SID', old.sid], ['TWILIO_AUTH_TOKEN', old.token], ['TWILIO_FROM_PHONE', old.from]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('credential reset rejects a weak password before database access', async () => {
  const prisma = new Proxy({}, { get() { throw new Error('Database should not be used'); } });
  const service = new AdminAuthService(prisma, {}, {});
  await assert.rejects(service.reset({ recoveryToken: 'x'.repeat(32), username: 'admin.user', confirmUsername: 'admin.user', password: 'Abcdefghijkl1', confirmPassword: 'Abcdefghijkl1' }, '127.0.0.1'), ConflictException);
});

test('wrong OTP attempts are persisted and audited without returning code data', async () => {
  const old = process.env.OTP_HASH_SECRET; process.env.OTP_HASH_SECRET = 'test-only-long-random-hmac-secret';
  const hash = createHmac('sha256', process.env.OTP_HASH_SECRET).update('123456').digest('hex');
  let attemptUpdate; let audited = false;
  const request = { id: 'request-1', adminUserId: 'admin-1', ipAddress: '127.0.0.1', otpHash: hash, attemptCount: 0, expiresAt: new Date(Date.now() + 60_000), verifiedAt: null, completedAt: null, lockedUntil: null };
  const prisma = basePrisma({
    adminRecoveryRequest: { findFirst: async () => request, updateMany: async input => { attemptUpdate = input; return { count: 1 }; } },
    auditLog: { create: async () => { audited = true; return {}; } },
  });
  const service = new AdminAuthService(prisma, {}, {});
  try {
    await assert.rejects(service.verifyOtp({ requestId: 'request-1', otp: '654321' }, '127.0.0.1'), UnauthorizedException);
    assert.equal(attemptUpdate.data.attemptCount.increment, 1);
    assert.equal(audited, true);
  } finally { if (old === undefined) delete process.env.OTP_HASH_SECRET; else process.env.OTP_HASH_SECRET = old; }
});

test('correct OTP returns a recovery-only token and stores only its digest', async () => {
  const old = process.env.OTP_HASH_SECRET; process.env.OTP_HASH_SECRET = 'test-only-long-random-hmac-secret';
  const otpHash = createHmac('sha256', process.env.OTP_HASH_SECRET).update('123456').digest('hex');
  let recoveryTokenHash; let verified = false;
  const request = { id: 'request-2', adminUserId: 'admin-1', ipAddress: '127.0.0.1', otpHash, attemptCount: 0, expiresAt: new Date(Date.now() + 60_000), verifiedAt: null, completedAt: null, lockedUntil: null };
  const tx = {
    adminRecoveryRequest: { updateMany: async ({ data }) => { recoveryTokenHash = data.recoveryTokenHash; verified = true; return { count: 1 }; } },
    user: { update: async () => ({}) }, auditLog: { create: async () => ({}) },
  };
  const prisma = basePrisma({ adminRecoveryRequest: { findFirst: async () => request }, user: { findFirst: async () => ({ id: 'admin-1' }) }, $transaction: async callback => callback(tx) });
  const service = new AdminAuthService(prisma, {}, {});
  try {
    const result = await service.verifyOtp({ requestId: 'request-2', otp: '123456' }, '127.0.0.1');
    assert.equal(verified, true);
    assert.equal(result.recoveryToken.length, 43);
    assert.equal(recoveryTokenHash, createHash('sha256').update(result.recoveryToken).digest('hex'));
    assert.notEqual(recoveryTokenHash, result.recoveryToken);
  } finally { if (old === undefined) delete process.env.OTP_HASH_SECRET; else process.env.OTP_HASH_SECRET = old; }
});

test('successful credential reset changes username, bcrypt hash, and session version transactionally', async () => {
  const oldPhone = process.env.ADMIN_RECOVERY_PHONE; process.env.ADMIN_RECOVERY_PHONE = '+918866383477';
  const token = 't'.repeat(43);
  let changedUser; const actions = []; let sentSms = false;
  const request = { id: 'request-3', adminUserId: 'admin-1' };
  const tx = {
    adminRecoveryRequest: { findFirst: async () => request, updateMany: async () => ({ count: 1 }) },
    user: { findFirst: async () => null, update: async ({ data }) => { changedUser = data; return {}; } },
    auditLog: { create: async ({ data }) => { actions.push(data.action); return {}; } },
  };
  const prisma = basePrisma({ $transaction: async callback => callback(tx) });
  const service = new AdminAuthService(prisma, {}, { send: async () => { sentSms = true; } });
  try {
    const result = await service.reset({ recoveryToken: token, username: 'new.admin', confirmUsername: 'new.admin', password: 'DifferentStrong123!', confirmPassword: 'DifferentStrong123!' }, '127.0.0.1');
    assert.equal(changedUser.username, 'new.admin');
    assert.equal(changedUser.sessionVersion.increment, 1);
    assert.equal(await bcrypt.compare('DifferentStrong123!', changedUser.passwordHash), true);
    assert.deepEqual(actions, ['ADMIN_CREDENTIALS_RESET', 'ADMIN_USERNAME_CHANGED', 'ADMIN_SESSIONS_INVALIDATED']);
    assert.equal(sentSms, true);
    assert.equal(result.confirmationSmsSent, true);
  } finally { if (oldPhone === undefined) delete process.env.ADMIN_RECOVERY_PHONE; else process.env.ADMIN_RECOVERY_PHONE = oldPhone; }
});
