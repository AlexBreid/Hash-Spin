-- DropForeignKey
ALTER TABLE "Balance" DROP CONSTRAINT "Balance_userId_fkey";

-- DropForeignKey
ALTER TABLE "Bet" DROP CONSTRAINT "Bet_userId_fkey";

-- DropForeignKey
ALTER TABLE "CrashTransaction" DROP CONSTRAINT "CrashTransaction_betId_fkey";

-- DropForeignKey
ALTER TABLE "CrashTransaction" DROP CONSTRAINT "CrashTransaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "LeaderboardEntry" DROP CONSTRAINT "LeaderboardEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "OneTimeToken" DROP CONSTRAINT "OneTimeToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralStats" DROP CONSTRAINT "ReferralStats_refereeId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralStats" DROP CONSTRAINT "ReferralStats_referrerId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralTransaction" DROP CONSTRAINT "ReferralTransaction_refereeId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralTransaction" DROP CONSTRAINT "ReferralTransaction_referrerId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserBonus" DROP CONSTRAINT "UserBonus_bonusId_fkey";

-- DropForeignKey
ALTER TABLE "UserBonus" DROP CONSTRAINT "UserBonus_userId_fkey";

-- DropIndex
DROP INDEX "UserBonus_userId_bonusId_tokenId_key";

-- AlterTable
ALTER TABLE "UserBonus" ADD COLUMN     "completedAt" TIMESTAMP(3),
ALTER COLUMN "bonusId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Balance_userId_idx" ON "Balance"("userId");

-- CreateIndex
CREATE INDEX "ReferralTransaction_refereeId_createdAt_idx" ON "ReferralTransaction"("refereeId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBonus_userId_isActive_idx" ON "UserBonus"("userId", "isActive");

-- CreateIndex
CREATE INDEX "UserBonus_expiresAt_idx" ON "UserBonus"("expiresAt");

-- CreateIndex
CREATE INDEX "UserBonus_createdAt_idx" ON "UserBonus"("createdAt");

-- AddForeignKey
ALTER TABLE "Balance" ADD CONSTRAINT "Balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBonus" ADD CONSTRAINT "UserBonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBonus" ADD CONSTRAINT "UserBonus_bonusId_fkey" FOREIGN KEY ("bonusId") REFERENCES "Bonus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralTransaction" ADD CONSTRAINT "ReferralTransaction_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralTransaction" ADD CONSTRAINT "ReferralTransaction_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStats" ADD CONSTRAINT "ReferralStats_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStats" ADD CONSTRAINT "ReferralStats_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneTimeToken" ADD CONSTRAINT "OneTimeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrashTransaction" ADD CONSTRAINT "CrashTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrashTransaction" ADD CONSTRAINT "CrashTransaction_betId_fkey" FOREIGN KEY ("betId") REFERENCES "CrashBet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
