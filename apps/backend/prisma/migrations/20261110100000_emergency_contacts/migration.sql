CREATE TABLE "EmergencyContact" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameGu" TEXT,
  "nameHi" TEXT,
  "category" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT,
  "hours" TEXT,
  "sourceUrl" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmergencyContact_isActive_isVerified_category_idx" ON "EmergencyContact"("isActive", "isVerified", "category");
CREATE INDEX "EmergencyContact_name_idx" ON "EmergencyContact"("name");
