const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');

const { deductBetFromBalance, creditWinnings, getUserBalances } = require('./helpers/gameReferralHelper');

// ===================================
// POST /api/v1/crash/cashout-result
// ✅ ИСПРАВЛЕНО:
// 1. Деньги зачисляются СРАЗУ, не ждут конца раунда
// 2. Вейджер считается СРАЗУ
// 3. Конверсия BONUS → MAIN происходит СРАЗУ
// ===================================
router.post('/api/v1/crash/cashout-result', (req, res) => {
  const verified = verifyGameServerSecret(req, res);
  if (verified !== true) return;

  const { userId, tokenId, betId, winnings, exitMultiplier, gameId, result, balanceType, userBonusId } = req.body;

  if (!betId || !userId || !tokenId) {
    console.log('❌ [CASHOUT-RESULT] Отсутствуют обязательные поля');
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
        console.log(`❌ [CASHOUT-RESULT] Неправильный betId: ${betId}`);
        return res.status(400).json({ success: false, error: 'Invalid betId format' });
      }

      const bet = await prisma.crashBet.findUnique({
        where: { id: betIdInt }
      });

      if (!bet) {
        console.log(`❌ [CASHOUT-RESULT] Ставка не найдена: ${betIdInt}`);
        return res.status(404).json({ success: false, error: 'Bet not found' });
      }

      if (bet.result !== 'PENDING') {
        console.log(`⚠️ [CASHOUT-RESULT] Ставка уже обработана (${bet.result}), пропускаем: ${betIdInt}`);
        return res.json({ 
          success: true, 
          data: { status: 'already_processed', previousResult: bet.result } 
        });
      }

      console.log(`📝 [CASHOUT-RESULT] Обновляю ставку ${betIdInt}: result=${result}, winnings=${winningsAmount}, balanceType=${balanceType}`);

      const finalResult = await prisma.$transaction(async (tx) => {
        const updatedBet = await tx.crashBet.update({
          where: { id: betIdInt },
          data: {
            result: result.toUpperCase(),
            winnings: winningsAmount.toString(),
            exitMultiplier: exitMultiplier ? parseFloat(exitMultiplier).toString() : null
          }
        });

        // 🆕 ДЕНЬГИ ЗАЧИСЛЯЮТСЯ СРАЗУ!
        if (winningsAmount > 0 && result === 'won') {
          console.log(`💰 [CASHOUT-RESULT] Зачисляю выигрыш СРАЗУ: ${winningsAmount} на ${balanceType || 'MAIN'}`);
          
          // ✅ Зачисляем выигрыш СРАЗУ
          await creditWinnings(userId, winningsAmount, tokenId, balanceType || 'MAIN');

          await tx.crashTransaction.create({
            data: {
              userId,
              betId: betIdInt,
              tokenId,
              amount: winningsAmount.toString(),
              type: 'winnings'
            }
          });

          // 🆕 ПРОВЕРЯЕМ ВЕЙДЖЕР СРАЗУ (если была ставка с BONUS)
          if (balanceType === 'BONUS' && userBonusId) {
            console.log(`\n💛 [CASHOUT-RESULT] Проверяю вейджер СРАЗУ для бонуса...`);
            
            const bonus = await tx.userBonus.findUnique({
              where: { id: userBonusId }
            });
            
            if (bonus) {
              // УВЕЛИЧИВАЕМ WAGERED НА ВЫИГРЫШ
              const newWagered = parseFloat(bonus.wageredAmount.toString()) + winningsAmount;
              const requiredNum = parseFloat(bonus.requiredWager.toString());

              console.log(`💛 [CASHOUT-RESULT] Вейджер: ${newWagered.toFixed(8)} / ${requiredNum.toFixed(8)}`);

              await tx.userBonus.update({
                where: { id: userBonusId },
                data: { wageredAmount: newWagered.toString() }
              });

              // 🎊 КОНВЕРСИЯ СРАЗУ если вейджер выполнен!
              if (newWagered >= requiredNum) {
                console.log(`\n🎊 [CASHOUT-RESULT] ВЕЙДЖЕР ВЫПОЛНЕН СРАЗУ! ${newWagered.toFixed(8)} >= ${requiredNum.toFixed(8)}`);
                
                const currentBonus = await tx.balance.findUnique({
                  where: {
                    userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
                  }
                });

                const bonusBalanceForConversion = parseFloat(currentBonus?.amount?.toString() || '0');

                console.log(`💳 [CASHOUT-RESULT] Конвертирую ВСЮ сумму СРАЗУ: ${bonusBalanceForConversion.toFixed(8)} BONUS → MAIN`);
                
                if (bonusBalanceForConversion > 0) {
                  // 1. Обнуляем BONUS баланс
                  await tx.balance.update({
                    where: {
                      userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
                    },
                    data: { amount: 0 }
                  });
                  
                  // 2. Добавляем ВСЮ сумму в MAIN
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
                      amount: bonusBalanceForConversion.toString()
                    }
                  });

                  // 3. Создаём запись о конверсии
                  await tx.crashTransaction.create({
                    data: {
                      userId,
                      betId: betIdInt,
                      tokenId,
                      amount: bonusBalanceForConversion.toString(),
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
                  
                  console.log(`✅ [CASHOUT-RESULT] ${bonusBalanceForConversion.toFixed(8)} BONUS → MAIN конвертировано СРАЗУ!\n`);
                }
              }
            }
          }
        } else {
          console.log(`❌ [CASHOUT-RESULT] Ставка потеряна (result=${result}, winnings=${winningsAmount})`);
        }

        const round = await tx.crashRound.findUnique({
          where: { id: updatedBet.roundId }
        });

        if (round) {
          console.log(`🔄 [CASHOUT-RESULT] Обновляю раунд ${round.gameId}: totalPayouts += ${winningsAmount}`);
          
          await tx.crashRound.update({
            where: { id: round.id },
            data: {
              totalPayouts: { increment: winningsAmount },
              winnersCount: result === 'won' ? { increment: 1 } : undefined
            }
          });
        }

        return updatedBet;
      });

      console.log(`✅ [CASHOUT-RESULT] Касаут обработан СРАЗУ для ставки ${betIdInt}`);
      res.json({ success: true, data: { status: 'finalized', result: finalResult.result } });
    } catch (error) {
      console.error('❌ [CASHOUT-RESULT] Ошибка:', error.message);

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
    console.error('⚠️ GAME_SERVER_SECRET не установлен в .env');
    return res.status(500).json({ success: false, error: 'Server misconfigured' });
  }

  if (!serverSecret || serverSecret !== expectedSecret) {
    console.log(`❌ Invalid server secret`);
    return res.status(403).json({ success: false, error: 'Unauthorized: Invalid Server Secret' });
  }

  return true;
};

router.post('/api/v1/crash/start-round', (req, res) => {
  const verified = verifyGameServerSecret(req, res);
  if (verified !== true) return;

  if (!req.body.gameId || req.body.crashPoint === undefined) {
    console.log('❌ [START-ROUND] Отсутствуют обязательные поля');
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
        console.log(`⚠️ [START-ROUND] Раунд уже существует: ${gameId}`);
        return res.status(409).json({ 
          success: false, 
          error: 'Round with this gameId already exists' 
        });
      }

      const newRound = await prisma.crashRound.create({
        data: {
          gameId,
          crashPoint: parseFloat(crashPoint).toString(),
          serverSeedHash: serverSeedHash || '',
          clientSeed: clientSeed || '',
          totalWagered: '0',
          totalPayouts: '0'
        }
      });

      console.log(`✅ [START-ROUND] Раунд создан: ${gameId}, crash=${crashPoint}x, DB ID: ${newRound.id}`);

      res.json({ success: true, data: { roundId: newRound.id } });
    } catch (error) {
      console.error('❌ [START-ROUND] Ошибка:', error.message);
      res.status(500).json({ success: false, error: 'Failed to create round', details: error.message });
    }
  })();
});

router.post('/api/v1/crash/create-bet', (req, res) => {
  const verified = verifyGameServerSecret(req, res);
  if (verified !== true) return;

  const { userId, gameId, amount, tokenId } = req.body;

  if (!userId || !gameId || amount === undefined || !tokenId) {
    console.log(`❌ [CREATE-BET] Отсутствуют обязательные поля`);
    return res.status(400).json({ 
      success: false, 
      error: 'Missing fields'
    });
  }

  const betAmount = parseFloat(amount);
  if (isNaN(betAmount) || betAmount <= 0) {
    console.log(`❌ [CREATE-BET] Неправильная сумма: ${amount}`);
    return res.status(400).json({ success: false, error: 'Invalid bet amount' });
  }

  (async () => {
    try {
      const round = await prisma.crashRound.findUnique({
        where: { gameId }
      });

      if (!round) {
        console.log(`❌ [CREATE-BET] Раунд не найден: ${gameId}`);
        return res.status(404).json({ success: false, error: 'Round not found' });
      }

      const token = await prisma.cryptoToken.findUnique({
        where: { id: tokenId }
      });

      if (!token) {
        console.log(`❌ [CREATE-BET] Токен не найден: ID=${tokenId}`);
        return res.status(400).json({ success: false, error: 'Token not found' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        console.log(`❌ [CREATE-BET] Пользователь не найден: ID=${userId}`);
        return res.status(400).json({ success: false, error: 'User not found' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const deductResult = await deductBetFromBalance(userId, betAmount, tokenId);
        
        if (!deductResult.success) {
          console.log(`❌ [CREATE-BET] ${deductResult.error}`);
          throw new Error(deductResult.error || 'Insufficient balance');
        }

        const newBet = await tx.crashBet.create({
          data: {
            userId,
            roundId: round.id,
            tokenId,
            betAmount: betAmount.toString(),
            exitMultiplier: null,
            winnings: '0',
            result: 'PENDING'
          }
        });

        await tx.crashTransaction.create({
          data: {
            userId,
            betId: newBet.id,
            tokenId,
            amount: (-betAmount).toString(),
            type: 'bet_placed'
          }
        });

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

      console.log(`✅ [CREATE-BET] Ставка создана: ${result.betId}, сумма: ${betAmount}`);

      res.json({ 
        success: true, 
        data: { 
          betId: result.betId,
          balanceType: result.balanceType,
          userBonusId: result.userBonusId
        } 
      });
    } catch (error) {
      console.error('❌ [CREATE-BET] Ошибка:', error.message);
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
    console.error('❌ Error fetching history:', error);
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
        totalWagered: stats._sum.betAmount || 0,
        totalWinnings: stats._sum.winnings || 0,
        wins,
        winRate: stats._count.id > 0 ? ((wins / stats._count.id) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
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
    console.error('❌ Error fetching leaderboard:', error);
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
    console.error('❌ [VERIFY-BET] ОШИБКА:', error.message);
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
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 [ROUTE] GET /crash/last-crashes (с смещением skip: 2)`);
    console.log(`${'='.repeat(80)}`);

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

    console.log(`✅ Найдено ${crashes.length} раундов (после смещения skip:2)`);
    console.log(`🛡️  Безопасность: последние 2 краша пропущены (могут быть будущими)`);

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

    console.log(`📡 Отправляю ${formattedCrashes.length} БЕЗОПАСНЫХ крашей на фронт`);
    console.log(`${'='.repeat(80)}\n`);

    res.json({
      success: true,
      data: formattedCrashes,
      count: formattedCrashes.length,
    });

  } catch (error) {
    console.error('❌ [ROUTE] Ошибка получения крашей:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения истории крашей',
      details: error.message
    });
  }
});

router.get('/api/v1/crash/statistics', async (req, res) => {
  try {
    console.log(`📈 [ROUTE] GET /crash/statistics (с смещением skip: 2)`);

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

    console.log(`✅ [ROUTE] Статистика загружена: ${count} раундов, avg=${average.toFixed(2)}x`);

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
    console.error('❌ [ROUTE] Ошибка получения статистики:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

module.exports = router;