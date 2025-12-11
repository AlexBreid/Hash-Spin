const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const minesweeperService = require('../services/MinesweeperService');

const { deductBetFromBalance, creditWinnings, getUserBalances } = require('./helpers/gameReferralHelper');

/**
 * 🎮 GET все сложности
 */
router.get('/api/v1/minesweeper/difficulties', async (req, res) => {
  try {
    console.log('📊 Загружаю сложности сапёра');

    let difficulties = await prisma.minesweeperDifficulty.findMany();

    if (difficulties.length === 0) {
      console.log('🔧 Инициализирую сложности...');
      
      const defaultDifficulties = [
        { name: 'EASY', minesCount: 6, gridSize: 6, multiplier: 1.5 },
        { name: 'MEDIUM', minesCount: 12, gridSize: 6, multiplier: 2.5 },
        { name: 'HARD', minesCount: 18, gridSize: 6, multiplier: 4.0 },
      ];

      for (const diff of defaultDifficulties) {
        await prisma.minesweeperDifficulty.create({ data: diff });
      }

      difficulties = await prisma.minesweeperDifficulty.findMany();
      console.log(`✅ Сложности инициализированы: ${difficulties.length} шт.`);
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
    console.error('❌ Ошибка получения сложностей:', error.message);
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
    const { difficultyId, betAmount, tokenId } = req.body;
    const DEFAULT_TOKEN_ID = tokenId || 2;
    
    console.log('🎮 [MINESWEEPER START] Начинаю игру');
    console.log('   userId:', userId);
    console.log('   betAmount:', betAmount);

    if (!difficultyId || !betAmount || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры',
      });
    }

    // 💳 Списываем ставку
    console.log('💳 [START] Списываю ставку...');
    const deductResult = await deductBetFromBalance(userId, parseFloat(betAmount), DEFAULT_TOKEN_ID);
    
    if (!deductResult.success) {
      console.log(`❌ [START] ${deductResult.error}`);
      return res.status(400).json({
        success: false,
        message: deductResult.error || 'Недостаточно средств',
      });
    }
    console.log(`✅ [START] Списано ${betAmount} с ${deductResult.balanceType}`);

    // 🎮 Создаём игру
    const gameData = await minesweeperService.createGame(
      userId,
      DEFAULT_TOKEN_ID,
      difficultyId,
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
    console.error('❌ [START] ОШИБКА:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка создания игры',
    });
  }
});

/**
 * 🎮 POST открыть клетку
 * ✅ ПРАВИЛЬНАЯ ЛОГИКА: Конвертируется ВСЯ оставшаяся сумма BONUS
 */
router.post('/api/v1/minesweeper/reveal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameId, x, y, balanceType, userBonusId } = req.body;

    console.log(`🎮 [REVEAL] Клетка [${x}, ${y}]`);

    if (gameId === undefined || x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры',
      });
    }

    const result = await minesweeperService.revealGameCell(gameId, x, y, userId);

    // 🎉 ПОЛНАЯ ПОБЕДА - ЗАЧИСЛИТЬ ВЫИГРЫШ
    if (result.status === 'WON' && result.winAmount) {
      console.log(`🎉 [REVEAL] Полная победа! Выигрыш: ${result.winAmount}`);
      
      const game = await prisma.minesweeperGame.findUnique({
        where: { id: gameId },
        select: { tokenId: true },
      });

      if (game) {
        // 🔒 ИСПОЛЬЗУЕМ TRANSACTIONS
        await prisma.$transaction(async (tx) => {
          const winAmountNum = parseFloat(result.winAmount);

          // 🆕 ПРАВИЛЬНАЯ ЛОГИКА ВЕЙДЖЕРА
          if (balanceType === 'BONUS' && userBonusId) {
            console.log(`\n💛 [REVEAL] Выигрыш с BONUS баланса: ${winAmountNum}`);
            
            // Получаем информацию о бонусе
            const bonus = await tx.userBonus.findUnique({
              where: { id: userBonusId }
            });
            
            if (!bonus) {
              throw new Error('Бонус не найден');
            }

            // УВЕЛИЧИВАЕМ WAGERED
            const newWagered = parseFloat(bonus.wageredAmount.toString()) + winAmountNum;
            const requiredNum = parseFloat(bonus.requiredWager.toString());

            console.log(`💛 [REVEAL] Вейджер: ${newWagered.toFixed(8)} / ${requiredNum.toFixed(8)}`);

            // Обновляем wageredAmount
            await tx.userBonus.update({
              where: { id: userBonusId },
              data: { wageredAmount: newWagered.toString() }
            });

            // Кредитим выигрыш на BONUS
            const currentBonus = await tx.balance.findUnique({
              where: {
                userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
              }
            });

            const bonusBalanceAfterWin = parseFloat(currentBonus?.amount?.toString() || '0') + winAmountNum;

            await tx.balance.upsert({
              where: {
                userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
              },
              update: {
                amount: { increment: winAmountNum }
              },
              create: {
                userId,
                tokenId: game.tokenId,
                type: 'BONUS',
                amount: winAmountNum.toString()
              }
            });

            console.log(`💛 [REVEAL] BONUS баланс после выигрыша: ${bonusBalanceAfterWin.toFixed(8)}`);

            // 🎊 ПРОВЕРЯЕМ: вейджер выполнен?
            if (newWagered >= requiredNum) {
              console.log(`\n🎊 [REVEAL] ВЕЙДЖЕР ВЫПОЛНЕН! ${newWagered.toFixed(8)} >= ${requiredNum.toFixed(8)}`);
              
              // ✅ ПРАВИЛЬНАЯ КОНВЕРСИЯ: Конвертируем ВСЮ оставшуюся сумму!
              console.log(`💳 [REVEAL] Конвертирую ВСЮ сумму: ${bonusBalanceAfterWin.toFixed(8)} BONUS → MAIN`);
              
              // 1. Обнуляем BONUS баланс
              await tx.balance.update({
                where: {
                  userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
                },
                data: { amount: 0 }
              });
              
              // 2. Добавляем ВСЮ сумму в MAIN
              await tx.balance.upsert({
                where: {
                  userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'MAIN' }
                },
                update: {
                  amount: { increment: bonusBalanceAfterWin }
                },
                create: {
                  userId,
                  tokenId: game.tokenId,
                  type: 'MAIN',
                  amount: bonusBalanceAfterWin.toString()
                }
              });
              
              // 3. Отмечаем бонус завершённым
              await tx.userBonus.update({
                where: { id: userBonusId },
                data: { 
                  isCompleted: true,
                  isActive: false
                }
              });
              
              console.log(`✅ [REVEAL] ${bonusBalanceAfterWin.toFixed(8)} BONUS → MAIN (всё конвертировано!)\n`);
            }
          } else {
            // Обычное зачисление на MAIN (без бонуса)
            console.log(`✅ [REVEAL] Выигрыш ${winAmountNum} на MAIN`);
            
            await tx.balance.upsert({
              where: {
                userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'MAIN' }
              },
              update: {
                amount: { increment: winAmountNum }
              },
              create: {
                userId,
                tokenId: game.tokenId,
                type: 'MAIN',
                amount: winAmountNum.toString()
              }
            });
          }
        });
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ [REVEAL] ОШИБКА:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Ошибка открытия клетки',
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
    console.error('❌ Ошибка истории:', error.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения истории',
    });
  }
});

/**
 * 💰 POST кэшаут (забрать выигрыш)
 * ✅ ПРАВИЛЬНАЯ ЛОГИКА: Конвертируется ВСЯ оставшаяся сумма BONUS
 */
router.post('/api/v1/minesweeper/cashout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameId, balanceType, userBonusId } = req.body;

    console.log(`💸 [CASHOUT] Игра ${gameId}`);

    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать ID игры',
      });
    }

    const game = await prisma.minesweeperGame.findUnique({
      where: { id: gameId },
      select: { tokenId: true, userId: true }
    });

    if (!game || game.userId !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Игра не найдена или не ваша',
      });
    }

    const result = await minesweeperService.cashOutGame(gameId, userId);

    // ✅ Зачисляем выигрыш
    if (result.winAmount) {
      const winAmountNum = parseFloat(result.winAmount);
      
      if (winAmountNum > 0) {
        // 🔒 ИСПОЛЬЗУЕМ TRANSACTIONS
        await prisma.$transaction(async (tx) => {
          // 🆕 ПРАВИЛЬНАЯ ЛОГИКА ВЕЙДЖЕРА
          if (balanceType === 'BONUS' && userBonusId) {
            console.log(`\n💛 [CASHOUT] Выигрыш с BONUS баланса: ${winAmountNum}`);
            
            // Получаем информацию о бонусе
            const bonus = await tx.userBonus.findUnique({
              where: { id: userBonusId }
            });
            
            if (!bonus) {
              throw new Error('Бонус не найден');
            }

            // УВЕЛИЧИВАЕМ WAGERED
            const newWagered = parseFloat(bonus.wageredAmount.toString()) + winAmountNum;
            const requiredNum = parseFloat(bonus.requiredWager.toString());

            console.log(`💛 [CASHOUT] Вейджер: ${newWagered.toFixed(8)} / ${requiredNum.toFixed(8)}`);

            // Обновляем wageredAmount
            await tx.userBonus.update({
              where: { id: userBonusId },
              data: { wageredAmount: newWagered.toString() }
            });

            // Кредитим выигрыш на BONUS
            const currentBonus = await tx.balance.findUnique({
              where: {
                userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
              }
            });

            const bonusBalanceAfterWin = parseFloat(currentBonus?.amount?.toString() || '0') + winAmountNum;

            await tx.balance.upsert({
              where: {
                userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
              },
              update: {
                amount: { increment: winAmountNum }
              },
              create: {
                userId,
                tokenId: game.tokenId,
                type: 'BONUS',
                amount: winAmountNum.toString()
              }
            });

            console.log(`💛 [CASHOUT] BONUS баланс после выигрыша: ${bonusBalanceAfterWin.toFixed(8)}`);

            // 🎊 ПРОВЕРЯЕМ: вейджер выполнен?
            if (newWagered >= requiredNum) {
              console.log(`\n🎊 [CASHOUT] ВЕЙДЖЕР ВЫПОЛНЕН! Конвертирую ВСЮ сумму`);
              
              // ✅ ПРАВИЛЬНАЯ КОНВЕРСИЯ: Конвертируем ВСЮ оставшуюся сумму!
              console.log(`💳 [CASHOUT] Конвертирую ВСЮ сумму: ${bonusBalanceAfterWin.toFixed(8)} BONUS → MAIN`);
              
              // 1. Обнуляем BONUS баланс
              await tx.balance.update({
                where: {
                  userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
                },
                data: { amount: 0 }
              });
              
              // 2. Добавляем ВСЮ сумму в MAIN
              await tx.balance.upsert({
                where: {
                  userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'MAIN' }
                },
                update: {
                  amount: { increment: bonusBalanceAfterWin }
                },
                create: {
                  userId,
                  tokenId: game.tokenId,
                  type: 'MAIN',
                  amount: bonusBalanceAfterWin.toString()
                }
              });
              
              // 3. Отмечаем бонус завершённым
              await tx.userBonus.update({
                where: { id: userBonusId },
                data: { 
                  isCompleted: true,
                  isActive: false
                }
              });
              
              console.log(`✅ [CASHOUT] ${bonusBalanceAfterWin.toFixed(8)} BONUS → MAIN (всё конвертировано!)\n`);
            }
          } else {
            // На MAIN как обычно
            console.log(`✅ [CASHOUT] Выигрыш ${winAmountNum} на MAIN`);
            
            await tx.balance.upsert({
              where: {
                userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'MAIN' }
              },
              update: {
                amount: { increment: winAmountNum }
              },
              create: {
                userId,
                tokenId: game.tokenId,
                type: 'MAIN',
                amount: winAmountNum.toString()
              }
            });
          }
        });
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ [CASHOUT] ОШИБКА:', error.message);
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
    console.error('❌ Ошибка баланса:', error.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения баланса',
    });
  }
});

module.exports = router;