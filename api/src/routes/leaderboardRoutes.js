// src/routes/leaderboardRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');

// Курсы валют для конвертации в USD
const CRYPTO_TO_USD = {
  'USDT': 1.0,
  'USDC': 1.0,
  'BTC': 100000,
  'ETH': 3300,
  'BNB': 700,
  'SOL': 200,
  'TRX': 0.25,
  'LTC': 130,
  'TON': 5.5,
};

// Конвертация крипты в USD
function cryptoToUsd(amount, symbol) {
  const rate = CRYPTO_TO_USD[symbol] || 1;
  return amount * rate;
}

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
        ...crashWins.map(bet => {
          const score = parseFloat(bet.winnings.toString());
          const tokenSymbol = bet.token?.symbol || 'USDT';
          return {
            id: `crash-${bet.id}`,
            username: bet.user?.username || bet.user?.firstName || 'Anonymous',
            avatar: (bet.user?.username || bet.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score,
            scoreUsd: cryptoToUsd(score, tokenSymbol),
            tokenSymbol,
            tokenId: bet.tokenId,
            gameType: 'crash',
            createdAt: bet.createdAt,
          };
        }),
        ...minesweeperWins.map(game => {
          const score = parseFloat(game.winAmount.toString());
          const tokenSymbol = game.token?.symbol || 'USDT';
          return {
            id: `minesweeper-${game.id}`,
            username: game.user?.username || game.user?.firstName || 'Anonymous',
            avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score,
            scoreUsd: cryptoToUsd(score, tokenSymbol),
            tokenSymbol,
            tokenId: game.tokenId,
            gameType: 'minesweeper',
            createdAt: game.createdAt,
          };
        }),
        ...plinkoGames
          .filter(game => parseFloat(game.winAmount.toString()) > parseFloat(game.betAmount.toString()))
          .map(game => {
            const score = parseFloat(game.winAmount.toString());
            const tokenSymbol = game.token?.symbol || 'USDT';
            return {
              id: `plinko-${game.id}`,
              username: game.user?.username || game.user?.firstName || 'Anonymous',
              avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
              score,
              scoreUsd: cryptoToUsd(score, tokenSymbol),
              tokenSymbol,
              tokenId: game.tokenId,
              gameType: 'plinko',
              createdAt: game.createdAt,
            };
          }),
      ];

      // Сортируем по USD эквиваленту и берём top N
      leaderboard = allWins
        .sort((a, b) => b.scoreUsd - a.scoreUsd)
        .slice(0, limitNum)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));
    } else if (game === 'crash') {
      // CRASH GAME - получаем больше записей, сортируем по USD
      const allWins = await prisma.crashBet.findMany({
        where: {
          createdAt: { gte: startDate },
          result: 'won',
          winnings: { gt: '0' },
        },
        orderBy: { createdAt: 'desc' },
        take: limitNum * 5, // Берём больше для правильной сортировки по USD
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

      // Конвертируем и сортируем по USD
      leaderboard = allWins
        .map(bet => {
          const score = parseFloat(bet.winnings.toString());
          const tokenSymbol = bet.token?.symbol || 'USDT';
          return {
            id: bet.id.toString(),
            username: bet.user?.username || bet.user?.firstName || 'Anonymous',
            avatar: (bet.user?.username || bet.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score,
            scoreUsd: cryptoToUsd(score, tokenSymbol),
            tokenSymbol,
            tokenId: bet.tokenId,
            gameType: 'crash',
            createdAt: bet.createdAt,
          };
        })
        .sort((a, b) => b.scoreUsd - a.scoreUsd)
        .slice(0, limitNum)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    } else if (game === 'minesweeper') {
      // MINESWEEPER GAME - получаем больше записей, сортируем по USD
      const allWins = await prisma.minesweeperGame.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['WON', 'CASHED_OUT'] },
          winAmount: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: limitNum * 5,
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

      leaderboard = allWins
        .map(game => {
          const score = parseFloat(game.winAmount.toString());
          const tokenSymbol = game.token?.symbol || 'USDT';
          return {
            id: game.id.toString(),
            username: game.user?.username || game.user?.firstName || 'Anonymous',
            avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score,
            scoreUsd: cryptoToUsd(score, tokenSymbol),
            tokenSymbol,
            tokenId: game.tokenId,
            gameType: 'minesweeper',
            createdAt: game.createdAt,
          };
        })
        .sort((a, b) => b.scoreUsd - a.scoreUsd)
        .slice(0, limitNum)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    } else if (game === 'plinko') {
      // PLINKO GAME - получаем больше записей, сортируем по USD
      const allGames = await prisma.plinkoGame.findMany({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
        orderBy: { createdAt: 'desc' },
        take: limitNum * 5,
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

      // Фильтруем выигрыши, конвертируем и сортируем по USD
      leaderboard = allGames
        .filter(game => parseFloat(game.winAmount.toString()) > parseFloat(game.betAmount.toString()))
        .map(game => {
          const score = parseFloat(game.winAmount.toString());
          const tokenSymbol = game.token?.symbol || 'USDT';
          return {
            id: game.id.toString(),
            username: game.user?.username || game.user?.firstName || 'Anonymous',
            avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score,
            scoreUsd: cryptoToUsd(score, tokenSymbol),
            tokenSymbol,
            tokenId: game.tokenId,
            gameType: 'plinko',
            createdAt: game.createdAt,
          };
        })
        .sort((a, b) => b.scoreUsd - a.scoreUsd)
        .slice(0, limitNum)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
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
        ...crashWins.map(bet => {
          const score = parseFloat(bet.winnings.toString());
          const tokenSymbol = bet.token?.symbol || 'USDT';
          return {
            id: `crash-${bet.id}`,
            username: bet.user?.username || bet.user?.firstName || 'Anonymous',
            avatar: (bet.user?.username || bet.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score,
            scoreUsd: cryptoToUsd(score, tokenSymbol),
            tokenSymbol,
            tokenId: bet.tokenId,
            gameType: 'crash',
            createdAt: bet.createdAt,
          };
        }),
        ...minesweeperWins.map(game => {
          const score = parseFloat(game.winAmount.toString());
          const tokenSymbol = game.token?.symbol || 'USDT';
          return {
            id: `minesweeper-${game.id}`,
            username: game.user?.username || game.user?.firstName || 'Anonymous',
            avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score,
            scoreUsd: cryptoToUsd(score, tokenSymbol),
            tokenSymbol,
            tokenId: game.tokenId,
            gameType: 'minesweeper',
            createdAt: game.createdAt,
          };
        }),
        ...plinkoGames
          .filter(game => parseFloat(game.winAmount.toString()) > parseFloat(game.betAmount.toString()))
          .map(game => {
            const score = parseFloat(game.winAmount.toString());
            const tokenSymbol = game.token?.symbol || 'USDT';
            return {
              id: `plinko-${game.id}`,
              username: game.user?.username || game.user?.firstName || 'Anonymous',
              avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
              score,
              scoreUsd: cryptoToUsd(score, tokenSymbol),
              tokenSymbol,
              tokenId: game.tokenId,
              gameType: 'plinko',
              createdAt: game.createdAt,
            };
          }),
      ];

      topThree = allWins
        .sort((a, b) => b.scoreUsd - a.scoreUsd)
        .slice(0, 3)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));
    } else if (game === 'crash') {
      // CRASH GAME - получаем больше, сортируем по USD, берём top 3
      const allWins = await prisma.crashBet.findMany({
        where: {
          createdAt: { gte: startDate },
          result: 'won',
          winnings: { gt: '0' },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Берём больше для правильной сортировки по USD
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

      topThree = allWins
        .map(bet => {
          const score = parseFloat(bet.winnings.toString());
          const tokenSymbol = bet.token?.symbol || 'USDT';
          return {
            id: bet.id.toString(),
            username: bet.user?.username || bet.user?.firstName || 'Anonymous',
            avatar: (bet.user?.username || bet.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score,
            scoreUsd: cryptoToUsd(score, tokenSymbol),
            tokenSymbol,
            tokenId: bet.tokenId,
            gameType: 'crash',
            createdAt: bet.createdAt,
          };
        })
        .sort((a, b) => b.scoreUsd - a.scoreUsd)
        .slice(0, 3)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    } else if (game === 'minesweeper') {
      // MINESWEEPER GAME - получаем больше, сортируем по USD
      const allWins = await prisma.minesweeperGame.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['WON', 'CASHED_OUT'] },
          winAmount: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
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

      topThree = allWins
        .map(game => {
          const score = parseFloat(game.winAmount.toString());
          const tokenSymbol = game.token?.symbol || 'USDT';
          return {
            id: game.id.toString(),
            username: game.user?.username || game.user?.firstName || 'Anonymous',
            avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score,
            scoreUsd: cryptoToUsd(score, tokenSymbol),
            tokenSymbol,
            tokenId: game.tokenId,
            gameType: 'minesweeper',
            createdAt: game.createdAt,
          };
        })
        .sort((a, b) => b.scoreUsd - a.scoreUsd)
        .slice(0, 3)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    } else if (game === 'plinko') {
      // PLINKO GAME - получаем больше, сортируем по USD
      const allGames = await prisma.plinkoGame.findMany({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
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

      topThree = allGames
        .filter(game => parseFloat(game.winAmount.toString()) > parseFloat(game.betAmount.toString()))
        .map(game => {
          const score = parseFloat(game.winAmount.toString());
          const tokenSymbol = game.token?.symbol || 'USDT';
          return {
            id: game.id.toString(),
            username: game.user?.username || game.user?.firstName || 'Anonymous',
            avatar: (game.user?.username || game.user?.firstName || 'A').substring(0, 2).toUpperCase(),
            score,
            scoreUsd: cryptoToUsd(score, tokenSymbol),
            tokenSymbol,
            tokenId: game.tokenId,
            gameType: 'plinko',
            createdAt: game.createdAt,
          };
        })
        .sort((a, b) => b.scoreUsd - a.scoreUsd)
        .slice(0, 3)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
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