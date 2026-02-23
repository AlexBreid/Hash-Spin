-- AlterTable
ALTER TABLE "BonusTemplate" ADD COLUMN "isFreebet" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BonusTemplate" ADD COLUMN "freebetAmount" DECIMAL(30,18);

