-- CreateTable
CREATE TABLE "public"."recipe_pos_mappings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "posProductId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_pos_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_pos_mappings_organizationId_isActive_idx" ON "public"."recipe_pos_mappings"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_pos_mappings_recipeId_posProductId_key" ON "public"."recipe_pos_mappings"("recipeId", "posProductId");

-- AddForeignKey
ALTER TABLE "public"."recipe_pos_mappings" ADD CONSTRAINT "recipe_pos_mappings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_pos_mappings" ADD CONSTRAINT "recipe_pos_mappings_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_pos_mappings" ADD CONSTRAINT "recipe_pos_mappings_posProductId_fkey" FOREIGN KEY ("posProductId") REFERENCES "public"."pos_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
