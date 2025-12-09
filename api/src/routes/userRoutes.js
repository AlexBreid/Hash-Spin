/**
 * ✅ ОБНОВЛЕННЫЙ userRoutes.js С РАСШИРЕННОЙ СТАТИСТИКОЙ
 * 
 * ДОБАВЛЕНО:
 * 1. ✅ Запрос статистики по всем типам игр
 * 2. ✅ Самый большой выигрыш
 * 3. ✅ Количество выигрышей по типам игр
 * 4. ✅ Лучшая игра (максимальный выигрыш на одной ставке)
 * 5. ✅ Детальная статистика по игровым типам
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 ФУНКЦИЯ: ОПРЕДЕЛИТЬ VIP РАНГ ПО КОЛИЧЕСТВУ ИГР
// ════════════════════════════════════════════════════════════════════════════════

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
// 📊 ГЛАВНЫЙ МАРШРУТ: GET /profile (РАСШИРЕННЫЙ)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Получить полный профиль пользователя с расширенной статистикой
 */
router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    logger.info('USER', 'Fetching user profile with extended stats', { userId });

    // ✅ ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА ВСЕХ ДАННЫХ
    const [
      user,
      allBets,
      totalGames,
      totalScoreAggregate,
      betDetails,
      gameTypeStats,
      largestWin,
      winningBets,
    ] = await Promise.all([
      // Пользователь
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

      // Все ставки (для детальной обработки)
      prisma.bet.findMany({
        where: { userId },
        select: {
          gameType: true,
          betAmount: true,
          payoutAmount: true,
          netAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Количество всех ставок (игр)
      prisma.bet.count({ where: { userId } }),

      // Сумма чистого выигрыша
      prisma.bet.aggregate({
        _sum: { netAmount: true },
        where: { userId },
      }),

      // Детали ставок
      prisma.bet.aggregate({
        _sum: { betAmount: true, payoutAmount: true },
        _count: true,
        where: { userId },
      }),

      // Статистика по типам игр
      prisma.bet.groupBy({
        by: ['gameType'],
        where: { userId },
        _count: true,
        _sum: { netAmount: true, betAmount: true },
      }),

      // Самый большой выигрыш
      prisma.bet.findFirst({
        where: { userId, netAmount: { gt: 0 } },
        orderBy: { netAmount: 'desc' },
        select: { netAmount: true, gameType: true, createdAt: true },
      }),

      // Количество выигрышей
      prisma.bet.count({
        where: { userId, netAmount: { gt: 0 } },
      }),
    ]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // ✅ ПРОВЕРКА И ПРЕОБРАЗОВАНИЕ ДАННЫХ
    // ═══════════════════════════════════════════════════════════════════════════════

    if (!user) {
      logger.warn('USER', 'User not found', { userId });
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // ✅ БЕЗОПАСНОЕ ПРЕОБРАЗОВАНИЕ Decimal → number
    const totalScore = totalScoreAggregate._sum.netAmount
      ? parseFloat(totalScoreAggregate._sum.netAmount.toString())
      : 0;

    const totalWagered = betDetails._sum.betAmount
      ? parseFloat(betDetails._sum.betAmount.toString())
      : 0;

    const totalPayouts = betDetails._sum.payoutAmount
      ? parseFloat(betDetails._sum.payoutAmount.toString())
      : 0;

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 РАСЧЁТЫ СТАТИСТИКИ
    // ═══════════════════════════════════════════════════════════════════════════════

    const level = Math.max(1, Math.floor(totalGames / 10) + 1);
    const vipRank = calculateVipRank(totalGames);
    const vipLevel = getVipName(vipRank);

    let winRate = 0;
    if (totalGames > 0) {
      winRate = Math.round((winningBets / totalGames) * 100);
    }

    const avgBetSize = totalGames > 0 ? totalWagered / totalGames : 0;
    const daysActive = Math.max(
      1,
      Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    const gamesPerDay = totalGames > 0 ? Math.round(totalGames / daysActive) : 0;
    const roi = totalWagered > 0 ? ((totalScore / totalWagered) * 100).toFixed(2) : '0.00';

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎮 СТАТИСТИКА ПО ТИПАМ ИГР
    // ═══════════════════════════════════════════════════════════════════════════════

    const gameStats = {};
    gameTypeStats.forEach((stat) => {
      const netAmount = stat._sum.netAmount
        ? parseFloat(stat._sum.netAmount.toString())
        : 0;
      const betAmount = stat._sum.betAmount
        ? parseFloat(stat._sum.betAmount.toString())
        : 0;

      gameStats[stat.gameType.toLowerCase()] = {
        count: stat._count,
        totalBet: Math.round(betAmount * 100) / 100,
        totalProfit: Math.round(netAmount * 100) / 100,
        avgProfit: stat._count > 0 ? Math.round((netAmount / stat._count) * 100) / 100 : 0,
      };
    });

    // 🏆 САМЫЙ БОЛЬШОЙ ВЫИГРЫШ
    const largestWinAmount = largestWin
      ? parseFloat(largestWin.netAmount.toString())
      : 0;

    const largestWinData = largestWin
      ? {
          amount: Math.round(largestWinAmount * 100) / 100,
          gameType: largestWin.gameType,
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
      roi: parseFloat(roi),

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
      gameStats,

      // 🔗 Реферальные данные
      referrerId: user.referrerId,
    };

    logger.info('USER', 'Profile fetched successfully', {
      userId,
      level,
      vipRank,
      totalGames,
      largestWin: largestWinAmount,
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

    const [
      user,
      totalGames,
      winCount,
      lossCount,
      totalScore,
      totalWagered,
      lastGameDate,
      gameTypeStats,
      largestWin,
      largestLoss,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),

      prisma.bet.count({ where: { userId } }),

      prisma.bet.count({
        where: { userId, netAmount: { gt: 0 } },
      }),

      prisma.bet.count({
        where: { userId, netAmount: { lt: 0 } },
      }),

      prisma.bet.aggregate({
        _sum: { netAmount: true },
        where: { userId },
      }),

      prisma.bet.aggregate({
        _sum: { betAmount: true },
        where: { userId },
      }),

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

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const totalScoreAmount = totalScore._sum.netAmount
      ? parseFloat(totalScore._sum.netAmount.toString())
      : 0;

    const totalWageredAmount = totalWagered._sum.betAmount
      ? parseFloat(totalWagered._sum.betAmount.toString())
      : 0;

    // 🎮 Статистика по игровым типам
    const gameTypeData = {};
    gameTypeStats.forEach((stat) => {
      const netAmount = stat._sum.netAmount
        ? parseFloat(stat._sum.netAmount.toString())
        : 0;
      const betAmount = stat._sum.betAmount
        ? parseFloat(stat._sum.betAmount.toString())
        : 0;

      gameTypeData[stat.gameType.toLowerCase()] = {
        games: stat._count,
        totalBet: Math.round(betAmount * 100) / 100,
        totalProfit: Math.round(netAmount * 100) / 100,
        avgBet: Math.round((betAmount / stat._count) * 100) / 100,
      };
    });

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
      roi: totalWageredAmount > 0 ? ((totalScoreAmount / totalWageredAmount) * 100).toFixed(2) : '0.00',
      lastGameAt: lastGameDate ? lastGameDate.createdAt.toISOString() : null,
      level: Math.max(1, Math.floor(totalGames / 10) + 1),
      vipRank: calculateVipRank(totalGames),
      vipLevel: getVipName(calculateVipRank(totalGames)),
      
      // 🏆 Экстремальные значения
      largestWin: largestWin
        ? {
            amount: Math.round(parseFloat(largestWin.netAmount.toString()) * 100) / 100,
            gameType: largestWin.gameType,
          }
        : null,
      largestLoss: largestLoss
        ? {
            amount: Math.round(parseFloat(largestLoss.netAmount.toString()) * 100) / 100,
            gameType: largestLoss.gameType,
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

// ════════════════════════════════════════════════════════════════════════════════
// 🏆 МАРШРУТ: GET /leaderboard (ТОП ИГРОКИ)
// ════════════════════════════════════════════════════════════════════════════════

router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // ТОП ПО ВЫИГРЫШАМ
    const topWinners = await prisma.bet.groupBy({
      by: ['userId'],
      _sum: { netAmount: true },
      _count: true,
      orderBy: { _sum: { netAmount: 'desc' } },
      take: limit,
    });

    // ТОП ПО КОЛИЧЕСТВУ ИГР
    const topPlayers = await prisma.bet.groupBy({
      by: ['userId'],
      _count: true,
      orderBy: { _count: { _all: 'desc' } },
      take: limit,
    });

    // ТОП ПО WIN RATE
    const winRateData = await prisma.$queryRaw`
      SELECT 
        userId,
        COUNT(*) as total_games,
        COUNT(CASE WHEN netAmount > 0 THEN 1 END) as winning_games,
        ROUND(COUNT(CASE WHEN netAmount > 0 THEN 1 END)::numeric / COUNT(*) * 100) as win_rate
      FROM "Bet"
      GROUP BY userId
      HAVING COUNT(*) >= 10
      ORDER BY win_rate DESC
      LIMIT ${limit}
    `;

    res.json({
      success: true,
      data: {
        topWinners,
        topPlayers,
        topWinRate: winRateData,
      },
    });
  } catch (error) {
    logger.error('USER', 'Error fetching leaderboard', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;