-- CreateEnum
CREATE TYPE "public"."OrderingUnit" AS ENUM ('UNIT', 'CASE');

-- AlterTable
ALTER TABLE "public"."order_items" ADD COLUMN     "orderingUnit" "public"."OrderingUnit" NOT NULL DEFAULT 'UNIT';

-- AlterTable
ALTER TABLE "public"."product_suppliers" ADD COLUMN     "costPerCase" DOUBLE PRECISION,
ADD COLUMN     "minimumOrderUnit" "public"."OrderingUnit",
ADD COLUMN     "orderingUnit" "public"."OrderingUnit" NOT NULL DEFAULT 'UNIT',
ADD COLUMN     "packSize" INTEGER;
