/**
 * ✅ ИСПРАВЛЕННЫЙ userRoutes.js - РАБОТАЕТ С ТАБЛИЦЕЙ UserBonus
 * 
 * ИЗМЕНЕНИЯ:
 * 1. ✅ Эндпоинт /active-bonus теперь ищет в таблице UserBonus
 * 2. ✅ Использует isActive, isCompleted, expiresAt из UserBonus
 * 3. ✅ Джойн с CryptoToken для получения символа токена
 * 4. ✅ Все остальные эндпоинты остаются без изменений
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════════════════════
// 🔧 УТИЛИТЫ
// ════════════════════════════════════════════════════════════════════════════════

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  try {
    const str = value.toString();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  } catch (e) {
    return 0;
  }
}

function calculateVipRank(totalGames) {
  if (totalGames >= 1500) return 'diamond';
  if (totalGames >= 500) return 'platinum';
  if (totalGames >= 150) return 'gold';
  if (totalGames >= 50) return 'silver';
  return 'bronze';
}

function getVipName(rank) {
  const names = {
    bronze: 'Бронза',
    silver: 'Серебро',
    gold: 'Золото',
    platinum: 'Платина',
    diamond: 'Бриллиант',
  };
  return names[rank] || 'Бронза';
}

// ════════════════════════════════════════════════════════════════════════════════
// 🎁 ✅ ОБНОВЛЕННЫЙ МАРШРУТ: GET /active-bonus (АКТИВНЫЙ БОНУС ИЗ UserBonus)
// ════════════════════════════════════════════════════════════════════════════════

router.get('/active-bonus', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    logger.info('USER', 'Fetching active bonus', { userId });

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 1: Поиск активного бонуса в таблице UserBonus
    // ════════════════════════════════════════════════════════════════════════════

    const activeBonus = await prisma.userBonus.findFirst({
      where: {
        userId: userId,
        isActive: true,          // ✅ Активный бонус
        isCompleted: false,      // ✅ Не завершён
        expiresAt: {
          gt: new Date(),        // ✅ Ещё не истёк
        },
      },
      include: {
        token: true,             // ✅ Информация о токене (для получения символа)
      },
      orderBy: {
        createdAt: 'desc',       // Последний активный бонус
      },
    });

    // Если бонуса нет
    if (!activeBonus) {
      logger.info('USER', 'No active bonus found', { userId });
      
      return res.json({
        success: true,
        data: null,
        message: 'No active bonus',
      });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 2: ФОРМИРОВАНИЕ ОТВЕТА
    // ════════════════════════════════════════════════════════════════════════════

    const bonusData = {
      id: activeBonus.id.toString(),
      userId: activeBonus.userId.toString(),
      grantedAmount: activeBonus.grantedAmount.toString(),
      requiredWager: activeBonus.requiredWager.toString(),
      wageredAmount: (activeBonus.wageredAmount || 0).toString(),
      expiresAt: activeBonus.expiresAt?.toISOString() || null,
      isActive: activeBonus.isActive,
      isCompleted: activeBonus.isCompleted,
      tokenSymbol: activeBonus.token?.symbol || 'USDT',
      createdAt: activeBonus.createdAt.toISOString(),
    };

    logger.info('USER', 'Active bonus fetched successfully', {
      userId,
      bonusId: activeBonus.id,
      grantedAmount: activeBonus.grantedAmount.toString(),
      tokenSymbol: activeBonus.token?.symbol,
    });

    return res.json({
      success: true,
      data: bonusData,
    });
  } catch (error) {
    logger.error('USER', 'Error fetching active bonus', {
      userId,
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 📊 ГЛАВНЫЙ МАРШРУТ: GET /profile (С UNION)
// ════════════════════════════════════════════════════════════════════════════════

router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    logger.info('USER', 'Starting profile fetch', { userId });

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 1: Загрузка пользователя
    // ════════════════════════════════════════════════════════════════════════════
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        createdAt: true,
        referredById: true,
        isAdmin: true,
      },
    });

    if (!user) {
      logger.warn('USER', 'User not found', { userId });
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 2: ПОЛУЧИТЬ ВСЕ ИГРЫ ЧЕРЕЗ UNION ЗАПРОС
    // ════════════════════════════════════════════════════════════════════════════

    let allGames = [];
    try {
      // ✅ UNION: собираем игры из ВСЕХ таблиц (динамически)
      allGames = await prisma.$queryRaw`
        -- CRASH ИГРЫ
        SELECT 
          'CRASH' as "gameType",
          ${userId} as "userId",
          "betAmount",
          (COALESCE("exitMultiplier", 0) - 1) * "betAmount" as "netAmount",
          "createdAt",
          COALESCE("exitMultiplier", 0) * "betAmount" as "payout"
        FROM "CrashBet"
        WHERE "userId" = ${userId}
        
        UNION ALL
        
        -- MINESWEEPER ИГРЫ (используем MinesweeperGame, а не MinesweeperBet)
        SELECT 
          'MINESWEEPER' as "gameType",
          ${userId} as "userId",
          "betAmount",
          CASE 
            WHEN "status" IN ('WON', 'CASHED_OUT') AND "winAmount" IS NOT NULL AND "winAmount" > 0 THEN "winAmount" - "betAmount"
            ELSE 0 - "betAmount"
          END as "netAmount",
          "createdAt",
          COALESCE("winAmount", 0) as "payout"
        FROM "MinesweeperGame"
        WHERE "userId" = ${userId} AND "status" IN ('WON', 'LOST', 'CASHED_OUT')
        
        UNION ALL
        
        -- PLINKO ИГРЫ
        SELECT 
          'PLINKO' as "gameType",
          ${userId} as "userId",
          "betAmount",
          COALESCE("winAmount", 0) - "betAmount" as "netAmount",
          "createdAt",
          COALESCE("winAmount", 0) as "payout"
        FROM "PlinkoBet"
        WHERE "userId" = ${userId}
        
        UNION ALL
        
        -- COINFLIP ИГРЫ
        SELECT 
          'COINFLIP' as "gameType",
          ${userId} as "userId",
          "betAmount",
          COALESCE("winAmount", 0) - "betAmount" as "netAmount",
          "createdAt",
          COALESCE("winAmount", 0) as "payout"
        FROM "CoinFlipBet"
        WHERE "userId" = ${userId}
        
        UNION ALL
        
        -- ОБЫЧНЫЕ СТАВКИ (Slot, Roulette, Blackjack)
        SELECT 
          LOWER("gameType"::text) as "gameType",
          "userId",
          "betAmount",
          "netAmount",
          "createdAt",
          "payoutAmount" as "payout"
        FROM "Bet"
        WHERE "userId" = ${userId}
        
        ORDER BY "createdAt" DESC
      `;

      } catch (err) {
      logger.error('USER', 'Error fetching games', { userId, error: err.message });
      allGames = [];
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 3: ПОДСЧЁТ СТАТИСТИКИ (ОБЩАЯ И ПО ИГРАМ)
    // ════════════════════════════════════════════════════════════════════════════

    const totalGames = allGames.length;
    let totalWagered = 0;
    let totalScore = 0;
    let winningBets = 0;
    let largestWin = null;
    let largestWinAmount = 0;

    // ✅ ДИНАМИЧЕСКАЯ СТАТИСТИКА ПО ИГРАМ (только количество игр и максимальный выигрыш)
    const gameStats = {};

    for (const game of allGames) {
      const betAmount = toNumber(game.betAmount);
      const netAmount = toNumber(game.netAmount);
      const gameType = (game.gameType || 'UNKNOWN').toUpperCase();
      const payout = toNumber(game.payout || 0);

      // Общая статистика
      totalWagered += betAmount;
      totalScore += netAmount;

      if (netAmount > 0) {
        winningBets++;
        if (netAmount > largestWinAmount) {
          largestWinAmount = netAmount;
          largestWin = {
            amount: netAmount,
            gameType: game.gameType || 'unknown',
            date: game.createdAt?.toISOString() || new Date().toISOString(),
          };
        }
      }

      // Статистика по игре (только количество игр и максимальный выигрыш)
      if (!gameStats[gameType]) {
        gameStats[gameType] = {
          gameType,
          totalGames: 0,
          largestWin: 0,
        };
      }

      const stats = gameStats[gameType];
      stats.totalGames++;
      
      // Обновляем максимальный выигрыш (используем payout для выигранных игр)
      if (payout > 0 && payout > stats.largestWin) {
        stats.largestWin = payout;
      }
    }

    // Округляем значения
    Object.values(gameStats).forEach(stats => {
      stats.largestWin = Math.round(stats.largestWin * 100) / 100;
    });

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 4: РАСЧЁТЫ МЕТРИК
    // ════════════════════════════════════════════════════════════════════════════

    const level = Math.max(1, Math.floor(totalGames / 10) + 1);
    const vipRank = calculateVipRank(totalGames);
    const vipLevel = getVipName(vipRank);
    const winRate = totalGames > 0 ? Math.round((winningBets / totalGames) * 100) : 0;
    const avgBetSize = totalGames > 0 ? totalWagered / totalGames : 0;
    const daysActive = Math.max(
      1,
      Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    const gamesPerDay = totalGames > 0 ? Math.round(totalGames / daysActive) : 0;
    const roi = totalWagered > 0 ? ((totalScore / totalWagered) * 100) : 0;

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 5: ФОРМИРОВАНИЕ ОТВЕТА
    // ════════════════════════════════════════════════════════════════════════════

    const userData = {
      id: user.id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      isAdmin: user.isAdmin || false,
      level,
      vipLevel,
      vipRank,
      totalGames, // ✅ ПРАВИЛЬНОЕ ЗНАЧЕНИЕ (из UNION)
      totalScore: Math.round(totalScore * 100) / 100,
      totalWagered: Math.round(totalWagered * 100) / 100,
      winningBets,
      winRate,
      roi: Math.round(roi * 100) / 100,
      createdAt: user.createdAt.toISOString(),
      daysActive,
      gamesPerDay,
      avgBetSize: Math.round(avgBetSize * 100) / 100,
      netProfit: Math.round(totalScore * 100) / 100,
      largestWin: largestWin ? {
        amount: Math.round(largestWin.amount * 100) / 100,
        gameType: largestWin.gameType,
        date: largestWin.date,
      } : null,
      referrerId: user.referredById,
      // ✅ ДИНАМИЧЕСКАЯ СТАТИСТИКА ПО ИГРАМ
      gameStats: Object.values(gameStats),
    };

    logger.info('USER', 'Profile fetched successfully', {
      userId,
      level,
      vipRank,
      totalGames,
      largestWin: largestWin?.amount,
    });

    return res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    logger.error('USER', 'Error fetching user profile', {
      userId,
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 📊 МАРШРУТ: GET /stats (АНАЛОГИЧНО С UNION)
// ════════════════════════════════════════════════════════════════════════════════

router.get('/stats', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // ✅ UNION запрос для ВСЕ игр
    let allGames = [];
    try {
      allGames = await prisma.$queryRaw`
        SELECT 
          'CRASH' as "gameType",
          ${userId} as "userId",
          "betAmount",
          (COALESCE("exitMultiplier", 0) - 1) * "betAmount" as "netAmount",
          "createdAt"
        FROM "CrashBet"
        WHERE "userId" = ${userId}
        
        UNION ALL
        
        SELECT 
          'MINESWEEPER' as "gameType",
          ${userId} as "userId",
          "betAmount",
          COALESCE("winAmount", 0) - "betAmount" as "netAmount",
          "createdAt"
        FROM "MinesweeperBet"
        WHERE "userId" = ${userId}
        
        UNION ALL
        
        SELECT 
          LOWER("gameType"::text) as "gameType",
          "userId",
          "betAmount",
          "netAmount",
          "createdAt"
        FROM "Bet"
        WHERE "userId" = ${userId}
      `;
    } catch (err) {
      allGames = [];
    }

    const totalGames = allGames.length;
    let totalScore = 0;
    let totalWagered = 0;
    let winCount = 0;

    for (const game of allGames) {
      const betAmount = toNumber(game.betAmount);
      const netAmount = toNumber(game.netAmount);

      totalWagered += betAmount;
      totalScore += netAmount;

      if (netAmount > 0) {
        winCount++;
      }
    }

    const lossCount = totalGames - winCount;

    const stats = {
      userId,
      username: user.username,
      totalGames,
      winCount,
      lossCount,
      winRate: totalGames > 0 ? Math.round((winCount / totalGames) * 100) : 0,
      totalScore: Math.round(totalScore * 100) / 100,
      totalWagered: Math.round(totalWagered * 100) / 100,
      avgBetSize: totalGames > 0 ? Math.round((totalWagered / totalGames) * 100) / 100 : 0,
      roi: totalWagered > 0 ? ((totalScore / totalWagered) * 100) : 0,
      level: Math.max(1, Math.floor(totalGames / 10) + 1),
      vipRank: calculateVipRank(totalGames),
      vipLevel: getVipName(calculateVipRank(totalGames)),
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('USER', 'Error fetching stats', { userId, error: error.message });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

module.exports = router;

