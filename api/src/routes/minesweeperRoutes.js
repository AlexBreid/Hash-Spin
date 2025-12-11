const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const minesweeperService = require('../services/MinesweeperService');

// 🆕 Импорт хелпера реферальной системы
const { deductBetFromBalance, creditWinnings, getUserBalances } = require('./helpers/gameReferralHelper');

/**
 * 🎮 GET все сложности
 * GET /api/v1/minesweeper/difficulties
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
 * POST /api/v1/minesweeper/start
 * Body: { difficultyId: 1, betAmount: 10, tokenId: 2 }
 */
router.post('/api/v1/minesweeper/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { difficultyId, betAmount, tokenId } = req.body;
    const DEFAULT_TOKEN_ID = tokenId || 2;
    
    console.log('🎮 Начинаю игру сапёра: пользователь', userId, 'ставка', betAmount);

    if (!difficultyId || !betAmount || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры (difficultyId, betAmount)',
      });
    }

    // 🆕 Списываем через хелпер (BONUS приоритет, потом MAIN)
    const deductResult = await deductBetFromBalance(userId, parseFloat(betAmount), DEFAULT_TOKEN_ID);
    
    if (!deductResult.success) {
      console.log(`❌ [MINESWEEPER] ${deductResult.error}`);
      return res.status(400).json({
        success: false,
        message: deductResult.error || 'Недостаточно средств',
      });
    }
    console.log(`✅ [MINESWEEPER] Списано ${betAmount} с ${deductResult.balanceType}`);

    // Создаём игру
    const gameData = await minesweeperService.createGame(
      userId,
      DEFAULT_TOKEN_ID,
      difficultyId,
      betAmount,
      deductResult.balanceType  // 🆕 ПЕРЕДАЁМ информацию о балансе ставки!
    );

    res.json({
      success: true,
      data: {
        ...gameData,
        balanceType: deductResult.balanceType
      },
    });
  } catch (error) {
    console.error('❌ Ошибка создания игры:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка создания игры',
    });
  }
});

/**
 * 🎮 POST открыть клетку
 * POST /api/v1/minesweeper/reveal
 * Body: { gameId: 1, x: 0, y: 0 }
 */
router.post('/api/v1/minesweeper/reveal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameId, x, y } = req.body;

    console.log(`🎮 Открываю клетку: игра ${gameId}, позиция [${x}, ${y}], пользователь ${userId}`);

    if (gameId === undefined || x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры (gameId, x, y)',
      });
    }

    const result = await minesweeperService.revealGameCell(gameId, x, y, userId);

    // 🎉 ЕСЛИ ПОЛНАЯ ПОБЕДА - ЗАЧИСЛЯЕМ ВЫИГРЫШ
    if (result.status === 'WON' && result.winAmount) {
      const game = await prisma.minesweeperGame.findUnique({
        where: { id: gameId },
        select: { tokenId: true, balanceType: true },  // 🆕 Получаем сохранённый баланстип!
      });

      if (game) {
        // 🆕 ИСПРАВЛЕНО: Используем ПРАВИЛЬНЫЙ балансtип из игры
        const balanceType = game.balanceType || 'MAIN';
        await creditWinnings(userId, parseFloat(result.winAmount), game.tokenId, balanceType);
        console.log(`✅ [MINESWEEPER] Выигрыш при полной победе ${result.winAmount} зачислен на ${balanceType}`);
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ Ошибка открытия клетки:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Ошибка открытия клетки',
    });
  }
});

/**
 * 🎮 GET история игр
 * GET /api/v1/minesweeper/history?limit=20
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
    console.error('❌ Ошибка получения истории:', error.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения истории',
    });
  }
});

/**
 * 💰 POST кэшаут (забрать выигрыш)
 * POST /api/v1/minesweeper/cashout
 * Body: { gameId: 1 }
 */
router.post('/api/v1/minesweeper/cashout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameId } = req.body;

    console.log(`💸 Кэшаут: игра ${gameId}, пользователь ${userId}`);

    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать ID игры',
      });
    }

    // Получаем игру для токена и балансtипа ставки
    const game = await prisma.minesweeperGame.findUnique({
      where: { id: gameId },
      select: { tokenId: true, userId: true, balanceType: true }
    });

    if (!game || game.userId !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Игра не найдена или не ваша',
      });
    }

    // Сервис только обновляет статус игры
    const result = await minesweeperService.cashOutGame(gameId, userId);

    // ✅ ИСПРАВЛЕНО: Зачисляем выигрыш на тот же баланс откуда была ставка
    if (result.winAmount) {
      const balanceType = game.balanceType || 'MAIN';  // 🆕 Используем ПРАВИЛЬНЫЙ балансtип!
      const winAmountNum = parseFloat(result.winAmount);
      
      if (winAmountNum > 0) {
        await creditWinnings(userId, winAmountNum, game.tokenId, balanceType);
        console.log(`✅ [MINESWEEPER] Кэшаут: выигрыш ${result.winAmount} зачислен на ${balanceType}`);
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ Ошибка кэшаута:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Ошибка кэшаута',
    });
  }
});

/**
 * 🆕 GET баланс (оба типа)
 * GET /api/v1/minesweeper/balance
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
    console.error('❌ Ошибка получения баланса:', error.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения баланса',
    });
  }
});

module.exports = router;