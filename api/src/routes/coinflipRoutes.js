/**
 * 🪙 COINFLIP ROUTES - Орёл или Решка
 * 
 * Поддерживает:
 * - Ставка + выбор стороны (heads / tails)
 * - Множитель выигрыша: 1.8x
 * - История игр
 * - Баланс
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const currencySyncService = require('../services/currencySyncService');
const logger = require('../utils/logger');
const { deductBetFromBalance, creditWinnings, updateWagerAndCheckConversion } = require('./helpers/gameReferralHelper');
const CoinFlipService = require('../services/CoinFlipService');

const COINFLIP_MULTIPLIER = CoinFlipService.MULTIPLIER; // 1.9x для house edge 5%

/**
 * 💰 GET /api/v1/coinflip/balance
 * Получить баланс игрока для выбранной валюты
 */
router.get('/api/v1/coinflip/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokenId = parseInt(req.query.tokenId) || 2;

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
    logger.error('COINFLIP', 'Failed to get balance', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 🪙 POST /api/v1/coinflip/play
 * Сделать ставку и подбросить монету
 * 
 * Body: { betAmount: number, choice: 1 | 2, tokenId?: number }
 * choice: 1 = орёл (heads), 2 = решка (tails)
 * result: 1 = орёл (heads), 2 = решка (tails)
 */
router.post('/api/v1/coinflip/play', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { betAmount, choice, tokenId: requestTokenId } = req.body;
    const tokenId = requestTokenId || 2;

    // Валидация
    if (!betAmount || betAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Укажите ставку' });
    }

    // Принимаем числа 1/2 или строки "heads"/"tails" для обратной совместимости
    let choiceNum;
    if (choice === 1 || choice === '1' || choice === 'heads') {
      choiceNum = 1;
    } else if (choice === 2 || choice === '2' || choice === 'tails') {
      choiceNum = 2;
    } else {
      return res.status(400).json({ success: false, error: 'Выберите 1 (орёл) или 2 (решка)' });
    }

    const choiceStr = choiceNum === 1 ? 'heads' : 'tails';

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

    // 💳 Списываем ставку (АТОМАРНАЯ ОПЕРАЦИЯ)
    const deductResult = await deductBetFromBalance(userId, parseFloat(betAmount), tokenId);
    if (!deductResult.success) {
      return res.status(400).json({ success: false, error: deductResult.error || 'Недостаточно средств' });
    }

    // 🎲 Генерируем результат с динамической вероятностью (house edge 5%)
    const gameResult = await CoinFlipService.generateResult(userId, tokenId, choiceNum);
    const resultNum = gameResult.result;
    const resultStr = resultNum === 1 ? 'heads' : 'tails';
    const isWin = gameResult.isWin;
    const winAmount = isWin ? parseFloat((betAmount * COINFLIP_MULTIPLIER).toFixed(8)) : 0;

    // 💾 Сохраняем игру в БД (храним строки для совместимости)
    const game = await prisma.coinFlipGame.create({
      data: {
        userId,
        tokenId,
        betAmount: parseFloat(betAmount).toFixed(8).toString(),
        winAmount: winAmount > 0 ? winAmount.toFixed(8).toString() : '0',
        choice: choiceStr,
        result: resultStr,
        multiplier: isWin ? COINFLIP_MULTIPLIER : 0,
        status: 'COMPLETED',
      }
    });

    // 💾 Сохраняем ставку
    await prisma.coinFlipBet.create({
      data: {
        userId,
        tokenId,
        gameId: game.id,
        betAmount: parseFloat(betAmount).toFixed(8).toString(),
        winAmount: winAmount > 0 ? winAmount.toFixed(8).toString() : '0',
        choice: choiceStr,
        result: resultStr,
        multiplier: isWin ? COINFLIP_MULTIPLIER : 0,
      }
    });

    // 🏆 Зачисляем выигрыш
    if (winAmount > 0) {
      await creditWinnings(userId, winAmount, tokenId, deductResult.balanceType);
      // В отыгрыш идёт только чистая прибыль (выигрыш − ставка)
      if (deductResult.balanceType === 'BONUS' && deductResult.userBonusId) {
        const profit = Math.max(0, winAmount - parseFloat(betAmount));
        await updateWagerAndCheckConversion(userId, profit, tokenId, deductResult.userBonusId);
      }
    }

    // 📊 Получаем обновлённый баланс
    const mainBalance = await prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'MAIN' } }
    });
    const bonusBalance = await prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } }
    });

    const newBalance = parseFloat(mainBalance?.amount?.toString() || '0') +
                       parseFloat(bonusBalance?.amount?.toString() || '0');

    logger.info('COINFLIP', isWin ? 'Player won' : 'Player lost', {
      userId,
      gameId: game.id,
      choice: choiceNum,
      result: resultNum,
      betAmount: parseFloat(betAmount),
      winAmount,
      winProbability: gameResult.winProbability,
    });

    res.json({
      success: true,
      data: {
        gameId: game.id,
        choice: choiceNum,
        result: resultNum,
        isWin,
        multiplier: isWin ? COINFLIP_MULTIPLIER : 0,
        betAmount: parseFloat(betAmount),
        winAmount,
        newBalance,
      }
    });

  } catch (error) {
    logger.error('COINFLIP', 'Failed to play', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 📜 GET /api/v1/coinflip/history
 * История игр
 */
router.get('/api/v1/coinflip/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;

    const games = await prisma.coinFlipGame.findMany({
      where: { userId },
      include: {
        token: { select: { symbol: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: games.map(g => ({
        id: g.id,
        choice: g.choice === 'heads' ? 1 : 2,
        result: g.result === 'heads' ? 1 : 2,
        isWin: g.choice === g.result,
        betAmount: parseFloat(g.betAmount.toString()),
        winAmount: g.winAmount ? parseFloat(g.winAmount.toString()) : 0,
        multiplier: g.multiplier,
        token: g.token.symbol,
        createdAt: g.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('COINFLIP', 'Failed to get history', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ⚙️ GET /api/v1/coinflip/config
 * Настройки игры
 */
router.get('/api/v1/coinflip/config', async (req, res) => {
  try {
    const { tokenId } = req.query;

    let maxBet = 1000;
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
        multiplier: COINFLIP_MULTIPLIER,
        minBet,
        maxBet,
        choices: ['heads', 'tails'],
        houseEdge: CoinFlipService.HOUSE_EDGE,
        rtp: CoinFlipService.RTP,
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 📊 GET /api/v1/coinflip/stats
 * Статистика игрока
 */
router.get('/api/v1/coinflip/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokenId = parseInt(req.query.tokenId) || 2;

    const stats = await CoinFlipService.getPlayerStats(userId, tokenId);

    if (!stats) {
      return res.status(500).json({ success: false, error: 'Failed to get stats' });
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('COINFLIP', 'Failed to get stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

