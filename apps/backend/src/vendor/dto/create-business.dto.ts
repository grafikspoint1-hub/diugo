import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
export class CreateBusinessDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @MinLength(2) @MaxLength(80) categoryId!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() locality?: string;
  @IsOptional() @IsBoolean() supportsPickup?: boolean;
  @IsOptional() @IsBoolean() supportsDelivery?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(10000000) vendorDeliveryFeePaise?: number;
}
