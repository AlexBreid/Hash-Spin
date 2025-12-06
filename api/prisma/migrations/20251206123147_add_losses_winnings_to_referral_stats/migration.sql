-- AlterTable
ALTER TABLE "ReferralStats" ADD COLUMN     "totalLosses" DECIMAL(30,18) NOT NULL DEFAULT 0,
ADD COLUMN     "totalWinnings" DECIMAL(30,18) NOT NULL DEFAULT 0;
