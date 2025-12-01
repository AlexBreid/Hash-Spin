/*
  Warnings:

  - A unique constraint covering the columns `[txHash,userId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Transaction_txHash_key";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_userId_key" ON "Transaction"("txHash", "userId");
