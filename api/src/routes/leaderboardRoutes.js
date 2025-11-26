// src/routes/leaderboardRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');

// ====================================
// ПОЛУЧИТЬ ТАБЛИЦУ ЛИДЕРОВ
// ====================================
router.get('/api/v1/leaderboard', async (req, res) => {
  try {
    const { period = 'this-month', game = 'all-games', limit = 100 } = req.query;

    // Определяем дату для фильтрации
    let startDate = new Date();
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this-week':
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this-month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all-time':
        startDate = new Date('2000-01-01');
        break;
      default:
        startDate.setDate(1);
    }

    // Получаем топ игроков по сумме net-amount ставок
    const leaderboardData = await prisma.bet.groupBy({
      by: ['userId'],
      _sum: {
        netAmount: true,
      },
      _count: {
        id: true, // Количество ставок
      },
      where: {
        createdAt: {
          gte: startDate,
        },
        // Если нужно фильтровать по игре
        ...(game !== 'all-games' && { gameType: game.toUpperCase() }),
      },
      orderBy: {
        _sum: {
          netAmount: 'desc',
        },
      },
      take: parseInt(limit),
    });

    // Получаем информацию о пользователях
    const userIds = leaderboardData.map(entry => entry.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        photoUrl: true,
      },
    });

    // Объединяем данные
    const leaderboard = leaderboardData.map((entry, index) => {
      const user = users.find(u => u.id === entry.userId);
      const totalScore = entry._sum.netAmount ? parseFloat(entry._sum.netAmount.toString()) : 0;

      return {
        id: user?.id.toString() || '',
        username: user?.username || user?.firstName || 'Anonymous',
        avatar: (user?.username || user?.firstName || 'A').substring(0, 2).toUpperCase(),
        score: Math.max(0, totalScore), // Минимум 0
        games: 'Все игры',
        rank: index + 1,
        gamesCount: entry._count.id,
        photoUrl: user?.photoUrl || null,
      };
    });

    res.json({
      success: true,
      data: {
        leaderboard,
        period,
        game,
        total: leaderboard.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ====================================
// ПОЛУЧИТЬ ТОП-3 ИГРОКОВ
// ====================================
router.get('/api/v1/leaderboard/top3', async (req, res) => {
  try {
    const { period = 'this-month' } = req.query;

    // Определяем дату для фильтрации
    let startDate = new Date();
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this-week':
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this-month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all-time':
        startDate = new Date('2000-01-01');
        break;
      default:
        startDate.setDate(1);
    }

    // Получаем топ-3
    const topThree = await prisma.bet.groupBy({
      by: ['userId'],
      _sum: {
        netAmount: true,
      },
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        _sum: {
          netAmount: 'desc',
        },
      },
      take: 3,
    });

    const userIds = topThree.map(entry => entry.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        photoUrl: true,
      },
    });

    const topThreeData = topThree.map((entry, index) => {
      const user = users.find(u => u.id === entry.userId);
      const totalScore = entry._sum.netAmount ? parseFloat(entry._sum.netAmount.toString()) : 0;

      return {
        id: user?.id.toString() || '',
        username: user?.username || user?.firstName || 'Anonymous',
        avatar: (user?.username || user?.firstName || 'A').substring(0, 2).toUpperCase(),
        score: Math.max(0, totalScore),
        rank: index + 1,
        photoUrl: user?.photoUrl || null,
      };
    });

    res.json({
      success: true,
      data: topThreeData,
    });
  } catch (error) {
    console.error('❌ Error fetching top 3:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;