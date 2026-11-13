ALTER TABLE "User"
  ADD COLUMN "username" TEXT,
  ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "AdminRecoveryRequest" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT,
  "phoneFingerprint" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "resendCount" INTEGER NOT NULL DEFAULT 0,
  "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "recoveryTokenHash" TEXT,
  "recoveryTokenExpiresAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminRecoveryRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminRecoveryRequest_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AdminRecoveryRequest_recoveryTokenHash_key" ON "AdminRecoveryRequest"("recoveryTokenHash");
CREATE INDEX "AdminRecoveryRequest_phoneFingerprint_createdAt_idx" ON "AdminRecoveryRequest"("phoneFingerprint", "createdAt");
CREATE INDEX "AdminRecoveryRequest_ipAddress_createdAt_idx" ON "AdminRecoveryRequest"("ipAddress", "createdAt");
CREATE INDEX "AdminRecoveryRequest_expiresAt_completedAt_idx" ON "AdminRecoveryRequest"("expiresAt", "completedAt");
CREATE UNIQUE INDEX "AdminRecoveryRequest_one_open_otp_per_phone_key" ON "AdminRecoveryRequest"("phoneFingerprint") WHERE "completedAt" IS NULL AND "verifiedAt" IS NULL;

CREATE TABLE "AdminLoginAttempt" (
  "id" TEXT NOT NULL,
  "identifierFingerprint" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "succeeded" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminLoginAttempt_identifierFingerprint_createdAt_idx" ON "AdminLoginAttempt"("identifierFingerprint", "createdAt");
CREATE INDEX "AdminLoginAttempt_ipAddress_createdAt_idx" ON "AdminLoginAttempt"("ipAddress", "createdAt");
