/**
 * ✅ ИСПРАВЛЕННЫЙ userRoutes.js (v4) - FINAL FIX
 * 
 * ИСПРАВЛЕНИЯ:
 * 1. ✅ Упрощённый синтаксис (без groupBy)
 * 2. ✅ Прямые Prisma запросы без агрегации
 * 3. ✅ Полное логирование каждого шага
 * 4. ✅ Обработка ошибок на каждом этапе
 * 5. ✅ Возврат полной информации об ошибке
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
// 📊 ГЛАВНЫЙ МАРШРУТ: GET /profile (ПРОСТОЙ И НАДЁЖНЫЙ)
// ════════════════════════════════════════════════════════════════════════════════

router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log(`[PROFILE] 🔍 Начинаю загрузку профиля для userId: ${userId}`);
    logger.info('USER', 'Starting profile fetch', { userId });

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 1: Загрузка пользователя
    // ════════════════════════════════════════════════════════════════════════════
    
    console.log(`[PROFILE] 📋 Этап 1: Загружаю пользователя...`);
    const user = await prisma.user.findUnique({
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
    // ЭТАП 2: Загрузка всех ставок
    // ════════════════════════════════════════════════════════════════════════════

    console.log(`[PROFILE] 📋 Этап 2: Загружаю все ставки...`);
    let allBets = [];
    try {
      allBets = await prisma.bet.findMany({
        where: { userId },
        select: {
          gameType: true,
          betAmount: true,
          payoutAmount: true,
          netAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10000, // Лимит для безопасности
      });
      console.log(`[PROFILE] ✅ Загружено ${allBets.length} ставок`);
    } catch (err) {
      console.error(`[PROFILE] ⚠️ Ошибка при загрузке ставок:`, err.message);
      allBets = [];
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 3: Расчёты статистики из загруженных ставок
    // ════════════════════════════════════════════════════════════════════════════

    console.log(`[PROFILE] 📋 Этап 3: Рассчитываю статистику...`);

    // Базовые счётчики
    const totalGames = allBets.length;
    let totalScore = 0;
    let totalWagered = 0;
    let totalPayouts = 0;
    let winningBets = 0;
    const gameStatsMap = {};
    let largestWinBet = null;

    // Обработка каждой ставки
    for (const bet of allBets) {
      const betAmount = toNumber(bet.betAmount);
      const payoutAmount = toNumber(bet.payoutAmount);
      const netAmount = toNumber(bet.netAmount);
      const gameType = (bet.gameType || 'unknown').toLowerCase();

      // Общие суммы
      totalWagered += betAmount;
      totalPayouts += payoutAmount;
      totalScore += netAmount;

      // Считаем выигрыши
      if (netAmount > 0) {
        winningBets++;
      }

      // Проверяем самый большой выигрыш
      if (netAmount > 0) {
        if (!largestWinBet || netAmount > toNumber(largestWinBet.netAmount)) {
          largestWinBet = bet;
        }
      }

      // Статистика по типам игр
      if (!gameStatsMap[gameType]) {
        gameStatsMap[gameType] = {
          count: 0,
          totalBet: 0,
          totalProfit: 0,
          games: [],
        };
      }

      gameStatsMap[gameType].count++;
      gameStatsMap[gameType].totalBet += betAmount;
      gameStatsMap[gameType].totalProfit += netAmount;
      gameStatsMap[gameType].games.push(netAmount);
    }

    console.log(`[PROFILE] ✅ Статистика рассчитана:`);
    console.log(`  - Всего игр: ${totalGames}`);
    console.log(`  - Выигрышей: ${winningBets}`);
    console.log(`  - Всего ставок: ${totalWagered.toFixed(2)}`);
    console.log(`  - Общий счёт: ${totalScore.toFixed(2)}`);

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 4: Расчёт процентов и метрик
    // ════════════════════════════════════════════════════════════════════════════

    console.log(`[PROFILE] 📋 Этап 4: Рассчитываю метрики...`);

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

    console.log(`[PROFILE] ✅ Метрики рассчитаны:`);
    console.log(`  - Win Rate: ${winRate}%`);
    console.log(`  - ROI: ${roi.toFixed(2)}%`);
    console.log(`  - Уровень: ${level}`);
    console.log(`  - VIP: ${vipLevel}`);

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 5: Форматирование статистики по играм
    // ════════════════════════════════════════════════════════════════════════════

    console.log(`[PROFILE] 📋 Этап 5: Форматирую статистику по играм...`);

    const gameStats = {};
    Object.entries(gameStatsMap).forEach(([gameType, stats]) => {
      const avgProfit = stats.count > 0 ? stats.totalProfit / stats.count : 0;
      gameStats[gameType] = {
        count: stats.count,
        totalBet: Math.round(stats.totalBet * 100) / 100,
        totalProfit: Math.round(stats.totalProfit * 100) / 100,
        avgProfit: Math.round(avgProfit * 100) / 100,
      };
    });

    console.log(`[PROFILE] ✅ Статистика по ${Object.keys(gameStats).length} типам игр подготовлена`);

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 6: Лучший результат
    // ════════════════════════════════════════════════════════════════════════════

    console.log(`[PROFILE] 📋 Этап 6: Подготавливаю лучший результат...`);

    const largestWinData = largestWinBet
      ? {
          amount: Math.round(toNumber(largestWinBet.netAmount) * 100) / 100,
          gameType: largestWinBet.gameType || 'unknown',
          date: largestWinBet.createdAt.toISOString(),
        }
      : null;

    if (largestWinData) {
      console.log(`[PROFILE] ✅ Самый большой выигрыш: ${largestWinData.amount} USDT (${largestWinData.gameType})`);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ЭТАП 7: Формирование ответа
    // ════════════════════════════════════════════════════════════════════════════

    console.log(`[PROFILE] 📋 Этап 7: Формирую ответ...`);

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
      referrerId: user.referrerId,
    };

    console.log(`[PROFILE] ✅ Ответ сформирован`);

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
    console.error(`[PROFILE] ❌ КРИТИЧЕСКАЯ ОШИБКА:`, error);
    console.error(`[PROFILE] Сообщение:`, error.message);
    console.error(`[PROFILE] Stack:`, error.stack);

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
// 📊 ПРОСТОЙ МАРШРУТ: GET /stats
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

    // Загружаем все ставки
    const bets = await prisma.bet.findMany({
      where: { userId },
      select: { netAmount: true, betAmount: true, gameType: true },
      take: 10000,
    });

    const totalGames = bets.length;
    let totalScore = 0;
    let totalWagered = 0;
    let winCount = 0;
    let lossCount = 0;
    let largestWin = null;
    let largestLoss = null;

    for (const bet of bets) {
      const netAmount = toNumber(bet.netAmount);
      const betAmount = toNumber(bet.betAmount);

      totalScore += netAmount;
      totalWagered += betAmount;

      if (netAmount > 0) {
        winCount++;
        if (!largestWin || netAmount > toNumber(largestWin.netAmount)) {
          largestWin = bet;
        }
      } else if (netAmount < 0) {
        lossCount++;
        if (!largestLoss || netAmount < toNumber(largestLoss.netAmount)) {
          largestLoss = bet;
        }
      }
    }

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