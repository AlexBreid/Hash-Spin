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
    const startDate = getStartDate(period);
    const limitNum = parseInt(limit, 10) || 50;

    let leaderboard = [];

    if (game === 'all-games') {
      // ВСЕ ИГРЫ - объединяем результаты из всех игр
      const [crashWins, minesweeperWins, plinkoGames] = await Promise.all([
        // CRASH
        prisma.crashBet.findMany({
          where: {
            createdAt: { gte: startDate },
            result: 'won',
            winnings: { gt: '0' },
          },
          orderBy: { winnings: 'desc' },
          take: limitNum * 2,
          include: {
            user: { select: { id: true, username: true, firstName: true, photoUrl: true } },
            token: { select: { symbol: true } },
          },
        }),
        // MINESWEEPER
        prisma.minesweeperGame.findMany({
          where: {
            createdAt: { gte: startDate },
            status: { in: ['WON', 'CASHED_OUT'] },
            winAmount: { not: null },
          },
          orderBy: { winAmount: 'desc' },
          take: limitNum * 2,
          include: {
            user: { select: { id: true, username: true, firstName: true, photoUrl: true } },
            token: { select: { symbol: true } },
          },
        }),
        // PLINKO
        prisma.plinkoGame.findMany({
          where: {
            createdAt: { gte: startDate },
            status: 'COMPLETED',
            OR: [
              { betAmount: { gte: '50' } },
              { multiplier: { gte: 5 } }
            ]
          },
          orderBy: { winAmount: 'desc' },
          take: limitNum * 2,
          include: {
            user: { select: { id: true, username: true, firstName: true, photoUrl: true } },
            token: { select: { symbol: true } },
          },
        }),
      ]);

      // Объединяем все игры
      const allWins = [
        ...crashWins.map(bet => ({
          id: `crash-${bet.id}`,
          username: bet.user?.username || bet.user?.firstName || 'Anonymous',
          avatar: (bet.user?.username || bet.user?.firstName || 'A').substring(0, 2).toUpperCase(),
          score: parseFloat(bet.winnings.toString()),
          tokenSymbol: bet.token?.symbol || '???',
          gameType: 'crash',
          createdAt: bet.createdAt,
        })),
        ...minesweeperWins.map(game => ({
          id: `minesweeper-${game.id}`,
          username: game.user?.username || game.user?.firstName || 'Anonymous',
          avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
          score: parseFloat(game.winAmount.toString()),
          tokenSymbol: game.token?.symbol || '???',
          gameType: 'minesweeper',
          createdAt: game.createdAt,
        })),
        ...plinkoGames
          .filter(game => parseFloat(game.winAmount.toString()) > parseFloat(game.betAmount.toString()))
          .map(game => ({
            id: `plinko-${game.id}`,
            username: game.user?.username || game.user?.firstName || 'Anonymous',
            avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score: parseFloat(game.winAmount.toString()),
            tokenSymbol: game.token?.symbol || '???',
            gameType: 'plinko',
            createdAt: game.createdAt,
          })),
      ];

      // Сортируем по score и берём top N
      leaderboard = allWins
        .sort((a, b) => b.score - a.score)
        .slice(0, limitNum)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));
    } else if (game === 'crash') {
      // CRASH GAME
      const bigWins = await prisma.crashBet.findMany({
        where: {
          createdAt: { gte: startDate },
          result: 'won',
          winnings: { gt: '0' },
        },
        orderBy: { winnings: 'desc' },
        take: limitNum,
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

      leaderboard = bigWins.map((bet, index) => ({
        id: bet.id.toString(),
        username: bet.user?.username || bet.user?.firstName || 'Anonymous',
        avatar: (bet.user?.username || bet.user?.firstName || 'A').substring(0, 2).toUpperCase(),
        score: parseFloat(bet.winnings.toString()),
        tokenSymbol: bet.token?.symbol || '???',
        gameType: 'crash',
        createdAt: bet.createdAt,
        rank: index + 1,
      }));
    } else if (game === 'minesweeper') {
      // MINESWEEPER GAME
      const bigWins = await prisma.minesweeperGame.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['WON', 'CASHED_OUT'] },
          winAmount: { not: null },
        },
        orderBy: { winAmount: 'desc' },
        take: limitNum,
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

      leaderboard = bigWins.map((game, index) => ({
        id: game.id.toString(),
        username: game.user?.username || game.user?.firstName || 'Anonymous',
        avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
        score: parseFloat(game.winAmount.toString()),
        tokenSymbol: game.token?.symbol || '???',
        gameType: 'minesweeper',
        createdAt: game.createdAt,
        rank: index + 1,
      }));
    } else if (game === 'plinko') {
      // PLINKO GAME - используем PlinkoGame с фильтрацией (крупные ставки >= $50 ИЛИ выигрыши >= 5x)
      // Получаем все игры с условиями и фильтруем выигрыши на уровне приложения
      const allGames = await prisma.plinkoGame.findMany({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED',
          // Фильтруем: либо ставка >= 50, либо множитель >= 5 (крупные ставки или выигрыши)
          OR: [
            { betAmount: { gte: '50' } },
            { multiplier: { gte: 5 } }
          ]
        },
        orderBy: { winAmount: 'desc' },
        take: limitNum * 2, // Берём больше, чтобы после фильтрации осталось достаточно
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

      // Фильтруем только выигрыши (winAmount > betAmount) и берём top N
      const bigWins = allGames
        .filter(game => parseFloat(game.winAmount.toString()) > parseFloat(game.betAmount.toString()))
        .slice(0, limitNum);

      leaderboard = bigWins.map((game, index) => ({
        id: game.id.toString(),
        username: game.user?.username || game.user?.firstName || 'Anonymous',
        avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
        score: parseFloat(game.winAmount.toString()),
        tokenSymbol: game.token?.symbol || '???',
        gameType: 'plinko',
        createdAt: game.createdAt,
        rank: index + 1,
      }));
    } else {
      // Неподдерживаемая игра - возвращаем пустой массив
      return res.json({
        success: true,
        data: {
          leaderboard: [],
          period,
          game,
          total: 0,
        }
      });
    }

    res.json({
      success: true,
      data: {
        leaderboard,
        period,
        game,
        total: leaderboard.length,
      }
    });
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to load leaderboard' });
  }
});

// ====================================
// GET /api/v1/leaderboard/top3 — ТОП-3 (для всех игр, объединенный)
// ====================================
router.get('/api/v1/leaderboard/top3', async (req, res) => {
  try {
    const { period = 'all-time', game = 'crash' } = req.query;
    const startDate = getStartDate(period);

    let topThree = [];

    if (game === 'all-games') {
      // ВСЕ ИГРЫ - объединяем результаты из всех игр для top3
      const [crashWins, minesweeperWins, plinkoGames] = await Promise.all([
        prisma.crashBet.findMany({
          where: {
            createdAt: { gte: startDate },
            result: 'won',
            winnings: { gt: '0' },
          },
          orderBy: { winnings: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true, username: true, firstName: true, photoUrl: true } },
            token: { select: { symbol: true } },
          },
        }),
        prisma.minesweeperGame.findMany({
          where: {
            createdAt: { gte: startDate },
            status: { in: ['WON', 'CASHED_OUT'] },
            winAmount: { not: null },
          },
          orderBy: { winAmount: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true, username: true, firstName: true, photoUrl: true } },
            token: { select: { symbol: true } },
          },
        }),
        prisma.plinkoGame.findMany({
          where: {
            createdAt: { gte: startDate },
            status: 'COMPLETED',
            OR: [
              { betAmount: { gte: '50' } },
              { multiplier: { gte: 5 } }
            ]
          },
          orderBy: { winAmount: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true, username: true, firstName: true, photoUrl: true } },
            token: { select: { symbol: true } },
          },
        }),
      ]);

      const allWins = [
        ...crashWins.map(bet => ({
          id: `crash-${bet.id}`,
          username: bet.user?.username || bet.user?.firstName || 'Anonymous',
          avatar: (bet.user?.username || bet.user?.firstName || 'A').substring(0, 2).toUpperCase(),
          score: parseFloat(bet.winnings.toString()),
          tokenSymbol: bet.token?.symbol || '???',
          gameType: 'crash',
          createdAt: bet.createdAt,
        })),
        ...minesweeperWins.map(game => ({
          id: `minesweeper-${game.id}`,
          username: game.user?.username || game.user?.firstName || 'Anonymous',
          avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
          score: parseFloat(game.winAmount.toString()),
          tokenSymbol: game.token?.symbol || '???',
          gameType: 'minesweeper',
          createdAt: game.createdAt,
        })),
        ...plinkoGames
          .filter(game => parseFloat(game.winAmount.toString()) > parseFloat(game.betAmount.toString()))
          .map(game => ({
            id: `plinko-${game.id}`,
            username: game.user?.username || game.user?.firstName || 'Anonymous',
            avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score: parseFloat(game.winAmount.toString()),
            tokenSymbol: game.token?.symbol || '???',
            gameType: 'plinko',
            createdAt: game.createdAt,
          })),
      ];

      topThree = allWins
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));
    } else if (game === 'crash') {
      // CRASH GAME
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

      topThree = topWins.map((bet, index) => ({
        id: bet.id.toString(),
        username: bet.user?.username || bet.user?.firstName || 'Anonymous',
        avatar: (bet.user?.username || bet.user?.firstName || 'A').substring(0, 2).toUpperCase(),
        score: parseFloat(bet.winnings.toString()),
        tokenSymbol: bet.token?.symbol || '???',
        createdAt: bet.createdAt,
        rank: index + 1,
      }));
    } else if (game === 'minesweeper') {
      // MINESWEEPER GAME
      const topWins = await prisma.minesweeperGame.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['WON', 'CASHED_OUT'] },
          winAmount: { not: null },
        },
        orderBy: { winAmount: 'desc' },
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

      topThree = topWins.map((game, index) => ({
        id: game.id.toString(),
        username: game.user?.username || game.user?.firstName || 'Anonymous',
        avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
        score: parseFloat(game.winAmount.toString()),
        tokenSymbol: game.token?.symbol || '???',
        createdAt: game.createdAt,
        rank: index + 1,
      }));
    } else if (game === 'plinko') {
      // PLINKO GAME - используем PlinkoGame с фильтрацией (крупные ставки >= $50 ИЛИ выигрыши >= 5x)
      const allGames = await prisma.plinkoGame.findMany({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED',
          // Фильтруем: либо ставка >= 50, либо множитель >= 5 (крупные ставки или выигрыши)
          OR: [
            { betAmount: { gte: '50' } },
            { multiplier: { gte: 5 } }
          ]
        },
        orderBy: { winAmount: 'desc' },
        take: 10, // Берём больше, чтобы после фильтрации осталось top 3
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

      // Фильтруем только выигрыши (winAmount > betAmount) и берём top 3
      const topWins = allGames
        .filter(game => parseFloat(game.winAmount.toString()) > parseFloat(game.betAmount.toString()))
        .slice(0, 3);

      topThree = topWins.map((game, index) => ({
        id: game.id.toString(),
        username: game.user?.username || game.user?.firstName || 'Anonymous',
        avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
        score: parseFloat(game.winAmount.toString()),
        tokenSymbol: game.token?.symbol || '???',
        createdAt: game.createdAt,
        rank: index + 1,
      }));
    }

    res.json({
      success: true,
      data: topThree
    });
  } catch (error) {
    console.error('❌ Error fetching top 3 wins:', error);
    res.status(500).json({ success: false, error: 'Failed to load top wins' });
  }
});

module.exports = router;