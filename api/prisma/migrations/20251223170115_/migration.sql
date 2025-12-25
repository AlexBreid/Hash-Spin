-- CreateTable
CREATE TABLE "PlinkoGame" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "betAmount" DECIMAL(30,18) NOT NULL,
    "winAmount" DECIMAL(30,18) NOT NULL,
    "ballPath" TEXT NOT NULL,
    "finalPosition" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlinkoGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlinkoGame_userId_createdAt_idx" ON "PlinkoGame"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PlinkoGame_status_idx" ON "PlinkoGame"("status");

-- AddForeignKey
ALTER TABLE "PlinkoGame" ADD CONSTRAINT "PlinkoGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlinkoGame" ADD CONSTRAINT "PlinkoGame_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
