const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const { Decimal } = require('@prisma/client');

const { deductBetFromBalance, creditWinnings, getUserBalances } = require('./helpers/gameReferralHelper');

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

// ===================================
// POST /api/v1/crash/start-round
// ===================================
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

// ===================================
// POST /api/v1/crash/create-bet
// ✅ С ТРАНЗАКЦИЕЙ ДЛЯ АТОМАРНОСТИ
// ===================================
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

      // ✅ ТРАНЗАКЦИЯ: Все операции выполняются вместе или откатываются
      const result = await prisma.$transaction(async (tx) => {
        // Вычитаем деньги
        const deductResult = await deductBetFromBalance(userId, betAmount, tokenId);
        
        if (!deductResult.success) {
          console.log(`❌ [CREATE-BET] ${deductResult.error}`);
          throw new Error(deductResult.error || 'Insufficient balance');
        }

        // Создаём ставку с result='PENDING'
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

        // Записываем транзакцию
        await tx.crashTransaction.create({
          data: {
            userId,
            betId: newBet.id,
            tokenId,
            amount: (-betAmount).toString(),
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

        return { betId: newBet.id, balanceType: deductResult.balanceType };
      });

      console.log(`✅ [CREATE-BET] Ставка создана: ${result.betId}, сумма: ${betAmount}`);

      res.json({ 
        success: true, 
        data: { 
          betId: result.betId,
          balanceType: result.balanceType
        } 
      });
    } catch (error) {
      console.error('❌ [CREATE-BET] Ошибка:', error.message);
      res.status(500).json({ success: false, error: 'Failed to create bet', details: error.message });
    }
  })();
});

// ===================================
// POST /api/v1/crash/cashout-result
// ✅ С ЗАЩИТОЙ ОТ ДВОЙНОЙ ОБРАБОТКИ
// ===================================
router.post('/api/v1/crash/cashout-result', (req, res) => {
  const verified = verifyGameServerSecret(req, res);
  if (verified !== true) return;

  const { userId, tokenId, betId, winnings, exitMultiplier, gameId, result } = req.body;

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

      // Получаем ставку и её текущий статус
      const bet = await prisma.crashBet.findUnique({
        where: { id: betIdInt }
      });

      if (!bet) {
        console.log(`❌ [CASHOUT-RESULT] Ставка не найдена: ${betIdInt}`);
        return res.status(404).json({ success: false, error: 'Bet not found' });
      }

      // ✅ ЗАЩИТА: Проверяем, не была ли уже обработана
      if (bet.result !== 'PENDING') {
        console.log(`⚠️ [CASHOUT-RESULT] Ставка уже обработана (${bet.result}), пропускаем: ${betIdInt}`);
        return res.json({ 
          success: true, 
          data: { status: 'already_processed', previousResult: bet.result } 
        });
      }

      console.log(`📝 [CASHOUT-RESULT] Обновляю ставку ${betIdInt}: result=${result}, winnings=${winningsAmount}`);

      // ✅ ТРАНЗАКЦИЯ: Финализация в одной транзакции
      const finalResult = await prisma.$transaction(async (tx) => {
        // Обновляем ставку
        const updatedBet = await tx.crashBet.update({
          where: { id: betIdInt },
          data: {
            result: result.toUpperCase(),
            winnings: winningsAmount.toString(),
            exitMultiplier: exitMultiplier ? parseFloat(exitMultiplier).toString() : null
          }
        });

        // Если выиграл - зачисляем деньги
        if (winningsAmount > 0 && result === 'won') {
          console.log(`💰 [CASHOUT-RESULT] Зачисляю выигрыш: ${winningsAmount}`);
          
          await creditWinnings(userId, winningsAmount, tokenId, 'MAIN');

          await tx.crashTransaction.create({
            data: {
              userId,
              betId: betIdInt,
              tokenId,
              amount: winningsAmount.toString(),
              type: 'winnings'
            }
          });
        } else {
          console.log(`❌ [CASHOUT-RESULT] Ставка потеряна (result=${result}, winnings=${winningsAmount})`);
        }

        // Обновляем раунд
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

      console.log(`✅ [CASHOUT-RESULT] Касаут обработан для ставки ${betIdInt}`);
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

// ===================================
// GET /api/v1/crash/history
// ===================================
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

// ===================================
// GET /api/v1/crash/stats
// ===================================
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

// ===================================
// GET /api/v1/crash/leaderboard
// ===================================
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

// ===================================
// POST /api/v1/crash/verify-bet
// ===================================
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
// ✅ ЗАГРУЖАЕТ ИЗ БД, НЕ ИЗ RAM
// ===================================
router.get('/api/v1/crash/last-crashes', async (req, res) => {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 [ROUTE] GET /crash/last-crashes`);
    console.log(`${'='.repeat(80)}`);

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
        crashPoint: { not: null }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log(`✅ Найдено ${crashes.length} раундов в БД`);

    if (crashes.length > 0) {
      console.log(`\n📍 СПИСОК РАУНДОВ:`);
      crashes.forEach((crash, idx) => {
        console.log(`  ${idx + 1}. GameID: ${crash.gameId.substring(0, 8)}`);
        console.log(`     - Crash Point: ${crash.crashPoint}x`);
        console.log(`     - Created: ${crash.createdAt.toLocaleTimeString()}`);
        console.log(`     - Wagered: ${crash.totalWagered}, Payouts: ${crash.totalPayouts}`);
        console.log(`     - Players: ${crash.totalPlayers}`);
      });
    }

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

    console.log(`\n📤 Отправляю ${formattedCrashes.length} крашей на фронт`);
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
      error: 'Ошибка получения истории крашей'
    });
  }
});

// ===================================
// GET /api/v1/crash/statistics
// ===================================
router.get('/api/v1/crash/statistics', async (req, res) => {
  try {
    console.log(`📈 [ROUTE] GET /crash/statistics - загружаю статистику...`);

    const crashes = await prisma.crashRound.findMany({
      select: { crashPoint: true },
      where: { crashPoint: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 100,
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