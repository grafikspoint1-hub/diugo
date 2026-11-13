import { ProductCondition } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateListingDto {
  @IsOptional() @IsString() @MinLength(4) @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MinLength(20) @MaxLength(5000) description?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000_000) pricePaise?: number;
  @IsOptional() @IsEnum(ProductCondition) condition?: ProductCondition;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) locality?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true }) photoUrls?: string[];
}
