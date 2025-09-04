/*
  Warnings:

  - You are about to drop the column `aisleId` on the `inventory_items` table. All the data in the column will be lost.
  - You are about to drop the column `binId` on the `inventory_items` table. All the data in the column will be lost.
  - You are about to drop the column `binLocationCode` on the `inventory_items` table. All the data in the column will be lost.
  - You are about to drop the column `shelfId` on the `inventory_items` table. All the data in the column will be lost.
  - You are about to drop the column `zoneId` on the `inventory_items` table. All the data in the column will be lost.
  - You are about to drop the `aisles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bins` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shelves` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `zones` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[organizationId,productId,locationId]` on the table `inventory_items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."aisles" DROP CONSTRAINT "aisles_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."aisles" DROP CONSTRAINT "aisles_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "public"."bins" DROP CONSTRAINT "bins_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."bins" DROP CONSTRAINT "bins_shelfId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_items" DROP CONSTRAINT "inventory_items_aisleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_items" DROP CONSTRAINT "inventory_items_binId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_items" DROP CONSTRAINT "inventory_items_shelfId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory_items" DROP CONSTRAINT "inventory_items_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "public"."shelves" DROP CONSTRAINT "shelves_aisleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."shelves" DROP CONSTRAINT "shelves_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."zones" DROP CONSTRAINT "zones_locationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."zones" DROP CONSTRAINT "zones_organizationId_fkey";

-- DropIndex
DROP INDEX "public"."inventory_items_organizationId_productId_locationId_zoneId__key";

-- AlterTable
ALTER TABLE "public"."inventory_items" DROP COLUMN "aisleId",
DROP COLUMN "binId",
DROP COLUMN "binLocationCode",
DROP COLUMN "shelfId",
DROP COLUMN "zoneId";

-- DropTable
DROP TABLE "public"."aisles";

-- DropTable
DROP TABLE "public"."bins";

-- DropTable
DROP TABLE "public"."shelves";

-- DropTable
DROP TABLE "public"."zones";

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_organizationId_productId_locationId_key" ON "public"."inventory_items"("organizationId", "productId", "locationId");
