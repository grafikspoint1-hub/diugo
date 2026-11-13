import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { LoginDto } from './dto/login.dto';
import { ResetAdminCredentialsDto, ResendAdminRecoveryDto, VerifyAdminRecoveryDto } from './dto/admin-recovery.dto';

@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post('login') login(@Body() dto: LoginDto, @Req() req: Request) { return this.adminAuth.login(dto, req.ip || 'unknown'); }
  @Get('recovery/info') recoveryInfo() { return this.adminAuth.recoveryInfo(); }
  @Post('recovery/request-otp') requestOtp(@Req() req: Request) { return this.adminAuth.requestOtp(req.ip || 'unknown'); }
  @Post('recovery/resend-otp') resendOtp(@Body() dto: ResendAdminRecoveryDto, @Req() req: Request) { return this.adminAuth.resendOtp(dto.requestId, req.ip || 'unknown'); }
  @Post('recovery/verify-otp') verifyOtp(@Body() dto: VerifyAdminRecoveryDto, @Req() req: Request) { return this.adminAuth.verifyOtp(dto, req.ip || 'unknown'); }
  @Post('recovery/reset') reset(@Body() dto: ResetAdminCredentialsDto, @Req() req: Request) { return this.adminAuth.reset(dto, req.ip || 'unknown'); }
}
