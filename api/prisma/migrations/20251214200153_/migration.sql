-- AlterTable
ALTER TABLE "ReferralStats" ADD COLUMN     "newLossesSinceLastPayout" DECIMAL(30,18) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ReferralStats_newLossesSinceLastPayout_idx" ON "ReferralStats"("newLossesSinceLastPayout");
