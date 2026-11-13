import { ProductCondition } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateListingDto {
  @IsString() @MinLength(4) @MaxLength(120) title!: string;
  @IsString() @MinLength(20) @MaxLength(5000) description!: string;
  @IsInt() @Min(0) @Max(100_000_000_000) pricePaise!: number;
  @IsEnum(ProductCondition) condition!: ProductCondition;
  @IsString() categoryId!: string;
  @IsString() @MinLength(2) @MaxLength(100) locality!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true }) photoUrls!: string[];
}
