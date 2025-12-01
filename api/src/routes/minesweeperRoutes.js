const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const minesweeperService = require('../services/minesweeperService');

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
    const DEFAULT_TOKEN_ID = 2; // ID основной валюты (USDT)
    
    console.log('🎮 Начинаю игру сапёра: пользователь', userId, 'ставка', betAmount);

    // ✅ Валидация
    if (!difficultyId || !betAmount || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры (difficultyId, betAmount)',
      });
    }

    // Проверяем баланс
    const balance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: {
          userId, 
          tokenId: DEFAULT_TOKEN_ID, 
          type: 'MAIN',
        },
      },
    });

    if (!balance || balance.amount < betAmount) {
      return res.status(400).json({
        success: false,
        message: 'Недостаточно средств',
      });
    }

    // Снимаем ставку
    await prisma.balance.update({
      where: { id: balance.id },
      data: {
        amount: {
          decrement: betAmount,
        },
      },
    });

    // Создаём игру (мины генерируются ВНУТРИ сервиса)
    const gameData = await minesweeperService.createGame(
      userId,
      DEFAULT_TOKEN_ID,
      difficultyId,
      betAmount
    );

    res.json({
      success: true,
      data: gameData,
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
 * 
 * ⚠️ ВСЯ ЛОГИКА ОТКРЫТИЯ НА СЕРВЕРЕ!
 * Фронт отправляет только координаты, сервер:
 * 1. Восстанавливает полное поле из БД
 * 2. Проверяет есть ли там мина
 * 3. Открывает клетку
 * 4. Отправляет только безопасную информацию обратно
 */
router.post('/api/v1/minesweeper/reveal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameId, x, y } = req.body;

    console.log(`🎮 Открываю клетку: игра ${gameId}, позиция [${x}, ${y}], пользователь ${userId}`);

    // ✅ Валидация
    if (gameId === undefined || x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Некорректные параметры (gameId, x, y)',
      });
    }

    // ⚠️ ПЕРЕДАЁМ userId в сервис для проверки собственности
    const result = await minesweeperService.revealGameCell(gameId, x, y, userId);

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

    const result = await minesweeperService.cashOutGame(gameId, userId);

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

module.exports = router;