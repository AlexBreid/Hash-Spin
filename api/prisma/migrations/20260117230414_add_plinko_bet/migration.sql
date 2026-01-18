-- CreateTable
CREATE TABLE "PlinkoBet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "betAmount" DECIMAL(30,18) NOT NULL,
    "winAmount" DECIMAL(30,18) NOT NULL,
    "result" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlinkoBet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlinkoBet_userId_createdAt_idx" ON "PlinkoBet"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlinkoBet" ADD CONSTRAINT "PlinkoBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlinkoBet" ADD CONSTRAINT "PlinkoBet_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
