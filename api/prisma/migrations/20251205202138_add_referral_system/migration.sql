/*
  Warnings:

  - Made the column `depositBonusPercent` on table `Bonus` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalTurnover` on table `ReferralStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `turnoverSinceLastPayout` on table `ReferralStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalCommissionPaid` on table `ReferralStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `ReferralStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `ReferralStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `referrerType` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ReferralStats" DROP CONSTRAINT "ReferralStats_refereeId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralStats" DROP CONSTRAINT "ReferralStats_referrerId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralStats" DROP CONSTRAINT "ReferralStats_tokenId_fkey";

-- AlterTable
ALTER TABLE "Bonus" ALTER COLUMN "depositBonusPercent" SET NOT NULL,
ALTER COLUMN "depositBonusPercent" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "ReferralStats" ALTER COLUMN "totalTurnover" SET NOT NULL,
ALTER COLUMN "turnoverSinceLastPayout" SET NOT NULL,
ALTER COLUMN "totalCommissionPaid" SET NOT NULL,
ALTER COLUMN "lastPayoutAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "referrerType" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ReferralStats_turnoverSinceLastPayout_idx" ON "ReferralStats"("turnoverSinceLastPayout");

-- AddForeignKey
ALTER TABLE "ReferralStats" ADD CONSTRAINT "ReferralStats_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStats" ADD CONSTRAINT "ReferralStats_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStats" ADD CONSTRAINT "ReferralStats_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
