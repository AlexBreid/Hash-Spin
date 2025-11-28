-- CreateTable
CREATE TABLE "CrashRound" (
    "id" SERIAL NOT NULL,
    "gameId" TEXT NOT NULL,
    "crashPoint" DECIMAL(10,2) NOT NULL,
    "totalPlayers" INTEGER NOT NULL DEFAULT 0,
    "winnersCount" INTEGER NOT NULL DEFAULT 0,
    "totalWagered" DECIMAL(30,18) NOT NULL DEFAULT 0,
    "totalPayouts" DECIMAL(30,18) NOT NULL DEFAULT 0,
    "serverSeedHash" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrashRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrashBet" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "betAmount" DECIMAL(30,18) NOT NULL,
    "exitMultiplier" DECIMAL(10,2),
    "winnings" DECIMAL(30,18) DEFAULT 0,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrashBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrashTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "betId" INTEGER,
    "tokenId" INTEGER NOT NULL,
    "amount" DECIMAL(30,18) NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrashRound_gameId_key" ON "CrashRound"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "CrashRound_serverSeedHash_key" ON "CrashRound"("serverSeedHash");

-- CreateIndex
CREATE INDEX "CrashRound_gameId_idx" ON "CrashRound"("gameId");

-- CreateIndex
CREATE INDEX "CrashRound_createdAt_idx" ON "CrashRound"("createdAt");

-- CreateIndex
CREATE INDEX "CrashBet_userId_createdAt_idx" ON "CrashBet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CrashBet_roundId_idx" ON "CrashBet"("roundId");

-- CreateIndex
CREATE INDEX "CrashBet_result_idx" ON "CrashBet"("result");

-- CreateIndex
CREATE INDEX "CrashTransaction_userId_createdAt_idx" ON "CrashTransaction"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CrashBet" ADD CONSTRAINT "CrashBet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "CrashRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrashBet" ADD CONSTRAINT "CrashBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrashBet" ADD CONSTRAINT "CrashBet_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrashTransaction" ADD CONSTRAINT "CrashTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrashTransaction" ADD CONSTRAINT "CrashTransaction_betId_fkey" FOREIGN KEY ("betId") REFERENCES "CrashBet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrashTransaction" ADD CONSTRAINT "CrashTransaction_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
