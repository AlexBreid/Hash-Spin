/**
 * ✅ ОБНОВЛЕННЫЙ userRoutes.js
 * 
 * ИСПРАВЛЕНИЯ:
 * 1. ✅ Правильный расчёт VIP ранга по количеству игр
 * 2. ✅ Динамический расчёт уровня, win rate, статистики
 * 3. ✅ Безопасное преобразование Decimal → number
 * 4. ✅ Добавлена информация о днях активности
 * 5. ✅ Улучшена логика расчётов
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════════════════════
// 🎯 ФУНКЦИЯ: ОПРЕДЕЛИТЬ VIP РАНГ ПО КОЛИЧЕСТВУ ИГР
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Определить VIP ранг на основе количества сыгранных игр
 * 
 * 🥉 Бронза: 0-49 игр
 * 🥈 Серебро: 50-149 игр
 * 🥇 Золото: 150-499 игр
 * 💎 Платина: 500-1499 игр
 * ✨ Бриллиант: 1500+ игр
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
// 📊 ГЛАВНЫЙ МАРШРУТ: GET /profile
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Получить полный профиль пользователя с расширенной статистикой
 */
router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    logger.info('USER', 'Fetching user profile', { userId });

    // ✅ ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА ВСЕХ ДАННЫХ
    const [user, totalGames, totalScoreAggregate, betDetails] = await Promise.all([
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

      // Количество всех ставок (игр)
      prisma.bet.count({ where: { userId } }),

      // Сумма чистого выигрыша (netAmount)
      prisma.bet.aggregate({
        _sum: { netAmount: true },
        where: { userId },
      }),

      // Детали ставок для расчёта статистики
      prisma.bet.aggregate({
        _sum: { betAmount: true, payoutAmount: true },
        _count: true,
        where: { userId },
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

    // 🎮 Уровень (1 уровень за 10 игр)
    const level = Math.max(1, Math.floor(totalGames / 10) + 1);

    // 🥇 VIP Ранг (динамический на основе количества игр)
    const vipRank = calculateVipRank(totalGames);
    const vipLevel = getVipName(vipRank);

    // 📈 Win Rate (процент выигранных ставок)
    let winRate = 0;
    if (totalGames > 0) {
      const winningBets = await prisma.bet.count({
        where: {
          userId,
          netAmount: { gt: 0 }, // netAmount > 0 = выигрыш
        },
      });
      winRate = Math.round((winningBets / totalGames) * 100);
    }

    // 💰 Средняя ставка
    const avgBetSize = totalGames > 0 ? totalWagered / totalGames : 0;

    // 📅 Дни активности
    const daysActive = Math.max(
      1,
      Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );

    // 🎯 Игр в день
    const gamesPerDay = totalGames > 0 ? Math.round(totalGames / daysActive) : 0;

    // 💵 ROI (Return on Investment)
    const roi = totalWagered > 0 ? ((totalScore / totalWagered) * 100).toFixed(2) : '0.00';

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
      vipLevel, // Например: "Золото"
      vipRank, // Например: "gold"

      // 📊 Статистика игр
      totalGames,
      totalScore: Math.round(totalScore * 100) / 100, // Округление до 2 знаков
      totalWagered: Math.round(totalWagered * 100) / 100,
      totalPayouts: Math.round(totalPayouts * 100) / 100,

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

      // 🔗 Реферальные данные
      referrerId: user.referrerId,
    };

    logger.info('USER', 'Profile fetched successfully', {
      userId,
      level,
      vipRank,
      totalGames,
      winRate: `${winRate}%`,
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // ✅ ОТПРАВКА ОТВЕТА
    // ═══════════════════════════════════════════════════════════════════════════════

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
// 📊 ДОПОЛНИТЕЛЬНЫЙ МАРШРУТ: GET /stats
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Получить расширенную статистику пользователя
 */
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