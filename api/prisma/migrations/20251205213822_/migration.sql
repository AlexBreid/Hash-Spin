-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('SLOT', 'ROULETTE', 'BLACKJACK', 'CRASH', 'LIVE_DEALER', 'MINESWEEPER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'BONUS', 'REFUND', 'TRANSFER', 'REFERRAL_COMMISSION', 'BONUS_TO_MAIN');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('MAIN', 'BONUS');

-- CreateEnum
CREATE TYPE "ReferralEventType" AS ENUM ('BET_COMMISSION', 'DEPOSIT_BONUS');

-- CreateEnum
CREATE TYPE "ReferrerType" AS ENUM ('REGULAR', 'WORKER');

-- CreateTable
CREATE TABLE "CryptoToken" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'ERC-20',
    "decimals" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "photoUrl" TEXT,
    "passwordHash" TEXT,
    "salt" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referredById" INTEGER,
    "referrerType" "ReferrerType" NOT NULL DEFAULT 'REGULAR',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Balance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "type" "BalanceType" NOT NULL DEFAULT 'MAIN',
    "amount" DECIMAL(30,18) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(30,18) NOT NULL,
    "txHash" TEXT,
    "walletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "gameType" "GameType" NOT NULL,
    "betAmount" DECIMAL(30,18) NOT NULL,
    "payoutAmount" DECIMAL(30,18) NOT NULL,
    "netAmount" DECIMAL(30,18) NOT NULL,
    "payoutRatio" DOUBLE PRECISION NOT NULL,
    "roundId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bonus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "wageringMultiplier" DOUBLE PRECISION NOT NULL,
    "maxBonusAmount" DECIMAL(30,18) NOT NULL,
    "depositBonusPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Bonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBonus" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bonusId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "grantedAmount" DECIMAL(30,18) NOT NULL,
    "requiredWager" DECIMAL(30,18) NOT NULL,
    "wageredAmount" DECIMAL(30,18) NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "referrerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" INTEGER,
    "metric" TEXT NOT NULL,
    "score" DECIMAL(30,18) NOT NULL,
    "period" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralTransaction" (
    "id" SERIAL NOT NULL,
    "referrerId" INTEGER NOT NULL,
    "refereeId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "eventType" "ReferralEventType" NOT NULL,
    "amount" DECIMAL(30,18) NOT NULL,
    "sourceEntityId" INTEGER NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralStats" (
    "id" SERIAL NOT NULL,
    "referrerId" INTEGER NOT NULL,
    "refereeId" INTEGER NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "totalTurnover" DECIMAL(30,18) NOT NULL DEFAULT 0,
    "turnoverSinceLastPayout" DECIMAL(30,18) NOT NULL DEFAULT 0,
    "totalCommissionPaid" DECIMAL(30,18) NOT NULL DEFAULT 0,
    "lastPayoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimeToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OneTimeToken_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "PendingDeposit" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "asset" TEXT NOT NULL DEFAULT 'USDT',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingDeposit_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "CryptoToken_symbol_key" ON "CryptoToken"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Balance_userId_tokenId_type_key" ON "Balance"("userId", "tokenId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_userId_key" ON "Transaction"("txHash", "userId");

-- CreateIndex
CREATE INDEX "Bet_userId_gameType_createdAt_idx" ON "Bet"("userId", "gameType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bonus_name_key" ON "Bonus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserBonus_userId_bonusId_tokenId_key" ON "UserBonus"("userId", "bonusId", "tokenId");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_metric_period_score_idx" ON "LeaderboardEntry"("metric", "period", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_userId_metric_period_tokenId_key" ON "LeaderboardEntry"("userId", "metric", "period", "tokenId");

-- CreateIndex
CREATE INDEX "ReferralTransaction_referrerId_createdAt_idx" ON "ReferralTransaction"("referrerId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralStats_referrerId_idx" ON "ReferralStats"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralStats_refereeId_idx" ON "ReferralStats"("refereeId");

-- CreateIndex
CREATE INDEX "ReferralStats_turnoverSinceLastPayout_idx" ON "ReferralStats"("turnoverSinceLastPayout");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralStats_referrerId_refereeId_tokenId_key" ON "ReferralStats"("referrerId", "refereeId", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeToken_token_key" ON "OneTimeToken"("token");

-- CreateIndex
CREATE INDEX "OneTimeToken_token_expiresAt_idx" ON "OneTimeToken"("token", "expiresAt");

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

-- CreateIndex
CREATE UNIQUE INDEX "MinesweeperDifficulty_name_key" ON "MinesweeperDifficulty"("name");

-- CreateIndex
CREATE INDEX "MinesweeperGame_userId_createdAt_idx" ON "MinesweeperGame"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MinesweeperGame_status_idx" ON "MinesweeperGame"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PendingDeposit_invoiceId_key" ON "PendingDeposit"("invoiceId");

-- CreateIndex
CREATE INDEX "PendingDeposit_userId_idx" ON "PendingDeposit"("userId");

-- CreateIndex
CREATE INDEX "PendingDeposit_status_createdAt_idx" ON "PendingDeposit"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MinesweeperBet_userId_createdAt_idx" ON "MinesweeperBet"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Balance" ADD CONSTRAINT "Balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Balance" ADD CONSTRAINT "Balance_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBonus" ADD CONSTRAINT "UserBonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBonus" ADD CONSTRAINT "UserBonus_bonusId_fkey" FOREIGN KEY ("bonusId") REFERENCES "Bonus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBonus" ADD CONSTRAINT "UserBonus_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralTransaction" ADD CONSTRAINT "ReferralTransaction_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralTransaction" ADD CONSTRAINT "ReferralTransaction_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralTransaction" ADD CONSTRAINT "ReferralTransaction_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStats" ADD CONSTRAINT "ReferralStats_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStats" ADD CONSTRAINT "ReferralStats_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStats" ADD CONSTRAINT "ReferralStats_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CryptoToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneTimeToken" ADD CONSTRAINT "OneTimeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
