-- AlterTable
ALTER TABLE "public"."suppliers" ADD COLUMN     "deliveryDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "deliveryFee" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "deliveryTimeEnd" TEXT,
ADD COLUMN     "deliveryTimeStart" TEXT,
ADD COLUMN     "minimumOrderValue" DOUBLE PRECISION,
ADD COLUMN     "orderCutoffDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "orderCutoffTime" TEXT;
