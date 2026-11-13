import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) throw new ConflictException('Email or phone is required');
    const existing = await this.prisma.user.findFirst({
      where: { OR: [dto.email ? { email: dto.email } : undefined, dto.phone ? { phone: dto.phone } : undefined].filter(Boolean) as any },
    });
    if (existing) throw new ConflictException('An account with these details already exists');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, phone: dto.phone, passwordHash, role: UserRole.CUSTOMER },
      select: { id: true, name: true, email: true, phone: true, role: true, status: true },
    });
    return { user, accessToken: await this.token(user.id, user.role, 0) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.identifier }, { email: dto.identifier }, { phone: dto.identifier }] },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid login credentials');
    }
    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      throw new UnauthorizedException('This account is not active');
    }
    const safeUser = { id: user.id, name: user.name, username: user.username, email: user.email, phone: user.phone, role: user.role, status: user.status };
    return { user: safeUser, accessToken: await this.token(user.id, user.role, user.sessionVersion) };
  }

  private token(sub: string, role: UserRole, sessionVersion: number) {
    return this.jwt.signAsync({ sub, role, sessionVersion });
  }
}
