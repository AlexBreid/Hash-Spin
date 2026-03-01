/**
 * 🎮 PLINKO ROUTES - МУЛЬТИ-ШАРИКИ
 * 
 * Поддерживает:
 * - Покупка одного шарика
 * - Покупка нескольких шариков сразу
 * - Баланс, история, статистика
 * 
 * Защита от race condition: атомарная транзакция в deductBetFromBalance
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const currencySyncService = require('../services/currencySyncService');
const plinkoService = require('../services/PlinkoService');
const logger = require('../utils/logger');
const { deductBetFromBalance, creditWinnings, updateWagerAndCheckConversion } = require('./helpers/gameReferralHelper');

/**
 * 💰 GET /api/v1/plinko/balance
 * Получить баланс игрока для выбранной валюты
 */
router.get('/api/v1/plinko/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokenId = parseInt(req.query.tokenId) || 2; // По умолчанию USDT, но можно выбрать любую валюту

    const mainBalance = await prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'MAIN' } },
      include: { token: true }
    });

    const bonusBalance = await prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } },
      include: { token: true }
    });

    const main = parseFloat(mainBalance?.amount?.toString() || '0');
    const bonus = parseFloat(bonusBalance?.amount?.toString() || '0');
    const token = mainBalance?.token || bonusBalance?.token;

    res.json({
      success: true,
      balance: main + bonus,
      mainBalance: main,
      bonusBalance: bonus,
      tokenId: tokenId,
      currency: token?.symbol || 'USDT',
      network: token?.network || 'TRC-20'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 🎮 POST /api/v1/plinko/drop
 * Бросить один шарик
 */
router.post('/api/v1/plinko/drop', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { betAmount, tokenId: requestTokenId } = req.body;
    const tokenId = requestTokenId || 2;

    if (!betAmount || betAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Укажите ставку' });
    }

    // Получаем токен для проверки лимитов
    const token = await prisma.cryptoToken.findUnique({
      where: { id: tokenId }
    });

    if (!token) {
      return res.status(400).json({ success: false, error: 'Валюта не найдена' });
    }

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

    // Списываем ставку (АТОМАРНАЯ ОПЕРАЦИЯ - защита от race condition)
    const deductResult = await deductBetFromBalance(userId, parseFloat(betAmount), tokenId);
    if (!deductResult.success) {
      return res.status(400).json({ success: false, error: deductResult.error || 'Недостаточно средств' });
    }

    // Генерируем результат
    const gameData = await plinkoService.createGame(userId, tokenId, betAmount);
    const winAmount = parseFloat(gameData.winAmount);

    // Зачисляем выигрыш
    if (winAmount > 0) {
      await creditWinnings(userId, winAmount, tokenId, deductResult.balanceType);
      // Plinko: в отыгрыш идёт вся выигранная сумма
      if (deductResult.balanceType === 'BONUS' && deductResult.userBonusId) {
        await updateWagerAndCheckConversion(userId, winAmount, tokenId, deductResult.userBonusId);
      }
    }

    // Получаем обновлённый баланс
    const mainBalance = await prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'MAIN' } }
    });
    const bonusBalance = await prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } }
    });
    
    const newBalance = parseFloat(mainBalance?.amount?.toString() || '0') + 
                       parseFloat(bonusBalance?.amount?.toString() || '0');

    res.json({
      success: true,
      ball: {
        id: gameData.gameId,
        directions: gameData.directions,
        slot: gameData.slot,
        multiplier: gameData.multiplier,
        betAmount: parseFloat(betAmount),
        winAmount: gameData.winAmount
      },
      newBalance
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 🎮 POST /api/v1/plinko/play
 * Совместимость со старым API
 */
router.post('/api/v1/plinko/play', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { betAmount, tokenId: requestTokenId } = req.body;
    const tokenId = requestTokenId || 2;

    if (!betAmount || betAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Укажите ставку' });
    }

    // Списываем ставку (АТОМАРНАЯ ОПЕРАЦИЯ - защита от race condition)
    const deductResult = await deductBetFromBalance(userId, parseFloat(betAmount), tokenId);
    if (!deductResult.success) {
      return res.status(400).json({ success: false, error: deductResult.error });
    }

    // Генерируем результат
    const gameData = await plinkoService.createGame(userId, tokenId, betAmount);
    const winAmount = parseFloat(gameData.winAmount);

    // Зачисляем выигрыш
    if (winAmount > 0) {
      await creditWinnings(userId, winAmount, tokenId, deductResult.balanceType);
      // Plinko: в отыгрыш идёт вся выигранная сумма
      if (deductResult.balanceType === 'BONUS' && deductResult.userBonusId) {
        await updateWagerAndCheckConversion(userId, winAmount, tokenId, deductResult.userBonusId);
      }
    }

    // Баланс
    const mainBalance = await prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'MAIN' } }
    });
    const bonusBalance = await prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } }
    });
    
    const newBalance = parseFloat(mainBalance?.amount?.toString() || '0') + 
                       parseFloat(bonusBalance?.amount?.toString() || '0');

    const isWin = winAmount >= parseFloat(betAmount);

    res.json({
      success: true,
      gameId: gameData.gameId.toString(),
      result: isWin ? 'win' : 'loss',
      payout: gameData.multiplier,
      multiplier: gameData.multiplier,
      betAmount: parseFloat(betAmount),
      winAmount,
      newBalance,
      path: gameData.ballPath.map(p => p.col),
      ballPath: gameData.ballPath,
      finalPosition: gameData.finalPosition
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 📜 GET /api/v1/plinko/history
 * История игр
 */
router.get('/api/v1/plinko/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;

    const games = await plinkoService.getGameHistory(userId, limit);

    res.json({
      success: true,
      data: games.map(g => ({
        gameId: g.gameId.toString(),
        payout: g.multiplier,
        betAmount: g.betAmount,
        winAmount: g.winAmount,
        result: g.winAmount >= g.betAmount ? 'win' : 'loss',
        createdAt: g.createdAt
      }))
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 📊 GET /api/v1/plinko/stats
 * Статистика игрока
 */
router.get('/api/v1/plinko/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokenId = parseInt(req.query.tokenId) || 2; // По умолчанию USDT
    const stats = await plinkoService.getPlayerStats(userId, tokenId);

    res.json({
      success: true,
      data: {
        totalGames: stats.totalGames,
        totalBet: parseFloat(stats.totalBet),
        totalWin: parseFloat(stats.totalWin),
        profit: parseFloat(stats.profit),
        roi: parseFloat(stats.roi)
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ⚙️ GET /api/v1/plinko/config
 * Настройки игры (множители, вероятности)
 */
router.get('/api/v1/plinko/config', async (req, res) => {
  try {
    const PlinkoService = require('../services/PlinkoService');
    const currencySyncService = require('../services/currencySyncService');
    const { tokenId } = req.query;
    
    // Если передан tokenId, возвращаем максимальную ставку для этой валюты
    let maxBet = 1000; // По умолчанию для USDT
    let minBet = 0.1;
    
    if (tokenId) {
      maxBet = await currencySyncService.getMaxBetForToken(parseInt(tokenId));
      const token = await prisma.cryptoToken.findUnique({
        where: { id: parseInt(tokenId) }
      });
      if (token) {
        minBet = currencySyncService.getMinBetForCurrency(token.symbol);
      }
    }
    
    res.json({
      success: true,
      config: {
        rows: PlinkoService.ROWS,
        slots: PlinkoService.MULTIPLIERS.length,
        multipliers: PlinkoService.MULTIPLIERS, // Используем мультипликаторы из сервиса
        minBet: minBet,
        maxBet: maxBet
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;


