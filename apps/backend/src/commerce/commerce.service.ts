import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CheckoutStatus, FulfilmentType, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { VerifyCheckoutDto } from './dto/verify-checkout.dto';

const CHECKOUT_TTL_MS = 15 * 60 * 1000;
const PAYMENT_INCLUDE = { orders: { include: { business: true, items: true } }, payment: true } as const;

@Injectable()
export class CommerceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommerceService.name);
  private expiryTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.expiryTimer = setInterval(() => {
      void this.expirePendingCheckouts().catch((error: unknown) =>
        this.logger.error('Could not expire pending checkout reservations', error instanceof Error ? error.stack : undefined),
      );
    }, 60_000);
    this.expiryTimer.unref();
  }

  onModuleDestroy() {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
  }

  private razorpaySettings() {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    return keyId && keySecret ? { keyId, keySecret } : null;
  }

  private deliveryFeePaise(fulfilment: FulfilmentType, business: { name: string; supportsDelivery: boolean; vendorDeliveryFeePaise: number | null }) {
    if (!business.supportsDelivery) throw new ConflictException(`${business.name} does not offer delivery`);
    if (fulfilment === FulfilmentType.MY_DIU_DELIVERY) {
      const configured = process.env.MY_DIU_DELIVERY_FEE_PAISE;
      const fee = configured === undefined || configured.trim() === '' ? Number.NaN : Number(configured);
      if (!Number.isSafeInteger(fee) || fee < 0) {
        throw new ServiceUnavailableException('MY DIU delivery pricing is not configured. No order was created.');
      }
      return fee;
    }
    const fee = business.vendorDeliveryFeePaise;
    if (!Number.isSafeInteger(fee) || (fee as number) < 0) {
      throw new ServiceUnavailableException(`${business.name} has not configured its vendor delivery fee. No order was created.`);
    }
    return fee as number;
  }

  async quoteCart(customerId: string, fulfilment: 'MY_DIU_DELIVERY' | 'VENDOR_DELIVERY') {
    const cart = await this.prisma.cart.findUnique({ where: { userId: customerId } });
    if (!cart) throw new BadRequestException('Your cart is empty');
    const items: any[] = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
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
      orderBy: { createdAt: 'asc' },
    });
    if (!items.length) throw new BadRequestException('Your cart is empty');
    if (items.some(({ product, quantity }) => product.status !== 'ACTIVE' || product.business.status !== 'APPROVED' || product.business.subscriptions.length === 0 || product.stock - product.reservedStock < quantity)) {
      throw new ConflictException('Some cart items are unavailable or have insufficient unreserved stock. Update your cart and try again.');
    }
    const groups = new Map<string, any[]>();
    for (const item of items) groups.set(item.product.businessId, [...(groups.get(item.product.businessId) ?? []), item]);
    const vendors = Array.from(groups.entries()).map(([businessId, group]) => {
      const business = group[0].product.business;
      const subtotalPaise = group.reduce((sum: number, item: any) => sum + item.product.pricePaise * item.quantity, 0);
      const deliveryFeePaise = this.deliveryFeePaise(fulfilment, business);
      return { businessId, businessName: business.name, subtotalPaise, deliveryFeePaise, totalPaise: subtotalPaise + deliveryFeePaise,
        items: group.map((item: any) => ({ productId: item.productId, name: item.product.name, quantity: item.quantity, unitPricePaise: item.product.pricePaise, lineTotalPaise: item.product.pricePaise * item.quantity })) };
    });
    const subtotalPaise = vendors.reduce((sum, vendor) => sum + vendor.subtotalPaise, 0);
    const deliveryFeePaise = vendors.reduce((sum, vendor) => sum + vendor.deliveryFeePaise, 0);
    return { vendors, subtotalPaise, deliveryFeePaise, totalPaise: subtotalPaise + deliveryFeePaise, currency: 'INR' };
  }

  async createCheckout(customerId: string, dto: CheckoutDto) {
    const gateway = this.razorpaySettings();
    if (!gateway) {
      throw new ServiceUnavailableException('Online checkout is not configured. No order was created; contact support or try again later.');
    }
    if (dto.fulfilment !== FulfilmentType.MY_DIU_DELIVERY && dto.fulfilment !== FulfilmentType.VENDOR_DELIVERY) {
      throw new BadRequestException('Choose MY DIU delivery or vendor-managed delivery');
    }
    if (!dto.deliveryAddress) throw new BadRequestException('A complete delivery address is required');

    await this.expirePendingCheckouts();
    const pending = await this.prisma.checkoutSession.findFirst({
      where: { customerId, status: CheckoutStatus.PENDING_PAYMENT, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (pending) throw new ConflictException('You already have a pending checkout. Resume it or wait for it to expire.');

    const cart = await this.prisma.cart.upsert({ where: { userId: customerId }, create: { userId: customerId }, update: {} });
    const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);
    let checkout: any;
    try {
      checkout = await this.prisma.$transaction(async (tx: any) => {
      const cartItems: any[] = await tx.cartItem.findMany({
        where: { cartId: cart.id },
        include: { product: { include: { business: { include: { subscriptions: { where: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } }, select: { id: true } } } } } } },
        orderBy: { createdAt: 'asc' },
      });
      if (!cartItems.length) throw new BadRequestException('Your cart is empty');
      const invalid = cartItems.filter(({ product, quantity }) =>
        product.status !== 'ACTIVE' || product.business.status !== 'APPROVED' ||
        product.business.subscriptions.length === 0 || product.stock - product.reservedStock < quantity,
      );
      if (invalid.length) throw new ConflictException('Some cart items are unavailable or have insufficient unreserved stock. Update your cart and try again.');

      const groups = new Map<string, any[]>();
      for (const item of cartItems) groups.set(item.product.businessId, [...(groups.get(item.product.businessId) ?? []), item]);
      for (const group of groups.values()) {
        this.deliveryFeePaise(dto.fulfilment as FulfilmentType, group[0].product.business);
      }

      const amountPaise = Array.from(groups.values()).reduce((sum, group) => {
        const subtotal = group.reduce((groupSum: number, item: any) => groupSum + item.product.pricePaise * item.quantity, 0);
        return sum + subtotal + this.deliveryFeePaise(dto.fulfilment as FulfilmentType, group[0].product.business);
      }, 0);
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) throw new BadRequestException('Checkout amount is invalid');
      const session = await tx.checkoutSession.create({ data: {
        customerId, amountPaise, fulfilment: dto.fulfilment, deliveryAddress: dto.deliveryAddress as Prisma.InputJsonValue | undefined,
        notes: dto.notes, expiresAt,
      } });
      await tx.payment.create({ data: {
        checkoutSessionId: session.id, provider: 'RAZORPAY', amountPaise, currency: 'INR', status: PaymentStatus.CREATED,
      } });

      for (const [businessId, group] of groups.entries()) {
        const subtotalPaise = group.reduce((sum: number, item: any) => sum + item.product.pricePaise * item.quantity, 0);
        const deliveryFeePaise = this.deliveryFeePaise(dto.fulfilment as FulfilmentType, group[0].product.business);
        await tx.order.create({ data: {
          orderNumber: `MD${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString('hex').toUpperCase()}`,
          customerId, businessId, checkoutSessionId: session.id, status: OrderStatus.PENDING_PAYMENT,
          fulfilment: dto.fulfilment, subtotalPaise, deliveryFeePaise, discountPaise: 0, totalPaise: subtotalPaise + deliveryFeePaise,
          deliveryAddress: dto.deliveryAddress as Prisma.InputJsonValue, notes: dto.notes,
          items: { create: group.map((item: any) => ({
            productId: item.productId, productName: item.product.name, quantity: item.quantity,
            unitPricePaise: item.product.pricePaise, lineTotalPaise: item.product.pricePaise * item.quantity,
          })) },
        } });

        for (const item of group) {
          const reserved = await tx.product.updateMany({
            where: {
              id: item.productId, status: 'ACTIVE', stock: item.product.stock,
              reservedStock: item.product.reservedStock,
            },
            data: {
              reservedStock: { increment: item.quantity },
              ...(item.product.stock - item.product.reservedStock === item.quantity ? { status: 'OUT_OF_STOCK' } : {}),
            },
          });
          if (reserved.count !== 1) throw new ConflictException(`${item.product.name} stock changed during checkout; please try again.`);
        }
      }

      return session;
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('You already have a pending checkout. Resume it or wait for it to expire.');
      }
      throw error;
    }

    try {
      const providerOrder = await this.createRazorpayOrder(checkout.id, checkout.amountPaise, gateway);
      await this.prisma.$transaction([
        this.prisma.checkoutSession.update({ where: { id: checkout.id }, data: { providerOrderId: providerOrder.id } }),
        this.prisma.payment.update({ where: { checkoutSessionId: checkout.id }, data: { providerOrderId: providerOrder.id, status: PaymentStatus.PENDING } }),
        this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
      ]);
      return {
        checkoutSessionId: checkout.id, keyId: gateway.keyId, orderId: providerOrder.id,
        amount: checkout.amountPaise, currency: 'INR', expiresAt: checkout.expiresAt,
      };
    } catch (error) {
      await this.failCheckout(checkout.id, CheckoutStatus.FAILED, PaymentStatus.FAILED);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('The online payment order could not be created. No payment was taken; your cart is preserved.');
    }
  }

  async pendingCheckout(customerId: string) {
    await this.expirePendingCheckouts();
    const checkout = await this.prisma.checkoutSession.findFirst({
      where: { customerId, status: CheckoutStatus.PENDING_PAYMENT, expiresAt: { gt: new Date() }, providerOrderId: { not: null } },
      include: PAYMENT_INCLUDE, orderBy: { createdAt: 'desc' },
    });
    if (!checkout) return { checkout: null };
    const gateway = this.razorpaySettings();
    if (!gateway) throw new ServiceUnavailableException('Online checkout is not configured');
    return { checkoutSessionId: checkout.id, keyId: gateway.keyId, orderId: checkout.providerOrderId,
      amount: checkout.amountPaise, currency: checkout.currency, expiresAt: checkout.expiresAt, orders: checkout.orders };
  }

  async verifyCheckout(customerId: string, dto: VerifyCheckoutDto) {
    const gateway = this.razorpaySettings();
    if (!gateway) throw new ServiceUnavailableException('Online checkout is not configured');
    const checkout = await this.prisma.checkoutSession.findFirst({ where: { id: dto.checkoutSessionId, customerId }, include: { payment: true } });
    if (!checkout) throw new NotFoundException('Checkout session not found');
    if ((checkout.status === CheckoutStatus.PAID || checkout.status === CheckoutStatus.REFUND_PENDING) && checkout.providerPaymentId === dto.razorpay_payment_id) return checkout;
    if (checkout.status !== CheckoutStatus.PENDING_PAYMENT || checkout.providerOrderId !== dto.razorpay_order_id) {
      throw new ConflictException('Checkout is no longer pending for this payment order');
    }
    const expected = createHmac('sha256', gateway.keySecret).update(`${checkout.providerOrderId}|${dto.razorpay_payment_id}`).digest();
    const received = Buffer.from(dto.razorpay_signature, 'hex');
    if (received.length !== expected.length || !timingSafeEqual(expected, received)) throw new UnauthorizedException('Invalid payment signature');
    const payment = await this.fetchCapturedPayment(dto.razorpay_payment_id, gateway);
    if (payment.order_id !== checkout.providerOrderId || payment.amount !== checkout.amountPaise || payment.currency !== checkout.currency) {
      throw new ConflictException('The captured payment does not match the expected checkout amount and currency');
    }
    return this.recordCapturedPayment(checkout.id, dto.razorpay_payment_id);
  }

  async acceptWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!rawBody || !secret || !signature) throw new UnauthorizedException('Payment webhook verification is not configured');
    const expected = createHmac('sha256', secret).update(rawBody).digest();
    const received = Buffer.from(signature, 'hex');
    if (received.length !== expected.length || !timingSafeEqual(expected, received)) throw new UnauthorizedException('Invalid payment webhook signature');
    const event = JSON.parse(rawBody.toString('utf8')) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
    };
    const entity = event.payload?.payment?.entity;
    if (!entity?.order_id) return { received: true, ignored: true };
    const checkout = await this.prisma.checkoutSession.findFirst({ where: { providerOrderId: entity.order_id } });
    if (!checkout) return { received: true, ignored: true };
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      if (!entity.id) throw new BadRequestException('Payment webhook is missing its payment identifier');
      const gateway = this.razorpaySettings();
      if (!gateway) throw new ServiceUnavailableException('Online checkout is not configured');
      const payment = await this.fetchCapturedPayment(entity.id, gateway);
      if (payment.order_id !== checkout.providerOrderId || payment.amount !== checkout.amountPaise || payment.currency !== checkout.currency) {
        throw new ConflictException('Captured webhook payment does not match its checkout session');
      }
      return this.recordCapturedPayment(checkout.id, entity.id);
    }
    if (event.event === 'payment.failed') return { received: true, retryable: true };
    return { received: true, ignored: true };
  }

  async expirePendingCheckouts() {
    const expired = await this.prisma.checkoutSession.findMany({
      where: { status: CheckoutStatus.PENDING_PAYMENT, expiresAt: { lte: new Date() } }, select: { id: true }, take: 100,
    });
    for (const session of expired) await this.failCheckout(session.id, CheckoutStatus.EXPIRED, PaymentStatus.FAILED);
    return expired.length;
  }

  private async createRazorpayOrder(checkoutId: string, amountPaise: number, gateway: { keyId: string; keySecret: string }) {
    let response: Response;
    try {
      response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`${gateway.keyId}:${gateway.keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: `checkout_${checkoutId}`, notes: { checkoutSessionId: checkoutId } }),
      });
    } catch {
      throw new ServiceUnavailableException('Razorpay is unreachable');
    }
    const order = await response.json().catch(() => ({})) as { id?: string };
    if (!response.ok || !order.id) throw new ServiceUnavailableException('Razorpay did not create a payment order');
    return order as { id: string };
  }

  private async fetchCapturedPayment(paymentId: string, gateway: { keyId: string; keySecret: string }) {
    let response: Response;
    try {
      response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${gateway.keyId}:${gateway.keySecret}`).toString('base64')}` },
      });
    } catch {
      throw new ServiceUnavailableException('Could not verify payment with Razorpay');
    }
    const payment = await response.json().catch(() => ({})) as { order_id?: string; amount?: number; currency?: string; status?: string };
    if (!response.ok || payment.status !== 'captured') throw new ConflictException('Razorpay has not confirmed a captured payment');
    return payment;
  }

  private async recordCapturedPayment(checkoutId: string, providerPaymentId: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const checkout = await tx.checkoutSession.findUnique({ where: { id: checkoutId }, include: { orders: { include: { items: true, business: true } }, payment: true } });
      if (!checkout) throw new NotFoundException('Checkout session not found');
      if ((checkout.status === CheckoutStatus.PAID || checkout.status === CheckoutStatus.REFUND_PENDING) && checkout.providerPaymentId === providerPaymentId) return checkout;
      if (checkout.status !== CheckoutStatus.PENDING_PAYMENT && checkout.status !== CheckoutStatus.EXPIRED) {
        throw new ConflictException('Checkout session cannot accept another payment');
      }
      await tx.payment.update({ where: { checkoutSessionId: checkoutId }, data: {
        providerPaymentId, status: PaymentStatus.SUCCESS, verifiedAt: new Date(),
      } });

      if (checkout.status === CheckoutStatus.EXPIRED || checkout.expiresAt <= new Date()) {
        await tx.checkoutSession.update({ where: { id: checkoutId }, data: { status: CheckoutStatus.REFUND_PENDING, providerPaymentId } });
        await tx.order.updateMany({ where: { checkoutSessionId: checkoutId }, data: { status: OrderStatus.REFUND_PENDING } });
        return tx.checkoutSession.findUnique({ where: { id: checkoutId }, include: PAYMENT_INCLUDE });
      }

      const updated = await tx.checkoutSession.updateMany({ where: { id: checkoutId, status: CheckoutStatus.PENDING_PAYMENT }, data: {
        status: CheckoutStatus.PAID, providerPaymentId,
      } });
      if (updated.count !== 1) {
        const latest = await tx.checkoutSession.findUnique({ where: { id: checkoutId }, include: PAYMENT_INCLUDE });
        if ((latest?.status === CheckoutStatus.PAID || latest?.status === CheckoutStatus.REFUND_PENDING) && latest.providerPaymentId === providerPaymentId) return latest;
        throw new ConflictException('Checkout session changed while payment was being verified');
      }
      for (const order of checkout.orders) {
        for (const item of order.items) {
          const consumed = await tx.product.updateMany({
            where: { id: item.productId, reservedStock: { gte: item.quantity }, stock: { gte: item.quantity } },
            data: { reservedStock: { decrement: item.quantity }, stock: { decrement: item.quantity } },
          });
          if (consumed.count !== 1) throw new ConflictException('Reserved stock could not be committed; order needs operator review');
        }
      }
      await tx.order.updateMany({ where: { checkoutSessionId: checkoutId }, data: { status: OrderStatus.PAID } });
      if (!checkout.deliveryAddress) throw new ConflictException('Paid checkout is missing its delivery address; order requires operator review');
      for (const order of checkout.orders) {
        if (order.fulfilment !== FulfilmentType.MY_DIU_DELIVERY) continue;
        await tx.delivery.create({ data: {
          orderId: order.id,
          deliveryFeePaise: order.deliveryFeePaise,
          pickupAddress: { businessId: order.businessId, businessName: order.business.name, address: order.business.address ?? '' } as Prisma.InputJsonValue,
          dropAddress: checkout.deliveryAddress as Prisma.InputJsonValue,
        } });
      }
      await tx.auditLog.create({ data: { actorId: checkout.customerId, action: 'CUSTOMER_CHECKOUT_PAID', entityType: 'CheckoutSession', entityId: checkoutId, metadata: { amountPaise: checkout.amountPaise, currency: checkout.currency } } });
      return tx.checkoutSession.findUnique({ where: { id: checkoutId }, include: PAYMENT_INCLUDE });
    });
  }

  private async failCheckout(checkoutId: string, status: 'FAILED' | 'EXPIRED', paymentStatus: 'FAILED') {
    return this.prisma.$transaction(async (tx: any) => {
      const changed = await tx.checkoutSession.updateMany({ where: { id: checkoutId, status: CheckoutStatus.PENDING_PAYMENT }, data: { status } });
      if (changed.count !== 1) return tx.checkoutSession.findUnique({ where: { id: checkoutId }, include: PAYMENT_INCLUDE });
      const orders = await tx.order.findMany({ where: { checkoutSessionId: checkoutId }, include: { items: true } });
      for (const order of orders) {
        for (const item of order.items) {
          await tx.product.updateMany({
            where: { id: item.productId, reservedStock: { gte: item.quantity } },
            data: { reservedStock: { decrement: item.quantity } },
          });
          const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stock: true, reservedStock: true, status: true } });
          if (product?.status === 'OUT_OF_STOCK' && product.stock > product.reservedStock) {
            await tx.product.updateMany({ where: { id: item.productId, status: 'OUT_OF_STOCK' }, data: { status: 'ACTIVE' } });
          }
        }
      }
      await tx.order.updateMany({ where: { checkoutSessionId: checkoutId }, data: { status: OrderStatus.CANCELLED } });
      await tx.payment.updateMany({ where: { checkoutSessionId: checkoutId, status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING] } }, data: { status: paymentStatus } });
      return tx.checkoutSession.findUnique({ where: { id: checkoutId }, include: PAYMENT_INCLUDE });
    });
  }
}
