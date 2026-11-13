-- Online checkout sessions, inventory reservations, and vendor delivery fees.
CREATE TYPE "CheckoutStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'FAILED', 'EXPIRED', 'REFUND_PENDING');

ALTER TABLE "Product" ADD COLUMN "reservedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Business" ADD COLUMN "vendorDeliveryFeePaise" INTEGER;
ALTER TABLE "Order" ADD COLUMN "checkoutSessionId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "checkoutSessionId" TEXT;

CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "fulfilment" "FulfilmentType" NOT NULL,
    "deliveryAddress" JSONB,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckoutSession_providerOrderId_key" ON "CheckoutSession"("providerOrderId");
CREATE UNIQUE INDEX "CheckoutSession_providerPaymentId_key" ON "CheckoutSession"("providerPaymentId");
CREATE UNIQUE INDEX "CheckoutSession_one_pending_per_customer" ON "CheckoutSession"("customerId") WHERE "status" = 'PENDING_PAYMENT';
CREATE INDEX "CheckoutSession_customerId_status_createdAt_idx" ON "CheckoutSession"("customerId", "status", "createdAt");
CREATE INDEX "CheckoutSession_status_expiresAt_idx" ON "CheckoutSession"("status", "expiresAt");
CREATE UNIQUE INDEX "Payment_checkoutSessionId_key" ON "Payment"("checkoutSessionId");
CREATE INDEX "Product_status_stock_reservedStock_idx" ON "Product"("status", "stock", "reservedStock");

ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
