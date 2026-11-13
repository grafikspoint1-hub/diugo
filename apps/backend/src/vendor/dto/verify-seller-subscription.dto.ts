import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifySellerSubscriptionDto {
  @IsString() @MinLength(1) @MaxLength(40) subscriptionId!: string;
  @IsString() @MinLength(1) @MaxLength(80) razorpay_order_id!: string;
  @IsString() @MinLength(1) @MaxLength(80) razorpay_payment_id!: string;
  @IsString() @MinLength(64) @MaxLength(64) razorpay_signature!: string;
}