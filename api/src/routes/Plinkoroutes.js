// plinkoRoutes.js - РОУТЫ ДЛЯ ИГРЫ PLINKO
const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const plinkoService = require('../services/Plinkoservice');
const logger = require('../utils/logger');

const { deductBetFromBalance, creditWinnings, getUserBalances } = require('./helpers/gameReferralHelper');

/**
 * 🎮 POST создать новую игру Plinko
 */
router.post('/api/v1/plinko/play', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { betAmount, tokenId } = req.body;
    const DEFAULT_TOKEN_ID = tokenId || 2;

    console.log('🎮 [PLINKO PLAY] Начинаю игру');
    console.log('   userId:', userId);
    console.log('   betAmount:', betAmount);

    if (!betAmount || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Некорректная ставка',
      });
    }

    // 💳 Списываем ставку
    console.log('💳 [PLAY] Списываю ставку...');
    const deductResult = await deductBetFromBalance(userId, parseFloat(betAmount), DEFAULT_TOKEN_ID);

    if (!deductResult.success) {
      console.log(`❌ [PLAY] ${deductResult.error}`);
      return res.status(400).json({
        success: false,
        message: deductResult.error || 'Недостаточно средств',
      });
    }
    console.log(`✅ [PLAY] Списано ${betAmount} с ${deductResult.balanceType}`);

    // 🎮 Создаём игру и генерируем путь шарика
    const gameData = await plinkoService.createGame(
      userId,
      DEFAULT_TOKEN_ID,
      betAmount
    );

    // 🏆 Зачисляем выигрыш СРАЗУ
    const winAmount = parseFloat(gameData.winAmount);
    if (winAmount > 0) {
      console.log(`\n💰 [PLAY] Зачисляю выигрыш: ${winAmount.toFixed(8)}`);

      await creditWinnings(userId, winAmount, DEFAULT_TOKEN_ID, deductResult.balanceType);

      console.log(`✅ [PLAY] Выигрыш зачислен на ${deductResult.balanceType}`);

      // 💛 Если была ставка с BONUS - обновляем вейджер
      if (deductResult.balanceType === 'BONUS' && deductResult.userBonusId) {
        console.log(`\n💛 [PLAY] Обновляю вейджер бонуса...`);

        const bonus = await prisma.userBonus.findUnique({
          where: { id: deductResult.userBonusId }
        });

        if (bonus) {
          const currentWagered = parseFloat(bonus.wageredAmount.toString());
          const newWagered = parseFloat((currentWagered + winAmount).toFixed(8));
          const requiredNum = parseFloat(bonus.requiredWager.toString());

          console.log(`   💛 Вейджер: ${newWagered.toFixed(8)} / ${requiredNum.toFixed(8)}`);

          await prisma.userBonus.update({
            where: { id: deductResult.userBonusId },
            data: { wageredAmount: newWagered.toFixed(8).toString() }
          });

          console.log(`   ✅ Вейджер обновлён`);

          // Проверяем выполнен ли вейджер
          if (newWagered >= requiredNum) {
            console.log(`\n🎊 [PLAY] ВЕЙДЖЕР ВЫПОЛНЕН!`);

            const currentBonus = await prisma.balance.findUnique({
              where: {
                userId_tokenId_type: { userId, tokenId: DEFAULT_TOKEN_ID, type: 'BONUS' }
              }
            });

            const bonusBalanceForConversion = parseFloat(currentBonus?.amount?.toString() || '0');

            if (bonusBalanceForConversion > 0) {
              await prisma.$transaction(async (tx) => {
                await tx.balance.update({
                  where: { id: currentBonus.id },
                  data: { amount: '0' }
                });

                await tx.balance.upsert({
                  where: {
                    userId_tokenId_type: { userId, tokenId: DEFAULT_TOKEN_ID, type: 'MAIN' }
                  },
                  update: {
                    amount: { increment: bonusBalanceForConversion }
                  },
                  create: {
                    userId,
                    tokenId: DEFAULT_TOKEN_ID,
                    type: 'MAIN',
                    amount: bonusBalanceForConversion.toFixed(8).toString()
                  }
                });

                await tx.userBonus.update({
                  where: { id: deductResult.userBonusId },
                  data: {
                    isCompleted: true,
                    isActive: false
                  }
                });
              });

              console.log(`   ✅ Бонус конвертирован: ${bonusBalanceForConversion.toFixed(8)} BONUS → MAIN\n`);
            }
          }
        }
      }
    }

    logger.info('PLINKO', 'Game played', {
      gameId: gameData.gameId,
      userId,
      betAmount: betAmount.toString(),
      winAmount: winAmount.toFixed(8),
      multiplier: gameData.multiplier,
      finalPosition: gameData.finalPosition
    });

    res.json({
      success: true,
      data: gameData,
    });

  } catch (error) {
    console.error('❌ [PLAY] ОШИБКА:', error.message);
    logger.error('PLINKO', 'Failed to play game', { error: error.message });

    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка создания игры',
    });
  }
});

/**
 * 📚 GET история игр Plinko
 */
router.get('/api/v1/plinko/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;

    console.log(`📚 [HISTORY] Загружаю историю Plinko пользователя ${userId}`);

    const games = await plinkoService.getGameHistory(userId, limit);

    console.log(`   ✅ Загружено ${games.length} игр`);

    res.json({
      success: true,
      data: games,
    });
  } catch (error) {
    console.error('❌ Ошибка истории:', error.message);
    logger.error('PLINKO', 'Failed to get history', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Ошибка получения истории',
    });
  }
});

/**
 * 📊 GET статистика игрока
 */
router.get('/api/v1/plinko/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokenId = parseInt(req.query.tokenId) || 2;

    console.log(`📊 [STATS] Получаю статистику Plinko для ${userId}`);

    const stats = await plinkoService.getPlayerStats(userId, tokenId);

    console.log(`   ✅ Статистика получена`);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Ошибка статистики:', error.message);
    logger.error('PLINKO', 'Failed to get stats', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики',
    });
  }
});

/**
 * 📋 GET информация об игре
 */
router.get('/api/v1/plinko/info', (req, res) => {
  try {
    const plinkoServiceModule = require('../services/Plinkoservice');
    const stats = plinkoServiceModule.constructor.getMultiplierStats();

    res.json({
      success: true,
      data: {
        name: 'Plinko',
        description: 'Шарик падает через колышки. Чем ближе к центру, тем больше выигрыш.',
        rows: 9,
        slots: 15,
        multipliers: [0.1, 0.2, 0.5, 1, 1.5, 2, 3, 5, 7, 10, 14, 20, 30, 50, 100],
        stats: stats,
        minBet: 0.01,
        maxBet: 1000000,
      },
    });
  } catch (error) {
    console.error('❌ Ошибка информации:', error.message);

    res.status(500).json({
      success: false,
      message: 'Ошибка получения информации',
    });
  }
});

/**
 * 🆕 GET получить одну игру
 */
router.get('/api/v1/plinko/game/:gameId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameId } = req.params;

    const game = await prisma.plinkoGame.findUnique({
      where: { id: parseInt(gameId) },
    });

    if (!game || game.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Игра не найдена',
      });
    }

    res.json({
      success: true,
      data: {
        gameId: game.id,
        betAmount: parseFloat(game.betAmount.toString()),
        multiplier: game.multiplier,
        winAmount: parseFloat(game.winAmount.toString()),
        finalPosition: game.finalPosition,
        ballPath: JSON.parse(game.ballPath),
        createdAt: game.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Ошибка получения игры:', error.message);
    logger.error('PLINKO', 'Failed to get game', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Ошибка получения игры',
    });
  }
});

module.exports = router;