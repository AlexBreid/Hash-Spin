/**
 * ✅ ИСПРАВЛЕННЫЙ userRoutes.js (v3)
 * 
 * ИСПРАВЛЕНИЯ:
 * 1. ✅ Безопасная обработка ошибок при запросах к БД
 * 2. ✅ Проверка существования данных перед обработкой
 * 3. ✅ Правильное преобразование Decimal
 * 4. ✅ Логирование ошибок для debug
 * 5. ✅ Default значения если данных нет
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════════════════════
// 🔧 УТИЛИТЫ ДЛЯ ПРЕОБРАЗОВАНИЯ
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Безопасно преобразует Decimal в number
 */
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  if (typeof value === 'object' && value.toString) {
    return parseFloat(value.toString());
  }
  return 0;
}

/**
 * Определить VIP ранг по количеству игр
 */
function calculateVipRank(totalGames) {
  if (totalGames >= 1500) return 'diamond';
  if (totalGames >= 500) return 'platinum';
  if (totalGames >= 150) return 'gold';
  if (totalGames >= 50) return 'silver';
  return 'bronze';
}

/**
 * Получить название VIP ранга
 */
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
// 📊 ГЛАВНЫЙ МАРШРУТ: GET /profile (ИСПРАВЛЕННЫЙ)
// ════════════════════════════════════════════════════════════════════════════════

router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    logger.info('USER', 'Fetching user profile with extended stats', { userId });

    // ✅ ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА ВСЕХ ДАННЫХ С ОБРАБОТКОЙ ОШИБОК
    const results = await Promise.allSettled([
      // 1. Пользователь
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          createdAt: true,
          referrerId: true,
        },
      }),

      // 2. Количество всех ставок
      prisma.bet.count({ where: { userId } }),

      // 3. Сумма чистого выигрыша
      prisma.bet.aggregate({
        _sum: { netAmount: true },
        where: { userId },
      }),

      // 4. Детали ставок
      prisma.bet.aggregate({
        _sum: { betAmount: true, payoutAmount: true },
        _count: true,
        where: { userId },
      }),

      // 5. Статистика по типам игр
      prisma.bet.groupBy({
        by: ['gameType'],
        where: { userId },
        _count: true,
        _sum: { netAmount: true, betAmount: true },
      }),

      // 6. Самый большой выигрыш
      prisma.bet.findFirst({
        where: { userId, netAmount: { gt: 0 } },
        orderBy: { netAmount: 'desc' },
        select: { netAmount: true, gameType: true, createdAt: true },
      }),

      // 7. Количество выигрышей
      prisma.bet.count({
        where: { userId, netAmount: { gt: 0 } },
      }),
    ]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // ✅ ПРОВЕРКА РЕЗУЛЬТАТОВ
    // ═══════════════════════════════════════════════════════════════════════════════

    const [userResult, gamesResult, scoreResult, betDetailsResult, gameStatsResult, largestWinResult, winningBetsResult] = results;

    // Проверка каждого результата
    if (userResult.status === 'rejected') {
      logger.error('USER', 'Failed to fetch user', { userId, error: userResult.reason?.message });
      return res.status(500).json({ success: false, error: 'Failed to fetch user data' });
    }

    const user = userResult.value;
    if (!user) {
      logger.warn('USER', 'User not found', { userId });
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Безопасное извлечение данных
    const totalGames = gamesResult.status === 'fulfilled' ? gamesResult.value : 0;
    const totalScore = scoreResult.status === 'fulfilled' ? toNumber(scoreResult.value._sum.netAmount) : 0;
    const betDetails = betDetailsResult.status === 'fulfilled' ? betDetailsResult.value : { _sum: {}, _count: 0 };
    const gameStats = gameStatsResult.status === 'fulfilled' ? gameStatsResult.value : [];
    const largestWin = largestWinResult.status === 'fulfilled' ? largestWinResult.value : null;
    const winningBets = winningBetsResult.status === 'fulfilled' ? winningBetsResult.value : 0;

    // ═══════════════════════════════════════════════════════════════════════════════
    // ✅ ПРЕОБРАЗОВАНИЕ И РАСЧЁТЫ
    // ═══════════════════════════════════════════════════════════════════════════════

    const totalWagered = toNumber(betDetails._sum?.betAmount) || 0;
    const totalPayouts = toNumber(betDetails._sum?.payoutAmount) || 0;

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

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎮 СТАТИСТИКА ПО ТИПАМ ИГР
    // ═══════════════════════════════════════════════════════════════════════════════

    const gameStatsMap = {};
    if (Array.isArray(gameStats) && gameStats.length > 0) {
      gameStats.forEach((stat) => {
        const netAmount = toNumber(stat._sum?.netAmount) || 0;
        const betAmount = toNumber(stat._sum?.betAmount) || 0;
        const count = stat._count || 0;

        gameStatsMap[stat.gameType?.toLowerCase() || 'unknown'] = {
          count,
          totalBet: Math.round(betAmount * 100) / 100,
          totalProfit: Math.round(netAmount * 100) / 100,
          avgProfit: count > 0 ? Math.round((netAmount / count) * 100) / 100 : 0,
        };
      });
    }

    // 🏆 САМЫЙ БОЛЬШОЙ ВЫИГРЫШ
    const largestWinData = largestWin
      ? {
          amount: Math.round(toNumber(largestWin.netAmount) * 100) / 100,
          gameType: largestWin.gameType || 'unknown',
          date: largestWin.createdAt.toISOString(),
        }
      : null;

    // ═══════════════════════════════════════════════════════════════════════════════
    // ✅ ФОРМИРОВАНИЕ ОТВЕТА
    // ═══════════════════════════════════════════════════════════════════════════════

    const userData = {
      // Основная информация
      id: user.id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,

      // 🎮 Уровень и VIP
      level,
      vipLevel,
      vipRank,

      // 📊 Статистика игр
      totalGames,
      totalScore: Math.round(totalScore * 100) / 100,
      totalWagered: Math.round(totalWagered * 100) / 100,
      totalPayouts: Math.round(totalPayouts * 100) / 100,
      winningBets,

      // 📈 Процентные показатели
      winRate,
      roi: Math.round(roi * 100) / 100,

      // 📅 Временные данные
      createdAt: user.createdAt.toISOString(),
      daysActive,
      gamesPerDay,

      // 💰 Финансовые метрики
      avgBetSize: Math.round(avgBetSize * 100) / 100,
      netProfit: Math.round(totalScore * 100) / 100,

      // 🏆 Лучший результат
      largestWin: largestWinData,

      // 🎮 Статистика по типам игр
      gameStats: gameStatsMap,

      // 🔗 Реферальные данные
      referrerId: user.referrerId,
    };

    logger.info('USER', 'Profile fetched successfully', {
      userId,
      level,
      vipRank,
      totalGames,
      largestWin: largestWinData?.amount,
    });

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    logger.error('USER', 'Error fetching user profile', {
      userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 📊 МАРШРУТ: GET /stats (ДЕТАЛЬНАЯ СТАТИСТИКА)
// ════════════════════════════════════════════════════════════════════════════════

router.get('/stats', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    logger.info('USER', 'Fetching user stats', { userId });

    const results = await Promise.allSettled([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.bet.count({ where: { userId } }),
      prisma.bet.count({ where: { userId, netAmount: { gt: 0 } } }),
      prisma.bet.count({ where: { userId, netAmount: { lt: 0 } } }),
      prisma.bet.aggregate({ _sum: { netAmount: true }, where: { userId } }),
      prisma.bet.aggregate({ _sum: { betAmount: true }, where: { userId } }),
      prisma.bet.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.bet.groupBy({
        by: ['gameType'],
        where: { userId },
        _count: true,
        _sum: { netAmount: true, betAmount: true },
      }),
      prisma.bet.findFirst({
        where: { userId, netAmount: { gt: 0 } },
        orderBy: { netAmount: 'desc' },
        select: { netAmount: true, gameType: true, createdAt: true },
      }),
      prisma.bet.findFirst({
        where: { userId, netAmount: { lt: 0 } },
        orderBy: { netAmount: 'asc' },
        select: { netAmount: true, gameType: true, createdAt: true },
      }),
    ]);

    const [userResult, totalGamesResult, winCountResult, lossCountResult, totalScoreResult, totalWageredResult, lastGameResult, gameTypeStatsResult, largestWinResult, largestLossResult] = results;

    if (userResult.status === 'rejected') {
      return res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }

    const user = userResult.value;
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Безопасное извлечение значений
    const totalGames = totalGamesResult.status === 'fulfilled' ? totalGamesResult.value : 0;
    const winCount = winCountResult.status === 'fulfilled' ? winCountResult.value : 0;
    const lossCount = lossCountResult.status === 'fulfilled' ? lossCountResult.value : 0;
    const totalScoreAmount = totalScoreResult.status === 'fulfilled' ? toNumber(totalScoreResult.value._sum?.netAmount) : 0;
    const totalWageredAmount = totalWageredResult.status === 'fulfilled' ? toNumber(totalWageredResult.value._sum?.betAmount) : 0;
    const lastGameDate = lastGameResult.status === 'fulfilled' ? lastGameResult.value : null;
    const gameTypeStats = gameTypeStatsResult.status === 'fulfilled' ? gameTypeStatsResult.value : [];
    const largestWin = largestWinResult.status === 'fulfilled' ? largestWinResult.value : null;
    const largestLoss = largestLossResult.status === 'fulfilled' ? largestLossResult.value : null;

    // 🎮 Статистика по игровым типам
    const gameTypeData = {};
    if (Array.isArray(gameTypeStats)) {
      gameTypeStats.forEach((stat) => {
        const netAmount = toNumber(stat._sum?.netAmount) || 0;
        const betAmount = toNumber(stat._sum?.betAmount) || 0;

        gameTypeData[stat.gameType?.toLowerCase() || 'unknown'] = {
          games: stat._count || 0,
          totalBet: Math.round(betAmount * 100) / 100,
          totalProfit: Math.round(netAmount * 100) / 100,
          avgBet: stat._count > 0 ? Math.round((betAmount / stat._count) * 100) / 100 : 0,
        };
      });
    }

    const stats = {
      userId,
      username: user.username,
      totalGames,
      winCount,
      lossCount,
      winRate: totalGames > 0 ? Math.round((winCount / totalGames) * 100) : 0,
      totalScore: Math.round(totalScoreAmount * 100) / 100,
      totalWagered: Math.round(totalWageredAmount * 100) / 100,
      avgBetSize: totalGames > 0 ? Math.round((totalWageredAmount / totalGames) * 100) / 100 : 0,
      roi: totalWageredAmount > 0 ? ((totalScoreAmount / totalWageredAmount) * 100) : 0,
      lastGameAt: lastGameDate ? lastGameDate.createdAt.toISOString() : null,
      level: Math.max(1, Math.floor(totalGames / 10) + 1),
      vipRank: calculateVipRank(totalGames),
      vipLevel: getVipName(calculateVipRank(totalGames)),

      // 🏆 Экстремальные значения
      largestWin: largestWin
        ? {
            amount: Math.round(toNumber(largestWin.netAmount) * 100) / 100,
            gameType: largestWin.gameType || 'unknown',
          }
        : null,
      largestLoss: largestLoss
        ? {
            amount: Math.round(toNumber(largestLoss.netAmount) * 100) / 100,
            gameType: largestLoss.gameType || 'unknown',
          }
        : null,

      // 🎮 По типам игр
      gameTypeStats: gameTypeData,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('USER', 'Error fetching user stats', { userId, error: error.message });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;