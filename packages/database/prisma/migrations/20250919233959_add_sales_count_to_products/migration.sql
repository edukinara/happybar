-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "salesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "salesCountUpdatedAt" TIMESTAMP(3);
