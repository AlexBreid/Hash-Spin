const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');

// 🔍 Проверка Server Secret
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
  console.log('\n📨 [START-ROUND] Получен запрос');
  
  const verified = verifyGameServerSecret(req, res);
  if (verified !== true) return;

  console.log('📨 [START-ROUND] Данные:', JSON.stringify(req.body));

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

      console.log(`✅ [START-ROUND] Раунд создан: ID=${newRound.id}, gameId=${gameId}, crash=${crashPoint}x`);
      res.json({ success: true, data: { roundId: newRound.id } });
    } catch (error) {
      console.error('❌ [START-ROUND] Ошибка:', error.message);
      res.status(500).json({ success: false, error: 'Failed to create round', details: error.message });
    }
  })();
});

// ===================================
// POST /api/v1/crash/create-bet
// ===================================
router.post('/api/v1/crash/create-bet', (req, res) => {
  console.log('\n📨 [CREATE-BET] Получен запрос');
  
  const verified = verifyGameServerSecret(req, res);
  if (verified !== true) return;

  const { userId, gameId, amount, tokenId } = req.body;

  console.log('📨 [CREATE-BET] Данные:', JSON.stringify(req.body));

  // 🔍 Валидация
  if (!userId || !gameId || amount === undefined || !tokenId) {
    console.log(`❌ [CREATE-BET] Отсутствуют обязательные поля`);
    console.log(`   userId: ${!!userId}`);
    console.log(`   gameId: ${!!gameId}`);
    console.log(`   amount: ${amount !== undefined}`);
    console.log(`   tokenId: ${!!tokenId}`);
    return res.status(400).json({ 
      success: false, 
      error: 'Missing fields',
      received: { userId, gameId, amount, tokenId }
    });
  }

  const betAmount = parseFloat(amount);
  if (isNaN(betAmount) || betAmount <= 0) {
    console.log(`❌ [CREATE-BET] Неправильная сумма: ${amount}`);
    return res.status(400).json({ success: false, error: 'Invalid bet amount' });
  }

  (async () => {
    try {
      // 1️⃣ Найти раунд
      console.log(`🔍 [CREATE-BET] Ищу раунд: gameId=${gameId}`);
      const round = await prisma.crashRound.findUnique({
        where: { gameId }
      });

      if (!round) {
        console.log(`❌ [CREATE-BET] Раунд не найден: ${gameId}`);
        return res.status(404).json({ success: false, error: 'Round not found' });
      }
      console.log(`✅ [CREATE-BET] Раунд найден: ID=${round.id}`);

      // 2️⃣ Проверить токен
      console.log(`🔍 [CREATE-BET] Проверяю токен: ID=${tokenId}`);
      const token = await prisma.cryptoToken.findUnique({
        where: { id: tokenId }
      });

      if (!token) {
        console.log(`❌ [CREATE-BET] Токен не найден: ID=${tokenId}`);
        return res.status(400).json({ 
          success: false, 
          error: 'Token not found' 
        });
      }
      console.log(`✅ [CREATE-BET] Токен найден: ${token.symbol}`);

      // 3️⃣ Проверить пользователя
      console.log(`🔍 [CREATE-BET] Проверяю пользователя: ID=${userId}`);
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        console.log(`❌ [CREATE-BET] Пользователь не найден: ID=${userId}`);
        return res.status(400).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      console.log(`✅ [CREATE-BET] Пользователь найден: ${user.username}`);

      // 4️⃣ Получить ВСЕ балансы пользователя
      console.log(`🔍 [CREATE-BET] Получаю ВСЕ балансы пользователя...`);
      const allBalances = await prisma.balance.findMany({
        where: { userId },
        include: { token: true }
      });

      console.log(`✅ [CREATE-BET] Найдено ${allBalances.length} балансов:`);
      allBalances.forEach(bal => {
        console.log(`   - ${bal.token.symbol} (ID=${bal.tokenId}): ${bal.amount} [${bal.type}]`);
      });

      // 5️⃣ Найти баланс для конкретного токена
      console.log(`🔍 [CREATE-BET] Ищу баланс для tokenId=${tokenId}, type=MAIN`);
      const balance = await prisma.balance.findUnique({
        where: {
          userId_tokenId_type: {
            userId,
            tokenId,
            type: 'MAIN'
          }
        }
      });

      if (!balance) {
        console.log(`❌ [CREATE-BET] Баланс не найден`);
        return res.status(400).json({ 
          success: false, 
          error: 'Balance not found',
          availableTokens: allBalances.map(b => b.tokenId)
        });
      }

      const currentBalance = parseFloat(balance.amount);
      console.log(`✅ [CREATE-BET] Баланс найден: ${currentBalance}`);

      if (currentBalance < betAmount) {
        console.log(`❌ [CREATE-BET] Недостаточно средств: need=${betAmount}, have=${currentBalance}`);
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance',
          details: { required: betAmount, available: currentBalance }
        });
      }

      // 6️⃣ Создать ставку
      console.log(`📝 [CREATE-BET] Создаю ставку для userId=${userId}`);
      const newBet = await prisma.crashBet.create({
        data: {
          userId,
          roundId: round.id,
          tokenId,
          betAmount: betAmount.toString(),
          exitMultiplier: null,
          winnings: '0',
          result: 'pending'
        }
      });
      console.log(`✅ [CREATE-BET] Ставка создана: ID=${newBet.id}`);

      // 7️⃣ Снять деньги
      console.log(`💳 [CREATE-BET] Снимаю ${betAmount} с баланса`);
      await prisma.balance.update({
        where: { id: balance.id },
        data: {
          amount: {
            decrement: betAmount
          }
        }
      });
      console.log(`✅ [CREATE-BET] Баланс обновлен`);

      // 8️⃣ Логировать транзакцию
      await prisma.crashTransaction.create({
        data: {
          userId,
          betId: newBet.id,
          tokenId,
          amount: (-betAmount).toString(),
          type: 'bet_placed'
        }
      });
      console.log(`✅ [CREATE-BET] Транзакция залогирована`);

      // 9️⃣ Обновить раунд
      await prisma.crashRound.update({
        where: { id: round.id },
        data: {
          totalPlayers: { increment: 1 },
          totalWagered: {
            increment: betAmount
          }
        }
      });
      console.log(`✅ [CREATE-BET] Раунд обновлен`);

      console.log(`✅ [CREATE-BET] УСПЕХ: betId=${newBet.id}`);
      res.json({ success: true, data: { betId: newBet.id } });
    } catch (error) {
      console.error('❌ [CREATE-BET] Ошибка:', error.message);
      console.error('📋 Stack:', error.stack);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create bet', 
        details: error.message 
      });
    }
  })();
});

// ===================================
// POST /api/v1/crash/cashout-result
// ===================================
router.post('/api/v1/crash/cashout-result', (req, res) => {
  console.log('\n📨 [CASHOUT-RESULT] Получен запрос');
  
  const verified = verifyGameServerSecret(req, res);
  if (verified !== true) return;

  const { userId, tokenId, betId, winnings, exitMultiplier, gameId, result } = req.body;

  console.log('📨 [CASHOUT-RESULT] Данные:', JSON.stringify(req.body));

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

      console.log(`🔍 [CASHOUT-RESULT] Ищу ставку: ID=${betIdInt}`);
      const bet = await prisma.crashBet.findUnique({
        where: { id: betIdInt }
      });

      if (!bet) {
        console.log(`❌ [CASHOUT-RESULT] Ставка не найдена: ${betIdInt}`);
        return res.status(404).json({ success: false, error: 'Bet not found' });
      }

      console.log(`✅ [CASHOUT-RESULT] Ставка найдена`);
      console.log(`📝 [CASHOUT-RESULT] Обновляю ставку: result=${result}, winnings=${winningsAmount}`);

      // Обновить ставку
      await prisma.crashBet.update({
        where: { id: betIdInt },
        data: {
          result,
          winnings: winningsAmount.toString(),
          exitMultiplier: exitMultiplier ? parseFloat(exitMultiplier).toString() : null
        }
      });

      console.log(`✅ [CASHOUT-RESULT] Ставка обновлена`);

      // Если выиграл
      if (winningsAmount > 0 && result === 'won') {
        console.log(`💰 [CASHOUT-RESULT] Зачисляю выигрыш: ${winningsAmount}`);

        let balance = await prisma.balance.findUnique({
          where: {
            userId_tokenId_type: {
              userId,
              tokenId,
              type: 'MAIN'
            }
          }
        });

        if (!balance) {
          console.log(`⚠️ [CASHOUT-RESULT] Баланс не найден, создаю новый`);
          balance = await prisma.balance.create({
            data: {
              userId,
              tokenId,
              type: 'MAIN',
              amount: winningsAmount.toString()
            }
          });
        } else {
          balance = await prisma.balance.update({
            where: { id: balance.id },
            data: {
              amount: {
                increment: winningsAmount
              }
            }
          });
        }

        console.log(`✅ [CASHOUT-RESULT] Баланс обновлен`);

        await prisma.crashTransaction.create({
          data: {
            userId,
            betId: betIdInt,
            tokenId,
            amount: winningsAmount.toString(),
            type: 'winnings'
          }
        });

        console.log(`✅ [CASHOUT-RESULT] ВЫИГРЫШ ЗАПИСАН`);
      } else {
        console.log(`❌ [CASHOUT-RESULT] Ставка потеряна (result=${result}, winnings=${winningsAmount})`);
      }

      res.json({ success: true, data: { status: 'finalized' } });
    } catch (error) {
      console.error('❌ [CASHOUT-RESULT] Ошибка:', error.message);
      console.error('📋 Stack:', error.stack);

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
      where: { userId, result: 'won' }
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

    console.log(`\n🔍 [VERIFY-BET] Проверяю баланс`);
    console.log(`   userId: ${userId}`);
    console.log(`   amount: ${amount}`);
    console.log(`   tokenId: ${tokenId}`);

    // ✅ Валидация входных данных
    if (!amount || amount <= 0) {
      console.log(`❌ [VERIFY-BET] Неправильная сумма: ${amount}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount',
        details: { amount }
      });
    }

    if (!tokenId || tokenId <= 0) {
      console.log(`❌ [VERIFY-BET] Неправильный tokenId: ${tokenId}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid tokenId',
        details: { tokenId }
      });
    }

    // ✅ Проверяем существование токена
    console.log(`🔍 [VERIFY-BET] Проверяю токен ID=${tokenId}`);
    const token = await prisma.cryptoToken.findUnique({
      where: { id: tokenId }
    });

    if (!token) {
      console.log(`❌ [VERIFY-BET] Токен не найден: ID=${tokenId}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Token not found',
        details: { tokenId }
      });
    }
    console.log(`✅ [VERIFY-BET] Токен найден: ${token.symbol} (${token.name})`);

    // ✅ Проверяем существование пользователя
    console.log(`🔍 [VERIFY-BET] Проверяю пользователя ID=${userId}`);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log(`❌ [VERIFY-BET] Пользователь не найден: ID=${userId}`);
      return res.status(400).json({ 
        success: false, 
        error: 'User not found',
        details: { userId }
      });
    }
    console.log(`✅ [VERIFY-BET] Пользователь найден: ${user.username || user.firstName}`);

    // ✅ ГЛАВНОЕ: Получаем ВСЕ балансы пользователя
    console.log(`🔍 [VERIFY-BET] Получаю ВСЕ балансы пользователя ${userId}...`);
    const allBalances = await prisma.balance.findMany({
      where: { userId },
      include: { token: true }
    });

    console.log(`✅ [VERIFY-BET] Найдено ${allBalances.length} балансов:`);
    allBalances.forEach(bal => {
      console.log(`   - ${bal.token.symbol} (ID=${bal.tokenId}): ${bal.amount} [${bal.type}]`);
    });

    // ✅ Ищем баланс для конкретного токена
    console.log(`🔍 [VERIFY-BET] Ищу баланс для userId=${userId}, tokenId=${tokenId}, type=MAIN`);
    
    const balance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: {
          userId,
          tokenId,
          type: 'MAIN'
        }
      },
      include: { token: true }
    });

    if (!balance) {
      console.log(`❌ [VERIFY-BET] Баланс не найден для этого токена`);
      console.log(`   Возможные причины:`);
      console.log(`   1. tokenId ${tokenId} неправильный`);
      console.log(`   2. Баланс для этого токена еще не создан`);
      console.log(`   3. Баланс существует но с другим type (не MAIN)`);
      
      // Проверяем есть ли вообще какой-то баланс для этого токена
      const anyBalance = await prisma.balance.findMany({
        where: { userId, tokenId },
        include: { token: true }
      });

      if (anyBalance.length > 0) {
        console.log(`⚠️ [VERIFY-BET] Найдены балансы с другими type:`);
        anyBalance.forEach(bal => {
          console.log(`   - type=${bal.type}: ${bal.amount}`);
        });
      }

      return res.status(400).json({ 
        success: false, 
        error: 'Balance not found for this token',
        details: {
          userId,
          tokenId,
          availableTokens: allBalances.map(b => ({
            tokenId: b.tokenId,
            symbol: b.token.symbol,
            amount: b.amount,
            type: b.type
          }))
        }
      });
    }

    const availableBalance = parseFloat(balance.amount);
    const requiredAmount = parseFloat(amount);

    console.log(`✅ [VERIFY-BET] Баланс найден: ${balance.token.symbol}`);
    console.log(`   Доступно: ${availableBalance}`);
    console.log(`   Требуется: ${requiredAmount}`);

    // ✅ Проверяем достаточность средств
    if (availableBalance < requiredAmount) {
      console.log(`❌ [VERIFY-BET] Недостаточно средств`);
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient balance',
        details: {
          available: availableBalance,
          required: requiredAmount,
          token: balance.token.symbol
        }
      });
    }

    console.log(`✅ [VERIFY-BET] Баланс достаточен, принимаю ставку`);
    res.json({ 
      success: true, 
      data: { 
        available: balance.amount,
        token: balance.token.symbol
      }
    });

  } catch (error) {
    console.error('❌ [VERIFY-BET] ОШИБКА:', error.message);
    console.error('📋 Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify bet',
      details: error.message
    });
  }
});

module.exports = router;