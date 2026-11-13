import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class VerifyAdminRecoveryDto {
  @IsString() @MinLength(8) @MaxLength(40) requestId!: string;
  @IsString() @Matches(/^\d{6}$/) otp!: string;
}

export class ResendAdminRecoveryDto {
  @IsString() @MinLength(8) @MaxLength(40) requestId!: string;
}

export class ResetAdminCredentialsDto {
  @IsString() @MinLength(20) @MaxLength(200) recoveryToken!: string;
  @IsString() @Matches(/^[A-Za-z0-9._-]{3,32}$/) username!: string;
  @IsString() @Matches(/^[A-Za-z0-9._-]{3,32}$/) confirmUsername!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
  @IsString() @MinLength(12) @MaxLength(128) confirmPassword!: string;
}
