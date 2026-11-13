CREATE TYPE "ClassifiedListingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SOLD', 'EXPIRED', 'REMOVED');
CREATE TYPE "ClassifiedReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

CREATE TABLE "ClassifiedListing" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "pricePaise" INTEGER NOT NULL,
  "condition" "ProductCondition" NOT NULL,
  "locality" TEXT NOT NULL,
  "photoUrls" TEXT[] NOT NULL,
  "status" "ClassifiedListingStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassifiedListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassifiedEnquiry" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "reply" TEXT,
  "repliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassifiedEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassifiedReport" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ClassifiedReportStatus" NOT NULL DEFAULT 'PENDING',
  "moderatorId" TEXT,
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "ClassifiedReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClassifiedListing_status_expiresAt_createdAt_idx" ON "ClassifiedListing"("status", "expiresAt", "createdAt");
CREATE INDEX "ClassifiedListing_categoryId_status_expiresAt_idx" ON "ClassifiedListing"("categoryId", "status", "expiresAt");
CREATE INDEX "ClassifiedListing_locality_status_idx" ON "ClassifiedListing"("locality", "status");
CREATE INDEX "ClassifiedListing_sellerId_status_createdAt_idx" ON "ClassifiedListing"("sellerId", "status", "createdAt");
CREATE INDEX "ClassifiedEnquiry_sellerId_createdAt_idx" ON "ClassifiedEnquiry"("sellerId", "createdAt");
CREATE INDEX "ClassifiedEnquiry_buyerId_createdAt_idx" ON "ClassifiedEnquiry"("buyerId", "createdAt");
CREATE INDEX "ClassifiedEnquiry_listingId_createdAt_idx" ON "ClassifiedEnquiry"("listingId", "createdAt");
CREATE INDEX "ClassifiedReport_status_createdAt_idx" ON "ClassifiedReport"("status", "createdAt");
CREATE INDEX "ClassifiedReport_listingId_reporterId_idx" ON "ClassifiedReport"("listingId", "reporterId");
CREATE UNIQUE INDEX "ClassifiedReport_listingId_reporterId_key" ON "ClassifiedReport"("listingId", "reporterId");

ALTER TABLE "ClassifiedListing" ADD CONSTRAINT "ClassifiedListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassifiedListing" ADD CONSTRAINT "ClassifiedListing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassifiedEnquiry" ADD CONSTRAINT "ClassifiedEnquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ClassifiedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassifiedEnquiry" ADD CONSTRAINT "ClassifiedEnquiry_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassifiedEnquiry" ADD CONSTRAINT "ClassifiedEnquiry_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassifiedReport" ADD CONSTRAINT "ClassifiedReport_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ClassifiedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassifiedReport" ADD CONSTRAINT "ClassifiedReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassifiedReport" ADD CONSTRAINT "ClassifiedReport_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
