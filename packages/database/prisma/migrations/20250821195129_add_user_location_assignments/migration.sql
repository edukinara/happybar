-- CreateTable
CREATE TABLE "public"."user_location_assignments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_location_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_location_assignments_userId_organizationId_idx" ON "public"."user_location_assignments"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "user_location_assignments_locationId_organizationId_idx" ON "public"."user_location_assignments"("locationId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "user_location_assignments_organizationId_userId_locationId_key" ON "public"."user_location_assignments"("organizationId", "userId", "locationId");

-- AddForeignKey
ALTER TABLE "public"."user_location_assignments" ADD CONSTRAINT "user_location_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_location_assignments" ADD CONSTRAINT "user_location_assignments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_location_assignments" ADD CONSTRAINT "user_location_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_location_assignments" ADD CONSTRAINT "user_location_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
