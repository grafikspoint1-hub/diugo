import { IsInt, IsString, Min, Max } from 'class-validator';
export class CartItemDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) @Max(50) quantity!: number;
}
export class UpdateCartItemDto {
  @IsInt() @Min(1) @Max(50) quantity!: number;
}
