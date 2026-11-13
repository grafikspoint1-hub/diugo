const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException, UnauthorizedException } = require('@nestjs/common');
const { CommerceService } = require('../dist/src/commerce/commerce.service.js');

const untouchedDatabase = new Proxy({}, {
  get() {
    throw new Error('Database must not be accessed by a failed payment-safety precondition');
  },
});

test('checkout does not create a session when Razorpay credentials are missing', async () => {
  const previousKeyId = process.env.RAZORPAY_KEY_ID;
  const previousKeySecret = process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  try {
    const service = new CommerceService(untouchedDatabase);
    await assert.rejects(
      service.createCheckout('customer-1', { fulfilment: 'PICKUP' }),
      (error) => error instanceof ServiceUnavailableException,
    );
  } finally {
    if (previousKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = previousKeyId;
    if (previousKeySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = previousKeySecret;
  }
});

test('payment webhook rejects an invalid signature before database access', async () => {
  const previousWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test-only-webhook-secret';
  try {
    const service = new CommerceService(untouchedDatabase);
    await assert.rejects(
      service.acceptWebhook(Buffer.from('{"event":"payment.captured"}'), '00'.repeat(32)),
      (error) => error instanceof UnauthorizedException,
    );
  } finally {
    if (previousWebhookSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previousWebhookSecret;
  }
});

test('delivery quote totals use the vendor fee stored on that vendor business', async () => {
  const prisma = {
    cart: { findUnique: async () => ({ id: 'cart-1' }) },
    cartItem: { findMany: async () => [{
      productId: 'product-1', quantity: 2,
      product: {
        id: 'product-1', name: 'Island basket', businessId: 'business-1', pricePaise: 1234, stock: 10, reservedStock: 0, status: 'ACTIVE',
        business: { id: 'business-1', name: 'Local shop', status: 'APPROVED', supportsDelivery: true, vendorDeliveryFeePaise: 500, subscriptions: [{ id: 'subscription-1' }] },
      },
    }] },
  };
  const service = new CommerceService(prisma);
  const quote = await service.quoteCart('customer-1', 'VENDOR_DELIVERY');
  assert.equal(quote.subtotalPaise, 2468);
  assert.equal(quote.deliveryFeePaise, 500);
  assert.equal(quote.totalPaise, 2968);
});

test('MY DIU delivery quote fails closed when its fee is not configured', async () => {
  const previousFee = process.env.MY_DIU_DELIVERY_FEE_PAISE;
  delete process.env.MY_DIU_DELIVERY_FEE_PAISE;
  const prisma = {
    cart: { findUnique: async () => ({ id: 'cart-1' }) },
    cartItem: { findMany: async () => [{
      productId: 'product-1', quantity: 1,
      product: {
        id: 'product-1', name: 'Island basket', businessId: 'business-1', pricePaise: 1234, stock: 10, reservedStock: 0, status: 'ACTIVE',
        business: { id: 'business-1', name: 'Local shop', status: 'APPROVED', supportsDelivery: true, vendorDeliveryFeePaise: null, subscriptions: [{ id: 'subscription-1' }] },
      },
    }] },
  };
  try {
    const service = new CommerceService(prisma);
    await assert.rejects(
      service.quoteCart('customer-1', 'MY_DIU_DELIVERY'),
      (error) => error instanceof ServiceUnavailableException,
    );
  } finally {
    if (previousFee === undefined) delete process.env.MY_DIU_DELIVERY_FEE_PAISE;
    else process.env.MY_DIU_DELIVERY_FEE_PAISE = previousFee;
  }
});
