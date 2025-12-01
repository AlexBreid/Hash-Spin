// src/routes/leaderboardRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');

function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'this-week': {
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'this-month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'all-time':
      return new Date('2000-01-01');
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

// ====================================
// GET /api/v1/leaderboard — ТОП САМЫХ БОЛЬШИХ ВЫИГРЫШЕЙ В CRASH
// ====================================
router.get('/api/v1/leaderboard', async (req, res) => {
  try {
    const { period = 'all-time', game = 'crash', limit = 50 } = req.query;

    if (game !== 'crash') {
      return res.status(400).json({ success: false, error: 'Only "crash" game is supported for now' });
    }

    const startDate = getStartDate(period);

    const bigWins = await prisma.crashBet.findMany({
      where: {
        createdAt: { gte: startDate },
        result: 'won',
        winnings: { gt: '0' },
      },
      orderBy: { winnings: 'desc' },
      take: parseInt(limit, 10) || 50,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            photoUrl: true,
          },
        },
        token: {
          select: {
            symbol: true,
          },
        },
      },
    });

    const leaderboard = bigWins.map((bet, index) => ({
      id: bet.id.toString(),
      username: bet.user?.username || bet.user?.firstName || 'Anonymous',
      avatar: (bet.user?.username || bet.user?.firstName || 'A').substring(0, 2).toUpperCase(),
      score: parseFloat(bet.winnings.toString()),
      tokenSymbol: bet.token?.symbol || '???',
      gameType: 'crash',
      createdAt: bet.createdAt,
      rank: index + 1,
    }));

    res.json({
      success: true,
      data: { // ← КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ
        leaderboard,
        period,
        game,
        total: leaderboard.length,
      }
    });
  } catch (error) {
    console.error('❌ Error fetching crash big wins:', error);
    res.status(500).json({ success: false, error: 'Failed to load big wins' });
  }
});

// ====================================
// GET /api/v1/leaderboard/top3 — ТОП-3 В CRASH
// ====================================
router.get('/api/v1/leaderboard/top3', async (req, res) => {
  try {
    const { period = 'all-time' } = req.query;
    const startDate = getStartDate(period);

    const topWins = await prisma.crashBet.findMany({
      where: {
        createdAt: { gte: startDate },
        result: 'won',
        winnings: { gt: '0' },
      },
      orderBy: { winnings: 'desc' },
      take: 3,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            photoUrl: true,
          },
        },
        token: {
          select: {
            symbol: true,
          },
        },
      },
    });

    const topThree = topWins.map((bet, index) => ({
      id: bet.id.toString(),
      username: bet.user?.username || bet.user?.firstName || 'Anonymous',
      avatar: (bet.user?.username || bet.user?.firstName || 'A').substring(0, 2).toUpperCase(),
      score: parseFloat(bet.winnings.toString()),
      tokenSymbol: bet.token?.symbol || '???',
      createdAt: bet.createdAt,
      rank: index + 1,
    }));

    res.json({
      success: true,
      data: topThree // ← И ЭТО ИСПРАВЛЕНИЕ
    });
  } catch (error) {
    console.error('❌ Error fetching top 3 crash wins:', error);
    res.status(500).json({ success: false, error: 'Failed to load top wins' });
  }
});

module.exports = router;