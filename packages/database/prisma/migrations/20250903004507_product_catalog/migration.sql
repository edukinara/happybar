-- CreateTable
CREATE TABLE "public"."product_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "upc" TEXT,
    "image" TEXT,
    "caseSize" DOUBLE PRECISION,
    "unitSize" DOUBLE PRECISION,
    "unit" TEXT,
    "costPerUnit" DOUBLE PRECISION NOT NULL,
    "costPerCase" DOUBLE PRECISION,
    "container" TEXT,

    CONSTRAINT "product_catalog_pkey" PRIMARY KEY ("id")
);
