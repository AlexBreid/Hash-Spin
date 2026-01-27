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
    
    console.log('🎮 [MINESWEEPER START] Начинаю игру');
    console.log('   userId:', userId);
    console.log('   minesCount:', minesCount);
    console.log('   betAmount:', betAmount);

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
    console.error('❌ [START] ОШИБКА:', error.message);
    logger.error('MINESWEEPER', 'Failed to start game', { error: error.message });
    
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

    console.log(`\n🎮 [REVEAL] Открываю клетку [${x}, ${y}]`);
    console.log(`   gameId: ${gameId}`);
    console.log(`   balanceType: ${balanceType}`);
    console.log(`   userBonusId: ${userBonusId}`);

    if (gameId === undefined || x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры',
      });
    }

    const result = await minesweeperService.revealGameCell(gameId, x, y, userId);

    console.log(`\n🎮 [REVEAL] Результат: ${result.status}`);
    console.log(`   win: ${result.status === 'WON'}`);
    console.log(`   winAmount: ${result.winAmount || 0}`);

    // 🎉 ПОЛНАЯ ПОБЕДА - ЗАЧИСЛИТЬ ВЫИГРЫШ И ОБНОВИТЬ ВЕЙДЖЕР
    if (result.status === 'WON' && result.winAmount) {
      const winAmountNum = parseFloat(result.winAmount);
      console.log(`\n🎉 [REVEAL] ПОЛНАЯ ПОБЕДА! Выигрыш: ${winAmountNum.toFixed(8)}`);
      
      const game = await prisma.minesweeperGame.findUnique({
        where: { id: gameId },
        select: { tokenId: true },
      });

      if (game) {
        // 🔒 ИСПОЛЬЗУЕМ TRANSACTIONS для атомарности
        await prisma.$transaction(async (tx) => {
          // 1️⃣ ЗАЧИСЛЯЕМ ВЫИГРЫШ СРАЗУ
          console.log(`\n💰 [REVEAL] Зачисляю выигрыш ${winAmountNum.toFixed(8)} на ${balanceType || 'MAIN'}`);
          
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

          console.log(`   ✅ Выигрыш зачислен на ${balanceType || 'MAIN'}`);

          // 2️⃣ ЕСЛИ БЫЛА СТАВКА С BONUS - обновляем вейджер
          if (balanceType === 'BONUS' && userBonusId) {
            console.log(`\n💛 [REVEAL] Обновляю вейджер бонуса...`);
            
            const bonus = await tx.userBonus.findUnique({
              where: { id: userBonusId }
            });
            
            if (!bonus) {
              throw new Error('Бонус не найден');
            }

            // ✅ ДОБАВЛЯЕМ ВЫИГРЫШ К WAGERED
            const currentWagered = parseFloat(bonus.wageredAmount.toString());
            const newWagered = parseFloat((currentWagered + winAmountNum).toFixed(8));
            const requiredNum = parseFloat(bonus.requiredWager.toString());

            console.log(`   💛 Вейджер: ${newWagered.toFixed(8)} / ${requiredNum.toFixed(8)}`);
            console.log(`   💛 Прогресс: ${((newWagered / requiredNum) * 100).toFixed(1)}%`);

            // Обновляем wageredAmount в БД
            await tx.userBonus.update({
              where: { id: userBonusId },
              data: { wageredAmount: newWagered.toFixed(8).toString() }
            });

            console.log(`   ✅ Вейджер обновлён`);

            // 3️⃣ ПРОВЕРЯЕМ: вейджер выполнен?
            if (newWagered >= requiredNum) {
              console.log(`\n🎊 [REVEAL] ВЕЙДЖЕР ВЫПОЛНЕН! ${newWagered.toFixed(8)} >= ${requiredNum.toFixed(8)}`);
              
              // Получаем текущий BONUS баланс для конверсии
              const currentBonus = await tx.balance.findUnique({
                where: {
                  userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
                }
              });

              const bonusBalanceForConversion = parseFloat(currentBonus?.amount?.toString() || '0');

              console.log(`\n💳 [REVEAL] Конвертирую ВСЮ сумму: ${bonusBalanceForConversion.toFixed(8)} BONUS → MAIN`);
              
              if (bonusBalanceForConversion > 0) {
                // 1. Обнуляем BONUS баланс
                await tx.balance.update({
                  where: { id: currentBonus.id },
                  data: { amount: '0' }
                });
                
                console.log(`   ✅ BONUS баланс обнулен`);
                
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

                console.log(`   ✅ MAIN +${bonusBalanceForConversion.toFixed(8)}`);
              } else {
                console.log(`   ℹ️ BONUS баланс пуст`);
              }
              
              // 3. Отмечаем бонус завершённым
              await tx.userBonus.update({
                where: { id: userBonusId },
                data: { 
                  isCompleted: true,
                  isActive: false
                }
              });
              
              console.log(`   ✅ Бонус завершён\n`);
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
      console.log(`\n💔 [REVEAL] Проиграли. Game over.`);
      
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
    console.error('❌ [REVEAL] ОШИБКА:', error.message);
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

    console.log(`🔍 [ACTIVE] Проверяю активную игру для пользователя ${userId}`);

    const activeGame = await minesweeperService.getActiveGame(userId);

    if (!activeGame) {
      console.log(`   ℹ️ Активная игра не найдена`);
      return res.json({
        success: true,
        data: null,
        message: 'Нет активной игры',
      });
    }

    console.log(`   ✅ Активная игра найдена: ID ${activeGame.gameId}`);

    res.json({
      success: true,
      data: activeGame,
    });
  } catch (error) {
    console.error('❌ [ACTIVE] Ошибка:', error.message);
    logger.error('MINESWEEPER', 'Failed to get active game', { error: error.message });
    
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

    console.log(`📚 [HISTORY] Загружаю историю игр пользователя ${userId}`);

    const games = await prisma.minesweeperGame.findMany({
      where: { userId },
      include: {
        difficulty: { select: { name: true } },
        token: { select: { symbol: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    console.log(`   ✅ Загружено ${games.length} игр`);

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

    console.log(`\n💸 [CASHOUT] Кэшаут игры ${gameId}`);
    console.log(`   balanceType: ${balanceType}`);
    console.log(`   userBonusId: ${userBonusId}`);

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

    console.log(`\n💰 [CASHOUT] Результат кэшаута: ${result.status}`);
    console.log(`   winAmount: ${result.winAmount || 0}`);

    // ✅ Зачисляем выигрыш и обновляем вейджер
    if (result.winAmount) {
      const winAmountNum = parseFloat(result.winAmount);
      
      if (winAmountNum > 0) {
        console.log(`\n💰 [CASHOUT] Зачисляю выигрыш: ${winAmountNum.toFixed(8)}`);

        // 🔒 ИСПОЛЬЗУЕМ TRANSACTIONS для атомарности
        await prisma.$transaction(async (tx) => {
          // 1️⃣ ЗАЧИСЛЯЕМ ВЫИГРЫШ СРАЗУ
          console.log(`   💰 [CASHOUT] На ${balanceType || 'MAIN'} баланс`);
          
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

          console.log(`   ✅ Выигрыш зачислен`);

          // 2️⃣ ЕСЛИ БЫЛА СТАВКА С BONUS - обновляем вейджер
          if (balanceType === 'BONUS' && userBonusId) {
            console.log(`\n💛 [CASHOUT] Обновляю вейджер бонуса...`);
            
            const bonus = await tx.userBonus.findUnique({
              where: { id: userBonusId }
            });
            
            if (!bonus) {
              throw new Error('Бонус не найден');
            }

            // ✅ ДОБАВЛЯЕМ ВЫИГРЫШ К WAGERED
            const currentWagered = parseFloat(bonus.wageredAmount.toString());
            const newWagered = parseFloat((currentWagered + winAmountNum).toFixed(8));
            const requiredNum = parseFloat(bonus.requiredWager.toString());

            console.log(`   💛 Вейджер: ${newWagered.toFixed(8)} / ${requiredNum.toFixed(8)}`);
            console.log(`   💛 Прогресс: ${((newWagered / requiredNum) * 100).toFixed(1)}%`);

            // Обновляем wageredAmount в БД
            await tx.userBonus.update({
              where: { id: userBonusId },
              data: { wageredAmount: newWagered.toFixed(8).toString() }
            });

            console.log(`   ✅ Вейджер обновлён`);

            // 3️⃣ ПРОВЕРЯЕМ: вейджер выполнен?
            if (newWagered >= requiredNum) {
              console.log(`\n🎊 [CASHOUT] ВЕЙДЖЕР ВЫПОЛНЕН! ${newWagered.toFixed(8)} >= ${requiredNum.toFixed(8)}`);
              
              // Получаем текущий BONUS баланс для конверсии
              const currentBonus = await tx.balance.findUnique({
                where: {
                  userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
                }
              });

              const bonusBalanceForConversion = parseFloat(currentBonus?.amount?.toString() || '0');

              console.log(`\n💳 [CASHOUT] Конвертирую ВСЮ сумму: ${bonusBalanceForConversion.toFixed(8)} BONUS → MAIN`);
              
              if (bonusBalanceForConversion > 0) {
                // 1. Обнуляем BONUS баланс
                await tx.balance.update({
                  where: { id: currentBonus.id },
                  data: { amount: '0' }
                });
                
                console.log(`   ✅ BONUS баланс обнулен`);
                
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

                console.log(`   ✅ MAIN +${bonusBalanceForConversion.toFixed(8)}`);
              } else {
                console.log(`   ℹ️ BONUS баланс пуст`);
              }
              
              // 3. Отмечаем бонус завершённым
              await tx.userBonus.update({
                where: { id: userBonusId },
                data: { 
                  isCompleted: true,
                  isActive: false
                }
              });
              
              console.log(`   ✅ Бонус завершён\n`);
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
    console.error('❌ [CASHOUT] ОШИБКА:', error.message);
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

    console.log(`💰 [BALANCE] Получаю баланс для игры (tokenId=${tokenId})`);

    const balances = await getUserBalances(userId, tokenId);

    res.json({
      success: true,
      data: balances
    });
  } catch (error) {
    console.error('❌ Ошибка баланса:', error.message);
    logger.error('MINESWEEPER', 'Failed to get balance', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Ошибка получения баланса',
    });
  }
});

module.exports = router;