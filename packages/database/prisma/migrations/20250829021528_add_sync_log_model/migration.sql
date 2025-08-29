-- CreateEnum
CREATE TYPE "public"."SyncType" AS ENUM ('SALES', 'PRODUCTS', 'INVENTORY', 'FULL');

-- AlterTable
ALTER TABLE "public"."organization" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "public"."SyncLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "syncType" "public"."SyncType" NOT NULL,
    "status" "public"."SyncStatus" NOT NULL,
    "recordsProcessed" INTEGER,
    "recordsFailed" INTEGER,
    "errorMessage" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncLog_organizationId_idx" ON "public"."SyncLog"("organizationId");

-- CreateIndex
CREATE INDEX "SyncLog_syncType_idx" ON "public"."SyncLog"("syncType");

-- CreateIndex
CREATE INDEX "SyncLog_status_idx" ON "public"."SyncLog"("status");

-- CreateIndex
CREATE INDEX "SyncLog_completedAt_idx" ON "public"."SyncLog"("completedAt");

-- AddForeignKey
ALTER TABLE "public"."SyncLog" ADD CONSTRAINT "SyncLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
