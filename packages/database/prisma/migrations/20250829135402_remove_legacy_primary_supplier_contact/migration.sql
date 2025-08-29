/*
  Warnings:

  - You are about to drop the column `contactEmail` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhone` on the `suppliers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."suppliers" DROP COLUMN "contactEmail",
DROP COLUMN "contactPhone";
