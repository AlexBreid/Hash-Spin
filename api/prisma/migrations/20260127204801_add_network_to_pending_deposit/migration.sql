-- DropIndex
DROP INDEX "CryptoToken_symbol_key";

-- AlterTable
ALTER TABLE "PendingDeposit" ADD COLUMN     "network" TEXT;

-- CreateTable
CREATE TABLE "UserWallet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "privateKey" TEXT,
    "network" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_address_key" ON "UserWallet"("address");

-- CreateIndex
CREATE INDEX "UserWallet_userId_idx" ON "UserWallet"("userId");

-- CreateIndex
CREATE INDEX "UserWallet_address_idx" ON "UserWallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_userId_tokenId_key" ON "UserWallet"("userId", "tokenId");

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
