const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const minesweeperService = require('../services/MinesweeperService');
const currencySyncService = require('../services/currencySyncService');
const logger = require('../utils/logger');

const { deductBetFromBalance, creditWinnings, getUserBalances } = require('./helpers/gameReferralHelper');

/**
 * 🎮 GET все сложности
 */
router.get('/api/v1/minesweeper/difficulties', async (req, res) => {
  try {
    let difficulties = await prisma.minesweeperDifficulty.findMany();

    if (difficulties.length === 0) {
      const defaultDifficulties = [
        { name: 'EASY', minesCount: 6, gridSize: 6, multiplier: 1.5 },
        { name: 'MEDIUM', minesCount: 12, gridSize: 6, multiplier: 2.5 },
        { name: 'HARD', minesCount: 18, gridSize: 6, multiplier: 4.0 },
      ];

      for (const diff of defaultDifficulties) {
        await prisma.minesweeperDifficulty.create({ data: diff });
      }

      difficulties = await prisma.minesweeperDifficulty.findMany();
      }

    res.json({
      success: true,
      data: difficulties.map(d => ({
        id: d.id,
        name: d.name,
        minesCount: d.minesCount,
        multiplier: d.multiplier,
        gridSize: d.gridSize,
      })),
    });
  } catch (error) {
    logger.error('MINESWEEPER', 'Failed to get difficulties', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Ошибка получения сложностей',
    });
  }
});

/**
 * 🎮 POST создать новую игру
 */
router.post('/api/v1/minesweeper/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { minesCount, betAmount, tokenId } = req.body;
    const DEFAULT_TOKEN_ID = tokenId || 2;
    
    if (!minesCount || minesCount < 1 || !betAmount || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры (minesCount должен быть >= 1)',
      });
    }

    // Получаем токен для проверки лимитов
    const token = await prisma.cryptoToken.findUnique({
      where: { id: DEFAULT_TOKEN_ID }
    });

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Валюта не найдена',
      });
    }

    const minBet = currencySyncService.getMinBetForCurrency(token.symbol);
    const maxBet = currencySyncService.getMaxBetForCurrency(token.symbol);

    if (betAmount < minBet) {
      return res.status(400).json({
        success: false,
        message: `Минимальная ставка ${minBet} ${token.symbol}`,
      });
    }

    if (betAmount > maxBet) {
      return res.status(400).json({
        success: false,
        message: `Максимальная ставка ${maxBet} ${token.symbol}`,
      });
    }

    // 💳 Списываем ставку
    const deductResult = await deductBetFromBalance(userId, parseFloat(betAmount), DEFAULT_TOKEN_ID);
    
    if (!deductResult.success) {
      return res.status(400).json({
        success: false,
        message: deductResult.error || 'Недостаточно средств',
      });
    }
    // 🎮 Создаём игру (теперь передаём minesCount вместо difficultyId)
    const gameData = await minesweeperService.createGame(
      userId,
      DEFAULT_TOKEN_ID,
      parseInt(minesCount),
      betAmount
    );

    res.json({
      success: true,
      data: {
        ...gameData,
        balanceType: deductResult.balanceType,
        userBonusId: deductResult.userBonusId
      },
    });
    
  } catch (error) {
    logger.error('MINESWEEPER', 'Failed to start game', { error: error.message, stack: error.stack });
    console.error('MINESWEEPER START ERROR:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка создания игры',
    });
  }
});

/**
 * 🎮 POST открыть клетку
 * ✅ ПРАВИЛЬНАЯ ЛОГИКА: 
 * 1. Выигрыш зачисляется СРАЗУ
 * 2. Вейджер считается от выигрыша
 * 3. Конверсия BONUS → MAIN происходит СРАЗУ если вейджер выполнен
 */
router.post('/api/v1/minesweeper/reveal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameId, x, y, balanceType, userBonusId } = req.body;

    if (gameId === undefined || x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры',
      });
    }

    const result = await minesweeperService.revealGameCell(gameId, x, y, userId);

    // 🎉 ПОЛНАЯ ПОБЕДА - ЗАЧИСЛИТЬ ВЫИГРЫШ И ОБНОВИТЬ ВЕЙДЖЕР
    if (result.status === 'WON' && result.winAmount) {
      const winAmountNum = parseFloat(result.winAmount);
      const game = await prisma.minesweeperGame.findUnique({
        where: { id: gameId },
        select: { tokenId: true, betAmount: true },
      });

      if (game) {
        const betAmountNum = parseFloat(game.betAmount?.toString() || '0');
        const wagerProfit = Math.max(0, winAmountNum - betAmountNum);

        // 🔒 ИСПОЛЬЗУЕМ TRANSACTIONS для атомарности
        await prisma.$transaction(async (tx) => {
          // 1️⃣ ЗАЧИСЛЯЕМ ВЫИГРЫШ СРАЗУ
          await tx.balance.upsert({
            where: {
              userId_tokenId_type: { userId, tokenId: game.tokenId, type: balanceType || 'MAIN' }
            },
            create: {
              userId,
              tokenId: game.tokenId,
              type: balanceType || 'MAIN',
              amount: winAmountNum.toFixed(8).toString()
            },
            update: {
              amount: { increment: winAmountNum }
            }
          });

          // 2️⃣ ЕСЛИ БЫЛА СТАВКА С BONUS - обновляем вейджер (в отыгрыш идёт только чистая прибыль)
          if (balanceType === 'BONUS' && userBonusId) {
            const bonus = await tx.userBonus.findUnique({
              where: { id: userBonusId }
            });
            
            if (!bonus) {
              throw new Error('Бонус не найден');
            }

            const currentWagered = parseFloat(bonus.wageredAmount.toString());
            const newWagered = parseFloat((currentWagered + wagerProfit).toFixed(8));
            const requiredNum = parseFloat(bonus.requiredWager.toString());

            // Обновляем wageredAmount в БД
            await tx.userBonus.update({
              where: { id: userBonusId },
              data: { wageredAmount: newWagered.toFixed(8).toString() }
            });

            // 3️⃣ ПРОВЕРЯЕМ: вейджер выполнен?
            if (newWagered >= requiredNum) {
              // Получаем текущий BONUS баланс для конверсии
              const currentBonus = await tx.balance.findUnique({
                where: {
                  userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
                }
              });

              const bonusBalanceForConversion = parseFloat(currentBonus?.amount?.toString() || '0');

              if (bonusBalanceForConversion > 0) {
                // 1. Обнуляем BONUS баланс
                await tx.balance.update({
                  where: { id: currentBonus.id },
                  data: { amount: '0' }
                });
                
                // 2. Добавляем ВСЮ сумму в MAIN
                await tx.balance.upsert({
                  where: {
                    userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'MAIN' }
                  },
                  update: {
                    amount: { increment: bonusBalanceForConversion }
                  },
                  create: {
                    userId,
                    tokenId: game.tokenId,
                    type: 'MAIN',
                    amount: bonusBalanceForConversion.toFixed(8).toString()
                  }
                });

                } else {
                }
              
              // 3. Отмечаем бонус завершённым
              await tx.userBonus.update({
                where: { id: userBonusId },
                data: { 
                  isCompleted: true,
                  isActive: false
                }
              });
              
              }
          }
        });

        logger.info('MINESWEEPER', 'Game won', {
          gameId,
          userId,
          winAmount: winAmountNum.toFixed(8),
          balanceType
        });
      }
    } else if (result.status === 'LOST') {
      logger.info('MINESWEEPER', 'Game lost', {
        gameId,
        userId
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('MINESWEEPER', 'Failed to reveal cell', { error: error.message });
    
    res.status(400).json({
      success: false,
      message: error.message || 'Ошибка открытия клетки',
    });
  }
});

/**
 * 🎮 GET активная игра пользователя
 */
router.get('/api/v1/minesweeper/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const activeGame = await minesweeperService.getActiveGame(userId);

    if (!activeGame) {
      return res.json({
        success: true,
        data: null,
        message: 'Нет активной игры',
      });
    }

    res.json({
      success: true,
      data: activeGame,
    });
  } catch (error) {
    logger.error('MINESWEEPER', 'Failed to get active game', { error: error.message, stack: error.stack });
    console.error('MINESWEEPER ACTIVE GAME ERROR:', error);
    
    res.status(500).json({
      success: false,
      message: 'Ошибка получения активной игры',
    });
  }
});

/**
 * 🎮 GET история игр
 */
router.get('/api/v1/minesweeper/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;

    const games = await prisma.minesweeperGame.findMany({
      where: { userId },
      include: {
        difficulty: { select: { name: true } },
        token: { select: { symbol: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: games.map(g => ({
        id: g.id,
        difficulty: g.difficulty.name,
        betAmount: parseFloat(g.betAmount.toString()),
        winAmount: g.winAmount ? parseFloat(g.winAmount.toString()) : null,
        status: g.status,
        multiplier: g.multiplier,
        revealedCells: g.revealedCells,
        token: g.token.symbol,
        createdAt: g.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('MINESWEEPER', 'Failed to get history', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Ошибка получения истории',
    });
  }
});

/**
 * 💰 POST кэшаут (забрать выигрыш)
 * ✅ ПРАВИЛЬНАЯ ЛОГИКА: 
 * 1. Выигрыш зачисляется СРАЗУ
 * 2. Вейджер считается от выигрыша
 * 3. Конверсия BONUS → MAIN происходит СРАЗУ если вейджер выполнен
 */
router.post('/api/v1/minesweeper/cashout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameId, balanceType, userBonusId } = req.body;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать ID игры',
      });
    }

    const game = await prisma.minesweeperGame.findUnique({
      where: { id: gameId },
      select: { tokenId: true, userId: true, betAmount: true }
    });

    if (!game || game.userId !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Игра не найдена или не ваша',
      });
    }

    const result = await minesweeperService.cashOutGame(gameId, userId);

    // ✅ Зачисляем выигрыш и обновляем вейджер (в отыгрыш идёт только чистая прибыль)
    if (result.winAmount) {
      const winAmountNum = parseFloat(result.winAmount);
      const betAmountNum = parseFloat(game.betAmount?.toString() || '0');
      const wagerProfit = Math.max(0, winAmountNum - betAmountNum);

      if (winAmountNum > 0) {
        // 🔒 ИСПОЛЬЗУЕМ TRANSACTIONS для атомарности
        await prisma.$transaction(async (tx) => {
          // 1️⃣ ЗАЧИСЛЯЕМ ВЫИГРЫШ СРАЗУ
          await tx.balance.upsert({
            where: {
              userId_tokenId_type: { userId, tokenId: game.tokenId, type: balanceType || 'MAIN' }
            },
            create: {
              userId,
              tokenId: game.tokenId,
              type: balanceType || 'MAIN',
              amount: winAmountNum.toFixed(8).toString()
            },
            update: {
              amount: { increment: winAmountNum }
            }
          });

          // 2️⃣ ЕСЛИ БЫЛА СТАВКА С BONUS - обновляем вейджер
          if (balanceType === 'BONUS' && userBonusId) {
            const bonus = await tx.userBonus.findUnique({
              where: { id: userBonusId }
            });
            
            if (!bonus) {
              throw new Error('Бонус не найден');
            }

            const currentWagered = parseFloat(bonus.wageredAmount.toString());
            const newWagered = parseFloat((currentWagered + wagerProfit).toFixed(8));
            const requiredNum = parseFloat(bonus.requiredWager.toString());

            // Обновляем wageredAmount в БД
            await tx.userBonus.update({
              where: { id: userBonusId },
              data: { wageredAmount: newWagered.toFixed(8).toString() }
            });

            // 3️⃣ ПРОВЕРЯЕМ: вейджер выполнен?
            if (newWagered >= requiredNum) {
              // Получаем текущий BONUS баланс для конверсии
              const currentBonus = await tx.balance.findUnique({
                where: {
                  userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
                }
              });

              const bonusBalanceForConversion = parseFloat(currentBonus?.amount?.toString() || '0');

              if (bonusBalanceForConversion > 0) {
                // 1. Обнуляем BONUS баланс
                await tx.balance.update({
                  where: { id: currentBonus.id },
                  data: { amount: '0' }
                });
                
                // 2. Добавляем ВСЮ сумму в MAIN
                await tx.balance.upsert({
                  where: {
                    userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'MAIN' }
                  },
                  update: {
                    amount: { increment: bonusBalanceForConversion }
                  },
                  create: {
                    userId,
                    tokenId: game.tokenId,
                    type: 'MAIN',
                    amount: bonusBalanceForConversion.toFixed(8).toString()
                  }
                });

                } else {
                }
              
              // 3. Отмечаем бонус завершённым
              await tx.userBonus.update({
                where: { id: userBonusId },
                data: { 
                  isCompleted: true,
                  isActive: false
                }
              });
              
              }
          }
        });

        logger.info('MINESWEEPER', 'Game cashout successful', {
          gameId,
          userId,
          winAmount: winAmountNum.toFixed(8),
          balanceType
        });
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('MINESWEEPER', 'Failed to cashout', { error: error.message });
    
    res.status(400).json({
      success: false,
      message: error.message || 'Ошибка кэшаута',
    });
  }
});

/**
 * 🆕 GET баланс
 */
router.get('/api/v1/minesweeper/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokenId = parseInt(req.query.tokenId) || 2;

    const balances = await getUserBalances(userId, tokenId);

    res.json({
      success: true,
      data: balances
    });
  } catch (error) {
    logger.error('MINESWEEPER', 'Failed to get balance', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Ошибка получения баланса',
    });
  }
});

module.exports = router;

