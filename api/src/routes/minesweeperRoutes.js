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
 * Body: { difficultyId: 1, betAmount: 10, tokenId: 2 }
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
        userBonusId: deductResult.userBonusId  // 🆕 Передаём ID бонуса для отыгрыша
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
 * Body: { gameId: 1, x: 0, y: 0, balanceType: 'BONUS', userBonusId: 1 }
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
        // 🆕 ПРАВИЛЬНАЯ ЛОГИКА ВЕЙДЖЕРА
        if (balanceType === 'BONUS' && userBonusId) {
          // Обновляем wageredAmount при выигрыше
          await prisma.userBonus.update({
            where: { id: userBonusId },
            data: {
              wageredAmount: {
                increment: parseFloat(result.winAmount)
              }
            }
          });
          console.log(`💛 [REVEAL] Выигрыш добавлен в wageredAmount`);
          
          // Проверяем выполнился ли вейджер
          const bonus = await prisma.userBonus.findUnique({
            where: { id: userBonusId }
          });
          
          const wageredNum = parseFloat(bonus.wageredAmount.toString());
          const requiredNum = parseFloat(bonus.requiredWager.toString());
          
          if (wageredNum >= requiredNum) {
            // 🎊 Вейджер выполнен! Конвертируем в MAIN
            console.log(`🎊 [REVEAL] Вейджер выполнен! ${wageredNum} >= ${requiredNum}`);
            
            const bonusAmount = parseFloat(bonus.grantedAmount.toString());
            
            // Обнуляем BONUS
            await prisma.balance.update({
              where: {
                userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
              },
              data: { amount: 0 }
            });
            
            // Добавляем в MAIN
            await prisma.balance.upsert({
              where: {
                userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'MAIN' }
              },
              update: {
                amount: { increment: bonusAmount }
              },
              create: {
                userId,
                tokenId: game.tokenId,
                type: 'MAIN',
                amount: bonusAmount.toString()
              }
            });
            
            // Отмечаем бонус как завершённый
            await prisma.userBonus.update({
              where: { id: userBonusId },
              data: { isCompleted: true }
            });
            
            console.log(`✅ [REVEAL] ${bonusAmount} BONUS → MAIN`);
          } else {
            // Вейджер НЕ выполнен - выигрыш остаётся на BONUS
            console.log(`💛 [REVEAL] Вейджер НЕ выполнен: ${wageredNum} / ${requiredNum}`);
            await creditWinnings(userId, parseFloat(result.winAmount), game.tokenId, 'BONUS');
          }
        } else {
          // Обычное зачисление на MAIN
          await creditWinnings(userId, parseFloat(result.winAmount), game.tokenId, 'MAIN');
          console.log(`✅ [REVEAL] Выигрыш ${result.winAmount} на MAIN`);
        }
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
 * Body: { gameId: 1, balanceType: 'MAIN', userBonusId: 1 }
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
        // 🆕 ПРАВИЛЬНАЯ ЛОГИКА ВЕЙДЖЕРА
        if (balanceType === 'BONUS' && userBonusId) {
          // Обновляем wageredAmount
          await prisma.userBonus.update({
            where: { id: userBonusId },
            data: {
              wageredAmount: {
                increment: winAmountNum
              }
            }
          });
          
          // Проверяем вейджер
          const bonus = await prisma.userBonus.findUnique({
            where: { id: userBonusId }
          });
          
          const wageredNum = parseFloat(bonus.wageredAmount.toString());
          const requiredNum = parseFloat(bonus.requiredWager.toString());
          
          if (wageredNum >= requiredNum) {
            // 🎊 Вейджер выполнен!
            console.log(`🎊 [CASHOUT] Вейджер выполнен! Конвертирую BONUS → MAIN`);
            
            const bonusAmount = parseFloat(bonus.grantedAmount.toString());
            
            await prisma.balance.update({
              where: {
                userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'BONUS' }
              },
              data: { amount: 0 }
            });
            
            await prisma.balance.upsert({
              where: {
                userId_tokenId_type: { userId, tokenId: game.tokenId, type: 'MAIN' }
              },
              update: {
                amount: { increment: bonusAmount }
              },
              create: {
                userId,
                tokenId: game.tokenId,
                type: 'MAIN',
                amount: bonusAmount.toString()
              }
            });
            
            await prisma.userBonus.update({
              where: { id: userBonusId },
              data: { isCompleted: true }
            });
            
            console.log(`✅ [CASHOUT] ${bonusAmount} BONUS → MAIN`);
          } else {
            // Выигрыш на BONUS
            await creditWinnings(userId, winAmountNum, game.tokenId, 'BONUS');
            console.log(`💛 [CASHOUT] Выигрыш на BONUS, вейджер: ${wageredNum} / ${requiredNum}`);
          }
        } else {
          // На MAIN как обычно
          await creditWinnings(userId, winAmountNum, game.tokenId, 'MAIN');
          console.log(`✅ [CASHOUT] Выигрыш ${result.winAmount} на MAIN`);
        }
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