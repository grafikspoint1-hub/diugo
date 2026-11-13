import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { VerifySellerSubscriptionDto } from './dto/verify-seller-subscription.dto';

@Injectable()
export class SellerSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  private planSettings() {
    const amountPaise = Number(process.env.SELLER_SUBSCRIPTION_PRICE_PAISE || 0);
    const periodDays = Number(process.env.SELLER_SUBSCRIPTION_PERIOD_DAYS || 30);
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const priceConfigured = Number.isSafeInteger(amountPaise) && amountPaise > 0;
    return {
      amountPaise: priceConfigured ? amountPaise : null,
      periodDays: Number.isSafeInteger(periodDays) && periodDays > 0 ? periodDays : 30,
      currency: 'INR',
      priceConfigured,
      checkoutAvailable: priceConfigured && Boolean(keyId && keySecret),
      keyId,
      keySecret,
    };
  }

  private async getApprovedBusiness(ownerId: string) {
    const business = await this.prisma.business.findFirst({ where: { ownerId, status: 'APPROVED' } });
    if (!business) throw new ConflictException('Your business must be approved before subscribing');
    return business;
  }

  async hasActiveSubscription(businessId: string) {
    const now = new Date();
    return Boolean(await this.prisma.sellerSubscription.findFirst({
      where: { businessId, status: 'ACTIVE', currentPeriodEnd: { gt: now } },
      select: { id: true },
    }));
  }

  async status(ownerId: string) {
    const plan = this.planSettings();
    const business = await this.prisma.business.findFirst({ where: { ownerId }, select: { id: true, status: true } });
    if (!business) return { businessStatus: null, subscription: null, plan: { ...plan, keyId: undefined, keySecret: undefined } };

    const now = new Date();
    await this.prisma.sellerSubscription.updateMany({
      where: { businessId: business.id, status: 'ACTIVE', currentPeriodEnd: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    const subscription = await this.prisma.sellerSubscription.findFirst({
      where: { businessId: business.id, status: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, amountPaise: true, currency: true, periodDays: true, currentPeriodStart: true, currentPeriodEnd: true },
    });
    const { keyId: _keyId, keySecret: _keySecret, ...publicPlan } = plan;
    return { businessStatus: business.status, subscription, plan: publicPlan };
  }

  async createCheckout(ownerId: string) {
    const business = await this.getApprovedBusiness(ownerId);
    const plan = this.planSettings();
    if (!plan.checkoutAvailable || !plan.amountPaise) {
      throw new ServiceUnavailableException('Seller subscription checkout is not configured. Set the subscription price and Razorpay credentials.');
    }

    const now = new Date();
    await this.prisma.sellerSubscription.updateMany({
      where: { businessId: business.id, status: 'ACTIVE', currentPeriodEnd: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    if (await this.hasActiveSubscription(business.id)) throw new ConflictException('Your seller subscription is already active');
    if (await this.prisma.sellerSubscription.findFirst({ where: { businessId: business.id, status: 'PENDING_PAYMENT' } })) {
      throw new ConflictException('A seller subscription payment is already pending');
    }

    const subscription = await this.prisma.sellerSubscription.create({ data: {
      businessId: business.id,
      amountPaise: plan.amountPaise,
      currency: plan.currency,
      periodDays: plan.periodDays,
    } });
    const authorization = `Basic ${Buffer.from(`${plan.keyId}:${plan.keySecret}`).toString('base64')}`;

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: plan.amountPaise,
          currency: plan.currency,
          receipt: `seller_${subscription.id}`,
          notes: { businessId: business.id, subscriptionId: subscription.id },
        }),
      });
      const order = await response.json() as { id?: string };
      if (!response.ok || !order.id) throw new Error('Razorpay order creation failed');
      await this.prisma.sellerSubscription.update({ where: { id: subscription.id }, data: { providerOrderId: order.id } });
      return { subscriptionId: subscription.id, keyId: plan.keyId, orderId: order.id, amount: plan.amountPaise, currency: plan.currency };
    } catch {
      await this.prisma.sellerSubscription.update({ where: { id: subscription.id }, data: { status: 'FAILED' } });
      throw new ServiceUnavailableException('Could not create the subscription payment order');
    }
  }

  async verifyCheckout(ownerId: string, dto: VerifySellerSubscriptionDto) {
    const business = await this.getApprovedBusiness(ownerId);
    const plan = this.planSettings();
    if (!plan.keyId || !plan.keySecret) throw new ServiceUnavailableException('Seller subscription payments are not configured');
    const subscription = await this.prisma.sellerSubscription.findFirst({
      where: { id: dto.subscriptionId, businessId: business.id },
    });
    if (!subscription) throw new NotFoundException('Subscription checkout not found');
    if (subscription.status === 'ACTIVE' && subscription.providerPaymentId === dto.razorpay_payment_id) return subscription;
    if (subscription.status !== 'PENDING_PAYMENT' || !subscription.providerOrderId || subscription.providerOrderId !== dto.razorpay_order_id) {
      throw new ConflictException('Subscription checkout is not pending for this payment order');
    }

    const expected = createHmac('sha256', plan.keySecret)
      .update(`${subscription.providerOrderId}|${dto.razorpay_payment_id}`)
      .digest();
    const received = Buffer.from(dto.razorpay_signature, 'hex');
    if (received.length !== expected.length || !timingSafeEqual(expected, received)) {
      throw new UnauthorizedException('Invalid payment signature');
    }

    const authorization = `Basic ${Buffer.from(`${plan.keyId}:${plan.keySecret}`).toString('base64')}`;
    let payment: { order_id?: string; amount?: number; currency?: string; status?: string };
    try {
      const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(dto.razorpay_payment_id)}`, {
        headers: { Authorization: authorization },
      });
      payment = await response.json() as typeof payment;
      if (!response.ok) throw new Error('Razorpay payment lookup failed');
    } catch {
      throw new ServiceUnavailableException('Could not verify the payment with Razorpay');
    }
    if (payment.order_id !== subscription.providerOrderId || payment.amount !== subscription.amountPaise || payment.currency !== subscription.currency || payment.status !== 'captured') {
      throw new ConflictException('The payment is not captured for the expected subscription amount');
    }

    const start = new Date();
    const end = new Date(start.getTime() + subscription.periodDays * 24 * 60 * 60 * 1000);
    return this.prisma.$transaction(async (tx: any) => {
      const active = await tx.sellerSubscription.findFirst({
        where: { businessId: business.id, status: 'ACTIVE', currentPeriodEnd: { gt: start } },
        select: { id: true },
      });
      if (active) throw new ConflictException('A seller subscription has already been activated');
      const updated = await tx.sellerSubscription.update({ where: { id: subscription.id }, data: {
        status: 'ACTIVE', providerPaymentId: dto.razorpay_payment_id, currentPeriodStart: start, currentPeriodEnd: end,
      } });
      await tx.payment.create({ data: {
        sellerSubscriptionId: updated.id,
        provider: 'RAZORPAY',
        providerOrderId: subscription.providerOrderId,
        providerPaymentId: dto.razorpay_payment_id,
        amountPaise: subscription.amountPaise,
        currency: subscription.currency,
        status: 'SUCCESS',
        verifiedAt: start,
      } });
      await tx.auditLog.create({ data: { actorId: ownerId, action: 'SELLER_SUBSCRIPTION_ACTIVATED', entityType: 'SellerSubscription', entityId: updated.id, metadata: { businessId: business.id, amountPaise: updated.amountPaise } } });
      return updated;
    });
  }
}