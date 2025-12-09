/**
 * ✅ ИСПРАВЛЕННЫЙ userRoutes.js (v5) - БЕЗ ОШИБОК
 * 
 * ИСПРАВЛЕНИЯ:
 * 1. ✅ Правильный синтаксис console.log
 * 2. ✅ Используем правильное имя поля: referredById (не referrerId)
 * 3. ✅ Оптимизация через Prisma агрегацию
 * 4. ✅ Raw SQL для статистики по типам игр
 * 5. ✅ Полное логирование
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
// 📊 ГЛАВНЫЙ МАРШРУТ: GET /profile (ПРАВИЛЬНЫЙ)
// ════════════════════════════════════════════════════════════════════════════════

router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log(`[PROFILE] 🔍 Начинаю загрузку профиля для userId: ${userId}`);
    logger.info('USER', 'Starting profile fetch', { userId });

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 1: Загрузка пользователя
    // ════════════════════════════════════════════════════════════════════════════
    
    console.log('[PROFILE] 📋 Этап 1: Загружаю пользователя...');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        createdAt: true,
        referredById: true, // ✅ ИСПРАВЛЕНО: правильное имя поля
      },
    });

    if (!user) {
      console.log(`[PROFILE] ❌ Пользователь не найден: ${userId}`);
      logger.warn('USER', 'User not found', { userId });
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    console.log(`[PROFILE] ✅ Пользователь найден: ${user.username}`);

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 2: Получить СТАТИСТИКУ через агрегацию БД
    // ════════════════════════════════════════════════════════════════════════════

    console.log('[PROFILE] 📋 Этап 2: Загружаю статистику из БД...');

    const betStats = await prisma.bet.aggregate({
      where: { userId },
      _count: true,
      _sum: {
        betAmount: true,
        payoutAmount: true,
        netAmount: true,
      },
    });

    const totalGames = betStats._count || 0;
    const totalWagered = toNumber(betStats._sum?.betAmount) || 0;
    const totalPayouts = toNumber(betStats._sum?.payoutAmount) || 0;
    const totalScore = toNumber(betStats._sum?.netAmount) || 0;

    console.log('[PROFILE] ✅ Базовая статистика загружена:');
    console.log(`  - Всего игр: ${totalGames}`);
    console.log(`  - Всего ставок: ${totalWagered.toFixed(2)}`);
    console.log(`  - Общий счёт: ${totalScore.toFixed(2)}`);

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 3: Считаем выигрыши
    // ════════════════════════════════════════════════════════════════════════════

    console.log('[PROFILE] 📋 Этап 3: Считаю выигрыши...');
    
    const winningBets = await prisma.bet.count({
      where: {
        userId,
        netAmount: { gt: 0 }
      }
    });

    console.log(`[PROFILE] ✅ Выигрышей: ${winningBets}`);

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 4: Найти самый большой выигрыш
    // ════════════════════════════════════════════════════════════════════════════

    console.log('[PROFILE] 📋 Этап 4: Ищу самый большой выигрыш...');

    const largestWinBet = await prisma.bet.findFirst({
      where: {
        userId,
        netAmount: { gt: 0 }
      },
      orderBy: { netAmount: 'desc' },
      select: {
        netAmount: true,
        gameType: true,
        createdAt: true,
      }
    });

    console.log('[PROFILE] ✅ Самый большой выигрыш найден');

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 5: Получить статистику по типам игр через SQL
    // ════════════════════════════════════════════════════════════════════════════

    console.log('[PROFILE] 📋 Этап 5: Загружаю статистику по типам игр...');

    let gameTypeStatsRaw = [];
    try {
      gameTypeStatsRaw = await prisma.$queryRaw`
        SELECT 
          "gameType",
          COUNT(*) as count,
          SUM("betAmount") as totalBet,
          SUM("netAmount") as totalProfit
        FROM "Bet"
        WHERE "userId" = ${userId}
        GROUP BY "gameType"
      `;
      console.log('[PROFILE] ✅ Статистика по типам игр загружена');
    } catch (err) {
      console.warn('[PROFILE] ⚠️ Ошибка загрузки статистики по типам:', err.message);
      gameTypeStatsRaw = [];
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 6: Форматировать статистику по играм
    // ════════════════════════════════════════════════════════════════════════════

    console.log('[PROFILE] 📋 Этап 6: Форматирую статистику по играм...');

    const gameStats = {};
    if (Array.isArray(gameTypeStatsRaw)) {
      for (const stat of gameTypeStatsRaw) {
        const gameType = (stat.gameType || 'unknown').toLowerCase();
        const count = toNumber(stat.count) || 0;
        const totalBet = toNumber(stat.totalBet) || 0;
        const totalProfit = toNumber(stat.totalProfit) || 0;
        const avgProfit = count > 0 ? totalProfit / count : 0;

        gameStats[gameType] = {
          count,
          totalBet: Math.round(totalBet * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          avgProfit: Math.round(avgProfit * 100) / 100,
        };
      }
    }

    console.log(`[PROFILE] ✅ Статистика по ${Object.keys(gameStats).length} типам игр подготовлена`);

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 7: Расчёты метрик
    // ════════════════════════════════════════════════════════════════════════════

    console.log('[PROFILE] 📋 Этап 7: Рассчитываю метрики...');

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

    console.log('[PROFILE] ✅ Метрики рассчитаны:');
    console.log(`  - Win Rate: ${winRate}%`);
    console.log(`  - ROI: ${roi.toFixed(2)}%`);
    console.log(`  - Уровень: ${level}`);
    console.log(`  - VIP: ${vipLevel}`);

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 8: Лучший результат
    // ════════════════════════════════════════════════════════════════════════════

    console.log('[PROFILE] 📋 Этап 8: Подготавливаю лучший результат...');

    const largestWinData = largestWinBet
      ? {
          amount: Math.round(toNumber(largestWinBet.netAmount) * 100) / 100,
          gameType: largestWinBet.gameType || 'unknown',
          date: largestWinBet.createdAt.toISOString(),
        }
      : null;

    if (largestWinData) {
      console.log(`[PROFILE] ✅ Самый большой выигрыш: ${largestWinData.amount} USDT`);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 9: Формирование ответа
    // ════════════════════════════════════════════════════════════════════════════

    console.log('[PROFILE] 📋 Этап 9: Формирую ответ...');

    const userData = {
      id: user.id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      level,
      vipLevel,
      vipRank,
      totalGames,
      totalScore: Math.round(totalScore * 100) / 100,
      totalWagered: Math.round(totalWagered * 100) / 100,
      totalPayouts: Math.round(totalPayouts * 100) / 100,
      winningBets,
      winRate,
      roi: Math.round(roi * 100) / 100,
      createdAt: user.createdAt.toISOString(),
      daysActive,
      gamesPerDay,
      avgBetSize: Math.round(avgBetSize * 100) / 100,
      netProfit: Math.round(totalScore * 100) / 100,
      largestWin: largestWinData,
      gameStats,
      referrerId: user.referredById,
    };

    console.log('[PROFILE] ✅ Ответ сформирован');

    logger.info('USER', 'Profile fetched successfully', {
      userId,
      level,
      vipRank,
      totalGames,
      largestWin: largestWinData?.amount,
    });

    return res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error('[PROFILE] ❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    console.error('[PROFILE] Сообщение:', error.message);
    console.error('[PROFILE] Stack:', error.stack);

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
// 📊 МАРШРУТ: GET /stats
// ════════════════════════════════════════════════════════════════════════════════

router.get('/stats', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log(`[STATS] 🔍 Загружаю статистику для userId: ${userId}`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const betStats = await prisma.bet.aggregate({
      where: { userId },
      _count: true,
      _sum: {
        betAmount: true,
        netAmount: true,
      },
    });

    const totalGames = betStats._count || 0;
    const totalScore = toNumber(betStats._sum?.netAmount) || 0;
    const totalWagered = toNumber(betStats._sum?.betAmount) || 0;

    const winCount = await prisma.bet.count({
      where: { userId, netAmount: { gt: 0 } }
    });

    const lossCount = totalGames - winCount;

    const largestWin = await prisma.bet.findFirst({
      where: { userId, netAmount: { gt: 0 } },
      orderBy: { netAmount: 'desc' },
      select: { netAmount: true, gameType: true },
    });

    const largestLoss = await prisma.bet.findFirst({
      where: { userId, netAmount: { lt: 0 } },
      orderBy: { netAmount: 'asc' },
      select: { netAmount: true, gameType: true },
    });

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
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error(`[STATS] ❌ Ошибка:`, error.message);
    logger.error('USER', 'Error fetching stats', { userId, error: error.message });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

module.exports = router;