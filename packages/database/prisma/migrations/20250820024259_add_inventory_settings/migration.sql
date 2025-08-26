-- CreateTable
CREATE TABLE "public"."inventory_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "webhookPolicy" JSONB NOT NULL,
    "cronSyncPolicy" JSONB NOT NULL,
    "manualPolicy" JSONB NOT NULL,
    "enableAutoConversion" BOOLEAN NOT NULL DEFAULT true,
    "conversionFallback" TEXT NOT NULL DEFAULT 'warn',
    "enableOverDepletionLogging" BOOLEAN NOT NULL DEFAULT true,
    "enableUnitConversionLogging" BOOLEAN NOT NULL DEFAULT false,
    "auditLogRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_settings_organizationId_key" ON "public"."inventory_settings"("organizationId");

-- AddForeignKey
ALTER TABLE "public"."inventory_settings" ADD CONSTRAINT "inventory_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
