import { BadRequestException, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { CartItemDto, UpdateCartItemDto } from './dto/cart-item.dto';
import { CheckoutDto, CheckoutQuoteDto } from './dto/checkout.dto';
import { VerifyCheckoutDto } from './dto/verify-checkout.dto';
import { CommerceService } from './commerce.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class CommerceController {
  constructor(private prisma: PrismaService, private commerce: CommerceService) {}

  private async getOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });
  }

  @Get('cart')
  async getCart(@Req() req: any) {
    const cart = await this.getOrCreateCart(req.user.id);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                status: true,
                subscriptions: {
                  where: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' }
    });
      const valid = items.filter((i: any) => i.product.status === 'ACTIVE' && i.product.business.status === 'APPROVED' && i.product.business.subscriptions.some((subscription: any) => subscription.currentPeriodEnd > new Date()) && i.product.stock - i.product.reservedStock >= i.quantity);
      const subtotalPaise = valid.reduce((sum: number, i: any) => sum + i.product.pricePaise * i.quantity, 0);
    return { id: cart.id, items, subtotalPaise, currency: 'INR' };
  }

  @Post('cart/items')
  async addCartItem(@Req() req: any, @Body() dto: CartItemDto) {
    const product = await this.prisma.product.findFirst({ where: {
      id: dto.productId, status: 'ACTIVE', business: { status: 'APPROVED', subscriptions: { some: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } } } }
    }});
    if (!product) throw new NotFoundException('Active product not found');
    if (product.stock - product.reservedStock < dto.quantity) throw new ConflictException('Requested quantity is not currently available');
    const cart = await this.getOrCreateCart(req.user.id);
    const existing = await this.prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId: product.id } } });
    const quantity = (existing?.quantity || 0) + dto.quantity;
    if (quantity > product.stock - product.reservedStock) throw new ConflictException('Cart quantity exceeds available stock');
    return this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      create: { cartId: cart.id, productId: product.id, quantity },
      update: { quantity },
      include: { product: true }
    });
  }

  @Patch('cart/items/:id')
  async updateCartItem(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(req.user.id);
    const item = await this.prisma.cartItem.findFirst({
      where: { id, cartId: cart.id },
      include: {
        product: {
          include: {
            business: {
              include: {
                subscriptions: {
                  where: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    if (item.product.status !== 'ACTIVE' || item.product.business.status !== 'APPROVED' || item.product.business.subscriptions.length === 0) {
      throw new ConflictException('This seller is not currently subscribed or the product is unavailable');
    }
    if (dto.quantity > item.product.stock - item.product.reservedStock) throw new ConflictException('Requested quantity exceeds available stock');
    return this.prisma.cartItem.update({ where: { id }, data: { quantity: dto.quantity }, include: { product: true } });
  }

  @Delete('cart/items/:id')
  async removeCartItem(@Req() req: any, @Param('id') id: string) {
    const cart = await this.getOrCreateCart(req.user.id);
    const item = await this.prisma.cartItem.findFirst({ where: { id, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id } });
    return { success: true };
  }

  @Post('checkout/quote')
  async quote(@Req() req: any, @Body() dto: CheckoutQuoteDto) {
    return this.commerce.quoteCart(req.user.id, dto.fulfilment);
  }

  @Post('checkout/create')
  async createCheckout(@Req() req: any, @Body() dto: CheckoutDto) {
    return this.commerce.createCheckout(req.user.id, dto);
  }

  @Get('checkout/pending')
  pendingCheckout(@Req() req: any) {
    return this.commerce.pendingCheckout(req.user.id);
  }

  @Post('checkout/verify')
  verifyCheckout(@Req() req: any, @Body() dto: VerifyCheckoutDto) {
    return this.commerce.verifyCheckout(req.user.id, dto);
  }

  @Get('orders')
  orders(@Req() req: any) {
    return this.prisma.order.findMany({ where: { customerId: req.user.id }, include: { business: true, items: true, checkoutSession: { include: { payment: true } }, delivery: true }, orderBy: { createdAt: 'desc' } });
  }

  @Get('orders/:id')
  async order(@Req() req: any, @Param('id') id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, customerId: req.user.id }, include: { business: true, items: true, checkoutSession: { include: { payment: true } }, delivery: true } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
