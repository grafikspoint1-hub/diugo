import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class CheckoutAddressDto {
  @IsString() @MinLength(4) @MaxLength(250) line1!: string;
  @IsOptional() @IsString() @MaxLength(250) line2?: string;
  @IsString() @MinLength(2) @MaxLength(100) locality!: string;
  @IsString() @MinLength(2) @MaxLength(80) city!: string;
  @IsString() @MinLength(2) @MaxLength(100) state!: string;
  @Matches(/^\d{6}$/) postalCode!: string;
  @IsString() @MinLength(2) @MaxLength(80) contactName!: string;
  @Matches(/^[6-9]\d{9}$/) phone!: string;
}

export class CheckoutQuoteDto {
  @IsIn(['MY_DIU_DELIVERY','VENDOR_DELIVERY']) fulfilment!: 'MY_DIU_DELIVERY'|'VENDOR_DELIVERY';
}

export class CheckoutDto extends CheckoutQuoteDto {
  @ValidateNested() @Type(() => CheckoutAddressDto) deliveryAddress!: CheckoutAddressDto;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
