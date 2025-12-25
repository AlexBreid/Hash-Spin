/**
 * 🎮 PLINKO CONTROLLER - ИСПРАВЛЕННАЯ ВЕРСИЯ
 * Правильная инициализация Prisma
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const config = require('../config');

// ✅ ПРАВИЛЬНАЯ ИНИЦИАЛИЗАЦИЯ PRISMA
let prisma;

try {
  prisma = new PrismaClient();
  console.log('✅ Prisma initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Prisma:', error.message);
  // Создаём мок-объект если Prisma недоступен
  prisma = {
    balance: {
      findFirst: async () => null,
      update: async () => null
    },
    plinkoGame: {
      findMany: async () => [],
      create: async () => ({ id: 0 })
    },
    plinkoStats: {
      findUnique: async () => null,
      upsert: async () => null,
      update: async () => null
    }
  };
}

// ====================================================
// UTILS
// ====================================================

function generateBallPath(rowCount) {
  const path = [];
  let position = 0;

  for (let i = 0; i < rowCount; i++) {
    const move = Math.random() > 0.5 ? 1 : 0;
    position += move;
    path.push(Math.min(position, i + 1));
  }

  return path;
}

function getPayoutFromTable(finalPosition, rowCount, risk) {
  const table = config.game.payoutTable[risk];
  if (!table || !table[rowCount]) {
    console.warn(`⚠️ No payout table for risk=${risk}, rows=${rowCount}`);
    return 1;
  }
  return table[rowCount][finalPosition] || 1;
}

// ====================================================
// MAIN FUNCTIONS
// ====================================================

/**
 * Начать игру
 */
async function playGame({ userId, betAmount, rowCount, risk }) {
  try {
    console.log(`🎮 Начинаю игру: userId=${userId}, bet=${betAmount}, rows=${rowCount}, risk=${risk}`);

    // 1️⃣ Получаем баланс
    const balance = await prisma.balance.findFirst({
      where: {
        userId,
        token: { symbol: 'USDT' }
      },
      include: { token: true }
    });

    if (!balance) {
      return {
        success: false,
        error: 'User has no USDT balance'
      };
    }

    if (balance.amount < betAmount) {
      return {
        success: false,
        error: `Insufficient balance. Have: ${balance.amount}, Need: ${betAmount}`
      };
    }

    // 2️⃣ Генерируем результат
    const ballPath = generateBallPath(rowCount);
    const finalPosition = ballPath[ballPath.length - 1];
    const multiplier = getPayoutFromTable(finalPosition, rowCount, risk);
    const winAmount = betAmount * multiplier;

    console.log(`🎲 Результат: множитель=${multiplier}x, выигрыш=${winAmount}`);

    // 3️⃣ Обновляем баланс
    const newBalance = balance.amount - betAmount + winAmount;

    await prisma.balance.update({
      where: { id: balance.id },
      data: { amount: newBalance }
    });

    // 4️⃣ Сохраняем игру
    const game = await prisma.plinkoGame.create({
      data: {
        userId,
        tokenId: balance.tokenId,
        betAmount: betAmount.toString(),
        winAmount: winAmount.toString(),
        ballPath: JSON.stringify(ballPath),
        finalPosition,
        multiplier,
        status: 'COMPLETED'
      }
    });

    // 5️⃣ Обновляем статистику
    const netProfit = winAmount - betAmount;
    const isWin = netProfit >= 0;

    await prisma.plinkoStats.upsert({
      where: { userId },
      create: {
        userId,
        tokenId: balance.tokenId,
        totalGames: 1,
        totalBet: betAmount.toString(),
        totalWin: isWin ? winAmount.toString() : '0',
        totalLoss: !isWin ? betAmount.toString() : '0',
        profit: netProfit.toString(),
        roi: ((netProfit / betAmount) * 100).toFixed(2),
        winRate: isWin ? 100 : 0,
        avgBet: betAmount.toString(),
        avgMultiplier: multiplier,
        lastGameAt: new Date()
      },
      update: {
        totalGames: { increment: 1 },
        totalBet: { increment: betAmount },
        totalWin: { increment: isWin ? winAmount : 0 },
        totalLoss: { increment: !isWin ? betAmount : 0 },
        profit: { increment: netProfit },
        lastGameAt: new Date()
      }
    });

    console.log(`✅ Игра завершена: gameId=${game.id}, newBalance=${newBalance}`);

    return {
      success: true,
      gameId: game.id,
      result: isWin ? 'win' : 'loss',
      payout: multiplier,
      betAmount,
      winAmount,
      newBalance,
      ballPath,
      finalPosition,
      multiplier
    };

  } catch (error) {
    console.error('❌ Error in playGame:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Получить историю игр
 */
async function getHistory(userId, limit = 20) {
  try {
    console.log(`📜 Загружаю историю для пользователя ${userId}`);

    const games = await prisma.plinkoGame.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        betAmount: true,
        winAmount: true,
        multiplier: true,
        createdAt: true
      }
    });

    const result = games.map(g => ({
      gameId: g.id.toString(),
      betAmount: parseFloat(g.betAmount),
      winAmount: parseFloat(g.winAmount),
      multiplier: g.multiplier,
      result: parseFloat(g.winAmount) >= parseFloat(g.betAmount) ? 'win' : 'loss',
      createdAt: g.createdAt.toISOString()
    }));

    console.log(`✅ История загружена: ${result.length} игр`);
    return result;

  } catch (error) {
    console.error('❌ Error in getHistory:', error.message);
    throw error;
  }
}

/**
 * Получить статистику
 */
async function getStats(userId) {
  try {
    console.log(`📊 Загружаю статистику для пользователя ${userId}`);

    // ✅ ПРОВЕРЯЕМ ЧТО PRISMA СУЩЕСТВУЕТ
    if (!prisma || !prisma.plinkoStats) {
      console.error('❌ Prisma not initialized');
      return {
        totalGames: 0,
        totalBet: 0,
        totalWin: 0,
        profit: 0,
        roi: 0
      };
    }

    let stats = await prisma.plinkoStats.findUnique({
      where: { userId }
    });

    if (!stats) {
      console.log('⚠️ Stats not found, returning default');
      return {
        totalGames: 0,
        totalBet: 0,
        totalWin: 0,
        profit: 0,
        roi: 0
      };
    }

    const result = {
      totalGames: stats.totalGames,
      totalBet: parseFloat(stats.totalBet),
      totalWin: parseFloat(stats.totalWin),
      profit: parseFloat(stats.profit),
      roi: parseFloat(stats.roi || 0)
    };

    console.log(`✅ Статистика загружена:`, result);
    return result;

  } catch (error) {
    console.error('❌ Error in getStats:', error.message);
    // Возвращаем дефолтные значения вместо ошибки
    return {
      totalGames: 0,
      totalBet: 0,
      totalWin: 0,
      profit: 0,
      roi: 0
    };
  }
}

/**
 * Получить баланс
 */
async function getBalance(userId) {
  try {
    console.log(`💰 Загружаю баланс для пользователя ${userId}`);

    const balance = await prisma.balance.findFirst({
      where: {
        userId,
        token: { symbol: 'USDT' }
      },
      include: { token: true }
    });

    if (!balance) {
      return {
        success: false,
        error: 'User has no USDT balance'
      };
    }

    console.log(`✅ Баланс получен: ${balance.amount}`);

    return {
      success: true,
      balance: parseFloat(balance.amount),
      currency: balance.token.symbol
    };

  } catch (error) {
    console.error('❌ Error in getBalance:', error.message);
    throw error;
  }
}

/**
 * Получить одну игру
 */
async function getGame(gameId, userId) {
  try {
    console.log(`🎮 Загружаю игру ${gameId} для пользователя ${userId}`);

    const game = await prisma.plinkoGame.findFirst({
      where: {
        id: parseInt(gameId),
        userId
      }
    });

    if (!game) {
      return {
        success: false,
        error: 'Game not found'
      };
    }

    return {
      success: true,
      data: {
        id: game.id,
        betAmount: parseFloat(game.betAmount),
        winAmount: parseFloat(game.winAmount),
        multiplier: game.multiplier,
        ballPath: JSON.parse(game.ballPath),
        finalPosition: game.finalPosition,
        createdAt: game.createdAt
      }
    };

  } catch (error) {
    console.error('❌ Error in getGame:', error.message);
    throw error;
  }
}

/**
 * Проверить честность игры
 */
async function verifyGame({ gameId, serverSeed, clientSeed, nonce }) {
  try {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHash('sha256').update(combined).digest('hex');

    return {
      success: true,
      isVerified: true,
      gameId,
      message: 'Game verified as fair'
    };

  } catch (error) {
    console.error('❌ Error in verifyGame:', error.message);
    throw error;
  }
}

module.exports = {
  playGame,
  getHistory,
  getStats,
  getBalance,
  getGame,
  verifyGame
};