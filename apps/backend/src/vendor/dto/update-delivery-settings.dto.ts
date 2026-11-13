import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateDeliverySettingsDto {
  @IsOptional() @IsBoolean() supportsDelivery?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(10000000) vendorDeliveryFeePaise?: number;
}
