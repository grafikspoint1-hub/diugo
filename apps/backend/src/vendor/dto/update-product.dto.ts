import { IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from 'class-validator';
import { ProductCondition, ProductStatus } from '@prisma/client';

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(140) name?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsInt() @Min(0) pricePaise?: number;
  @IsOptional() @IsInt() @Min(0) mrpPaise?: number;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsEnum(ProductCondition) condition?: ProductCondition;
  @IsOptional() @IsString() @MaxLength(191) categoryId?: string;
  @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(2048) imageUrl?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}