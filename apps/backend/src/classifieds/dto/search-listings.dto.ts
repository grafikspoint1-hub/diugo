import { ProductCondition } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class SearchListingsDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsString() @MaxLength(100) locality?: string;
  @IsOptional() @IsEnum(ProductCondition) condition?: ProductCondition;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100_000_000_000) minPricePaise?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100_000_000_000) maxPricePaise?: number;
}
