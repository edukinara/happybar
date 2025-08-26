/*
  Warnings:

  - You are about to drop the `organizationMember` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."organizationMember" DROP CONSTRAINT "organizationMember_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."organizationMember" DROP CONSTRAINT "organizationMember_userId_fkey";

-- DropTable
DROP TABLE "public"."organizationMember";
