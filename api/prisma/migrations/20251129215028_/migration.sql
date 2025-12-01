-- AlterEnum
ALTER TYPE "GameType" ADD VALUE 'MINESWEEPER';

-- CreateTable
CREATE TABLE "MinesweeperDifficulty" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "minesCount" INTEGER NOT NULL,
    "gridSize" INTEGER NOT NULL DEFAULT 6,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinesweeperDifficulty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinesweeperGame" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "difficultyId" INTEGER NOT NULL,
    "gameState" JSONB NOT NULL,
    "minesPositions" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLAYING',
    "revealedCells" INTEGER NOT NULL DEFAULT 0,
    "flaggedCells" INTEGER NOT NULL DEFAULT 0,
    "betAmount" DECIMAL(30,18) NOT NULL,
    "winAmount" DECIMAL(30,18),
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinesweeperGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinesweeperBet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "betAmount" DECIMAL(30,18) NOT NULL,
    "winAmount" DECIMAL(30,18),
    "result" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinesweeperBet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MinesweeperDifficulty_name_key" ON "MinesweeperDifficulty"("name");

-- CreateIndex
CREATE INDEX "MinesweeperGame_userId_createdAt_idx" ON "MinesweeperGame"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MinesweeperGame_status_idx" ON "MinesweeperGame"("status");

-- CreateIndex
CREATE INDEX "MinesweeperBet_userId_createdAt_idx" ON "MinesweeperBet"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "MinesweeperGame" ADD CONSTRAINT "MinesweeperGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinesweeperGame" ADD CONSTRAINT "MinesweeperGame_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinesweeperGame" ADD CONSTRAINT "MinesweeperGame_difficultyId_fkey" FOREIGN KEY ("difficultyId") REFERENCES "MinesweeperDifficulty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinesweeperBet" ADD CONSTRAINT "MinesweeperBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinesweeperBet" ADD CONSTRAINT "MinesweeperBet_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
