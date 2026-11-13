import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'LOCAL_ONLY_CHANGE_THIS_SECRET',
    });
  }
  async validate(payload: { sub: string; role: string; sessionVersion?: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, username: true, email: true, phone: true, role: true, status: true, sessionVersion: true },
    });
    if (!user || user.status === 'SUSPENDED' || user.status === 'REJECTED' || (payload.sessionVersion ?? 0) !== user.sessionVersion) {
      throw new UnauthorizedException();
    }
    const { sessionVersion: _sessionVersion, ...safeUser } = user;
    return safeUser;
  }
}
