import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsString() name!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() @MinLength(8) password!: string;
  // Public registration is intentionally restricted to CUSTOMER.
  // Vendor/partner/admin roles must be assigned through approved onboarding.
  role?: UserRole;
}
