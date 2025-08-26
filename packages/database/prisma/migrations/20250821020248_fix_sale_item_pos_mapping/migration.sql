/*
  Warnings:

  - A unique constraint covering the columns `[saleId,posProductId]` on the table `sale_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `itemName` to the `sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `posProductId` to the `sale_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."sale_items" DROP CONSTRAINT "sale_items_productId_fkey";

-- DropIndex
DROP INDEX "public"."sale_items_saleId_productId_key";

-- AlterTable
ALTER TABLE "public"."sale_items" ADD COLUMN     "itemName" TEXT NOT NULL,
ADD COLUMN     "posProductId" TEXT NOT NULL,
ADD COLUMN     "recipeId" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sale_items_saleId_posProductId_key" ON "public"."sale_items"("saleId", "posProductId");

-- AddForeignKey
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_posProductId_fkey" FOREIGN KEY ("posProductId") REFERENCES "public"."pos_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
