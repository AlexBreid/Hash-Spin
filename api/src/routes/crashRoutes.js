const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const currencySyncService = require('../services/currencySyncService');

const { 
  deductBetFromBalance, 
  creditWinnings, 
  getUserBalances,
  updateWagerAndCheckConversion 
} = require('./helpers/gameReferralHelper');
const logger = require('../utils/logger');

// ===================================
// POST /api/v1/crash/cashout-result
// ✅ ИСПРАВЛЕНО:
// 1. Выигрыш зачисляется СРАЗУ
// 2. Вейджер считается СРАЗУ (от выигрыша)
// 3. Конверсия BONUS → MAIN происходит СРАЗУ если вейджер выполнен
// ===================================
router.post('/api/v1/crash/cashout-result', (req, res) => {
  const verified = verifyGameServerSecret(req, res);
  if (verified !== true) return;

  const { userId, tokenId, betId, winnings, exitMultiplier, gameId, result, balanceType, userBonusId } = req.body;

  if (!betId || !userId || !tokenId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: betId, userId, tokenId' 
    });
  }

  (async () => {
    try {
      const betIdInt = parseInt(betId, 10);
      const winningsAmount = parseFloat(winnings) || 0;

      if (isNaN(betIdInt)) {
        return res.status(400).json({ success: false, error: 'Invalid betId format' });
      }

      const bet = await prisma.crashBet.findUnique({
        where: { id: betIdInt }
      });

      if (!bet) {
        return res.status(404).json({ success: false, error: 'Bet not found' });
      }

      if (bet.result !== 'PENDING') {
        return res.json({ 
          success: true, 
          data: { status: 'already_processed', previousResult: bet.result } 
        });
      }

      const finalResult = await prisma.$transaction(async (tx) => {
        const updatedBet = await tx.crashBet.update({
          where: { id: betIdInt },
          data: {
            result: result.toUpperCase(),
            winnings: winningsAmount.toFixed(8).toString(),
            exitMultiplier: exitMultiplier ? parseFloat(exitMultiplier).toFixed(8).toString() : null
          }
        });

        // 🆕 ДЕНЬГИ ЗАЧИСЛЯЮТСЯ СРАЗУ!
        if (winningsAmount > 0 && (result === 'won' || result === 'WON')) {
          // ✅ Зачисляем выигрыш СРАЗУ
          const creditResult = await tx.balance.upsert({
            where: {
              userId_tokenId_type: { userId, tokenId, type: balanceType || 'MAIN' }
            },
            create: {
              userId,
              tokenId,
              type: balanceType || 'MAIN',
              amount: winningsAmount.toFixed(8).toString()
            },
            update: {
              amount: { increment: winningsAmount }
            }
          });

          await tx.crashTransaction.create({
            data: {
              userId,
              betId: betIdInt,
              tokenId,
              amount: winningsAmount.toFixed(8).toString(),
              type: 'winnings'
            }
          });

          // 🆕 ПРОВЕРЯЕМ ВЕЙДЖЕР СРАЗУ (если была ставка с BONUS). В отыгрыш идёт только чистая прибыль (выигрыш − ставка)
          if (balanceType === 'BONUS' && userBonusId) {
            const bonus = await tx.userBonus.findUnique({
              where: { id: userBonusId }
            });
            
            if (bonus) {
              const betAmountNum = parseFloat(bet.betAmount.toString());
              const wagerProfit = Math.max(0, winningsAmount - betAmountNum);
              const currentWagered = parseFloat(bonus.wageredAmount.toString());
              const newWagered = parseFloat((currentWagered + wagerProfit).toFixed(8));
              const requiredNum = parseFloat(bonus.requiredWager.toString());

              await tx.userBonus.update({
                where: { id: userBonusId },
                data: { wageredAmount: newWagered.toFixed(8).toString() }
              });

              // 🎊 КОНВЕРСИЯ СРАЗУ если вейджер выполнен!
              if (newWagered >= requiredNum) {
                // Получаем текущий BONUS баланс для конверсии
                const currentBonus = await tx.balance.findUnique({
                  where: {
                    userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
                  }
                });

                const bonusBalanceForConversion = parseFloat(currentBonus?.amount?.toString() || '0');

                if (bonusBalanceForConversion > 0) {
                  // 1. Обнуляем BONUS баланс
                  await tx.balance.update({
                    where: { id: currentBonus.id },
                    data: { amount: '0' }
                  });
                  
                  // 2. Добавляем в MAIN
                  await tx.balance.upsert({
                    where: {
                      userId_tokenId_type: { userId, tokenId, type: 'MAIN' }
                    },
                    update: {
                      amount: { increment: bonusBalanceForConversion }
                    },
                    create: {
                      userId,
                      tokenId,
                      type: 'MAIN',
                      amount: bonusBalanceForConversion.toFixed(8).toString()
                    }
                  });

                  // 3. Логируем конверсию
                  await tx.crashTransaction.create({
                    data: {
                      userId,
                      betId: betIdInt,
                      tokenId,
                      amount: bonusBalanceForConversion.toFixed(8).toString(),
                      type: 'bonus_conversion'
                    }
                  });
                  
                  // 4. Отмечаем бонус завершённым
                  await tx.userBonus.update({
                    where: { id: userBonusId },
                    data: { 
                      isCompleted: true,
                      isActive: false
                    }
                  });
                  
                  } else {
                  await tx.userBonus.update({
                    where: { id: userBonusId },
                    data: { 
                      isCompleted: true,
                      isActive: false
                    }
                  });
                }
              }
            }
          }
        } else {
          }

        // Обновляем раунд
        const round = await tx.crashRound.findUnique({
          where: { id: updatedBet.roundId }
        });

        if (round) {
          await tx.crashRound.update({
            where: { id: round.id },
            data: {
              totalPayouts: { increment: winningsAmount },
              winnersCount: (result === 'won' || result === 'WON') ? { increment: 1 } : undefined
            }
          });
        }

        return updatedBet;
      });
      
      res.json({ success: true, data: { status: 'finalized', result: finalResult.result } });
    } catch (error) {
      logger.error('CRASH', 'Failed to process cashout', { error: error.message });

      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, error: 'Bet record not found' });
      }

      res.status(500).json({ success: false, error: 'Failed to process cashout', details: error.message });
    }
  })();
});

const verifyGameServerSecret = (req, res) => {
  const serverSecret = req.headers['x-server-secret'];
  const expectedSecret = process.env.GAME_SERVER_SECRET;
  
  if (!expectedSecret) {
    return res.status(500).json({ success: false, error: 'Server misconfigured' });
  }

  if (!serverSecret || serverSecret !== expectedSecret) {
    return res.status(403).json({ success: false, error: 'Unauthorized: Invalid Server Secret' });
  }

  return true;
};

router.post('/api/v1/crash/start-round', (req, res) => {
  const verified = verifyGameServerSecret(req, res);
  if (verified !== true) return;

  if (!req.body.gameId || req.body.crashPoint === undefined) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: gameId, crashPoint' 
    });
  }

  (async () => {
    try {
      const { gameId, crashPoint, serverSeedHash, clientSeed } = req.body;

      const existingRound = await prisma.crashRound.findUnique({
        where: { gameId }
      });

      if (existingRound) {
        return res.status(409).json({ 
          success: false, 
          error: 'Round with this gameId already exists' 
        });
      }

      const newRound = await prisma.crashRound.create({
        data: {
          gameId,
          crashPoint: parseFloat(crashPoint).toFixed(2).toString(),
          serverSeedHash: serverSeedHash || '',
          clientSeed: clientSeed || '',
          totalWagered: '0',
          totalPayouts: '0'
        }
      });
      res.json({ success: true, data: { roundId: newRound.id } });
    } catch (error) {
      logger.error('CRASH', 'Failed to create round', { error: error.message });
      
      res.status(500).json({ success: false, error: 'Failed to create round', details: error.message });
    }
  })();
});

router.post('/api/v1/crash/create-bet', (req, res) => {
  const verified = verifyGameServerSecret(req, res);
  if (verified !== true) return;

  const { userId, gameId, amount, tokenId } = req.body;

  if (!userId || !gameId || amount === undefined || !tokenId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing fields'
    });
  }

  const betAmount = parseFloat(amount);
  if (isNaN(betAmount) || betAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid bet amount' });
  }

  (async () => {
    try {
      const round = await prisma.crashRound.findUnique({
        where: { gameId }
      });

      if (!round) {
        return res.status(404).json({ success: false, error: 'Round not found' });
      }

      const token = await prisma.cryptoToken.findUnique({
        where: { id: tokenId }
      });

      if (!token) {
        return res.status(404).json({ success: false, error: 'Token not found' });
      }

      // Проверяем лимиты ставок для валюты
      const minBet = currencySyncService.getMinBetForCurrency(token.symbol);
      const maxBet = currencySyncService.getMaxBetForCurrency(token.symbol);

      if (betAmount < minBet) {
        return res.status(400).json({ 
          success: false, 
          error: `Минимальная ставка ${minBet} ${token.symbol}` 
        });
      }

      if (betAmount > maxBet) {
        return res.status(400).json({ 
          success: false, 
          error: `Максимальная ставка ${maxBet} ${token.symbol}` 
        });
      }

      if (!token) {
        return res.status(400).json({ success: false, error: 'Token not found' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(400).json({ success: false, error: 'User not found' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Списываем ставку
        const deductResult = await deductBetFromBalance(userId, betAmount, tokenId);
        
        if (!deductResult.success) {
          throw new Error(deductResult.error || 'Insufficient balance');
        }

        // Создаём ставку
        const newBet = await tx.crashBet.create({
          data: {
            userId,
            roundId: round.id,
            tokenId,
            betAmount: betAmount.toFixed(8).toString(),
            exitMultiplier: null,
            winnings: '0',
            result: 'PENDING'
          }
        });

        // Логируем ставку
        await tx.crashTransaction.create({
          data: {
            userId,
            betId: newBet.id,
            tokenId,
            amount: betAmount.toFixed(8).toString(),
            type: 'bet_placed'
          }
        });

        // Обновляем раунд
        await tx.crashRound.update({
          where: { id: round.id },
          data: {
            totalPlayers: { increment: 1 },
            totalWagered: { increment: betAmount }
          }
        });
        return { 
          betId: newBet.id, 
          balanceType: deductResult.balanceType,
          userBonusId: deductResult.userBonusId
        };
      });

      res.json({ 
        success: true, 
        data: { 
          betId: result.betId,
          balanceType: result.balanceType,
          userBonusId: result.userBonusId
        } 
      });
    } catch (error) {
      logger.error('CRASH', 'Failed to create bet', { error: error.message });
      
      res.status(500).json({ success: false, error: 'Failed to create bet', details: error.message });
    }
  })();
});

router.get('/api/v1/crash/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;

    const bets = await prisma.crashBet.findMany({
      where: { userId },
      include: { round: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json({ success: true, data: bets, count: bets.length });
  } catch (error) {
    logger.error('CRASH', 'Failed to fetch history', { error: error.message });
    
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

router.get('/api/v1/crash/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await prisma.crashBet.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { betAmount: true, winnings: true }
    });

    const wins = await prisma.crashBet.count({
      where: { userId, result: 'WON' }
    });

    res.json({ 
      success: true, 
      data: {
        totalBets: stats._count.id,
        totalWagered: parseFloat(stats._sum.betAmount?.toString() || '0').toFixed(8),
        totalWinnings: parseFloat(stats._sum.winnings?.toString() || '0').toFixed(8),
        wins,
        winRate: stats._count.id > 0 ? ((wins / stats._count.id) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    logger.error('CRASH', 'Failed to fetch stats', { error: error.message });
    
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

router.get('/api/v1/crash/leaderboard', async (req, res) => {
  try {
    const topPlayers = await prisma.crashBet.groupBy({
      by: ['userId'],
      _sum: { winnings: true },
      _count: { id: true },
      orderBy: { _sum: { winnings: 'desc' } },
      take: 10
    });

    res.json({ success: true, data: topPlayers });
  } catch (error) {
    logger.error('CRASH', 'Failed to fetch leaderboard', { error: error.message });
    
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

router.post('/api/v1/crash/verify-bet', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, tokenId } = req.body;
    
    if (!amount || amount <= 0 || !tokenId) {
      return res.status(400).json({ success: false, error: 'Invalid parameters' });
    }

    const balances = await getUserBalances(userId, tokenId);
    const requiredAmount = parseFloat(amount);
    
    if (balances.total < requiredAmount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient balance',
        details: { available: balances.total, required: requiredAmount }
      });
    }

    res.json({ 
      success: true, 
      data: { 
        available: balances.total,
        main: balances.main,
        bonus: balances.bonus
      }
    });

  } catch (error) {
    logger.error('CRASH', 'Failed to verify bet', { error: error.message });
    
    res.status(500).json({ success: false, error: 'Failed to verify bet' });
  }
});

// ===================================
// GET /api/v1/crash/last-crashes
// ✅ ИСПРАВЛЕНО: 
// 1. Загружаем со сервера БЕЗ ОПАСНОСТИ
// 2. Пропускаем последние 2 краша (они могут быть будущими)
// 3. Показываем ТОЛЬКО уже выпавшие краши
// ===================================
router.get('/api/v1/crash/last-crashes', async (req, res) => {
  try {
    // ✅ БЕРЁМ 12, ПРОПУСКАЕМ 2 (будущие), ВОЗВРАЩАЕМ 10
    const crashes = await prisma.crashRound.findMany({
      select: {
        id: true,
        gameId: true,
        crashPoint: true,
        createdAt: true,
        totalWagered: true,
        totalPayouts: true,
        totalPlayers: true,
      },
      where: {
        crashPoint: {
          gt: 0  // ✅ Только выпавшие краши (crashPoint > 0)
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 12,      // ✅ БЕРЁМ 12
      skip: 2,       // ✅ ПРОПУСКАЕМ 2 (последние = могут быть будущими)
    });

    const formattedCrashes = crashes.map((crash) => {
      return {
        id: crash.gameId,
        gameId: crash.gameId,
        crashPoint: parseFloat(crash.crashPoint.toString()),
        timestamp: crash.createdAt,
        totalWagered: crash.totalWagered,
        totalPayouts: crash.totalPayouts,
        totalPlayers: crash.totalPlayers,
      };
    });


    res.json({
      success: true,
      data: formattedCrashes,
      count: formattedCrashes.length,
    });

  } catch (error) {
    logger.error('CRASH', 'Failed to fetch crashes', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Ошибка получения истории крашей',
      details: error.message
    });
  }
});

router.get('/api/v1/crash/statistics', async (req, res) => {
  try {

    const crashes = await prisma.crashRound.findMany({
      select: { crashPoint: true },
      where: {
        crashPoint: {
          gt: 0
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 102,     // ✅ Берём 102 (100 + 2 для пропуска)
      skip: 2,       // ✅ Пропускаем 2 будущих
    });

    if (crashes.length === 0) {
      return res.json({
        success: true,
        data: {
          count: 0,
          average: 0,
          highest: 0,
          lowest: 0,
          median: 0,
          distribution: { low: 0, medium: 0, high: 0, veryHigh: 0, extreme: 0 }
        },
      });
    }

    const crashPoints = crashes.map(c => parseFloat(c.crashPoint.toString()));
    const count = crashPoints.length;
    const average = crashPoints.reduce((a, b) => a + b, 0) / count;
    const highest = Math.max(...crashPoints);
    const lowest = Math.min(...crashPoints);
    
    const sorted = [...crashPoints].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    const distribution = {
      low: crashPoints.filter(x => x < 2).length,
      medium: crashPoints.filter(x => x >= 2 && x < 5).length,
      high: crashPoints.filter(x => x >= 5 && x < 10).length,
      veryHigh: crashPoints.filter(x => x >= 10 && x < 20).length,
      extreme: crashPoints.filter(x => x >= 20).length,
    };

    res.json({
      success: true,
      data: {
        count,
        average: parseFloat(average.toFixed(2)),
        highest: parseFloat(highest.toFixed(2)),
        lowest: parseFloat(lowest.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        distribution,
      },
    });
  } catch (error) {
    logger.error('CRASH', 'Failed to fetch statistics', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

module.exports = router;

