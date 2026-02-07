-- AlterEnum
ALTER TYPE "GameType" ADD VALUE 'COINFLIP';

-- CreateTable
CREATE TABLE "CoinFlipGame" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "betAmount" DECIMAL(30,18) NOT NULL,
    "winAmount" DECIMAL(30,18),
    "choice" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.8,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinFlipGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinFlipBet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "betAmount" DECIMAL(30,18) NOT NULL,
    "winAmount" DECIMAL(30,18),
    "choice" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinFlipBet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoinFlipGame_userId_createdAt_idx" ON "CoinFlipGame"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoinFlipGame_status_idx" ON "CoinFlipGame"("status");

-- CreateIndex
CREATE INDEX "CoinFlipBet_userId_createdAt_idx" ON "CoinFlipBet"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CoinFlipGame" ADD CONSTRAINT "CoinFlipGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinFlipGame" ADD CONSTRAINT "CoinFlipGame_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinFlipBet" ADD CONSTRAINT "CoinFlipBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinFlipBet" ADD CONSTRAINT "CoinFlipBet_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
