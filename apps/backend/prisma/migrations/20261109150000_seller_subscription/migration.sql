CREATE TYPE "SellerSubscriptionStatus" AS ENUM (
  'PENDING_PAYMENT',
  'ACTIVE',
  'FAILED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TABLE "SellerSubscription" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "status" "SellerSubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "amountPaise" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "periodDays" INTEGER NOT NULL,
  "providerOrderId" TEXT,
  "providerPaymentId" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellerSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SellerSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SellerSubscription_providerOrderId_key" ON "SellerSubscription"("providerOrderId");
CREATE UNIQUE INDEX "SellerSubscription_providerPaymentId_key" ON "SellerSubscription"("providerPaymentId");
CREATE INDEX "SellerSubscription_businessId_status_currentPeriodEnd_idx" ON "SellerSubscription"("businessId", "status", "currentPeriodEnd");
CREATE UNIQUE INDEX "SellerSubscription_one_pending_per_business" ON "SellerSubscription"("businessId") WHERE "status" = 'PENDING_PAYMENT';
CREATE UNIQUE INDEX "SellerSubscription_one_active_per_business" ON "SellerSubscription"("businessId") WHERE "status" = 'ACTIVE';

ALTER TABLE "Payment" ADD COLUMN "sellerSubscriptionId" TEXT;
CREATE UNIQUE INDEX "Payment_sellerSubscriptionId_key" ON "Payment"("sellerSubscriptionId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_sellerSubscriptionId_fkey" FOREIGN KEY ("sellerSubscriptionId") REFERENCES "SellerSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;