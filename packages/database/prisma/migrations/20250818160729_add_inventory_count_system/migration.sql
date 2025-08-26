-- CreateEnum
CREATE TYPE "public"."CountType" AS ENUM ('FULL', 'SPOT', 'CYCLE');

-- CreateEnum
CREATE TYPE "public"."InventoryCountStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED');

-- CreateEnum
CREATE TYPE "public"."AreaStatus" AS ENUM ('PENDING', 'COUNTING', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."inventory_counts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."CountType" NOT NULL,
    "status" "public"."InventoryCountStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itemsCounted" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."count_areas" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."AreaStatus" NOT NULL,

    CONSTRAINT "count_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_count_items" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fullUnits" INTEGER NOT NULL DEFAULT 0,
    "partialUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuantity" DOUBLE PRECISION NOT NULL,
    "expectedQty" DOUBLE PRECISION,
    "variance" DOUBLE PRECISION,
    "unitCost" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION,
    "notes" TEXT,
    "countedById" TEXT NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_counts_organizationId_locationId_idx" ON "public"."inventory_counts"("organizationId", "locationId");

-- CreateIndex
CREATE INDEX "inventory_counts_status_idx" ON "public"."inventory_counts"("status");

-- CreateIndex
CREATE INDEX "inventory_counts_organizationId_startedAt_idx" ON "public"."inventory_counts"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "count_areas_countId_idx" ON "public"."count_areas"("countId");

-- CreateIndex
CREATE UNIQUE INDEX "count_areas_countId_name_key" ON "public"."count_areas"("countId", "name");

-- CreateIndex
CREATE INDEX "inventory_count_items_productId_idx" ON "public"."inventory_count_items"("productId");

-- CreateIndex
CREATE INDEX "inventory_count_items_countedById_idx" ON "public"."inventory_count_items"("countedById");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_count_items_areaId_productId_key" ON "public"."inventory_count_items"("areaId", "productId");

-- AddForeignKey
ALTER TABLE "public"."inventory_counts" ADD CONSTRAINT "inventory_counts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_counts" ADD CONSTRAINT "inventory_counts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_counts" ADD CONSTRAINT "inventory_counts_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."count_areas" ADD CONSTRAINT "count_areas_countId_fkey" FOREIGN KEY ("countId") REFERENCES "public"."inventory_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_count_items" ADD CONSTRAINT "inventory_count_items_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."count_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_count_items" ADD CONSTRAINT "inventory_count_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_count_items" ADD CONSTRAINT "inventory_count_items_countedById_fkey" FOREIGN KEY ("countedById") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
