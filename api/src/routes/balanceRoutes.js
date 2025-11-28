const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * GET /api/v1/balance/get-balances
 * Получить все балансы текущего пользователя
 */
router.get('/api/v1/balance/get-balances', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`📊 Получаю балансы для пользователя ${userId}`);

    // Получаем все балансы пользователя
    const balances = await prisma.balance.findMany({
      where: {
        userId: userId,
      },
      include: {
        token: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`✅ Найдено ${balances.length} балансов`);

    res.json({
      success: true,
      data: balances.map(bal => ({
        id: bal.id,
        userId: bal.userId,
        tokenId: bal.tokenId,
        type: bal.type,
        amount: bal.amount.toString(), // Decimal -> String для JSON
        createdAt: bal.createdAt,
        updatedAt: bal.updatedAt,
        token: bal.token,
      })),
    });
  } catch (error) {
    console.error('❌ Ошибка получения балансов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения балансов',
    });
  }
});

/**
 * POST /api/v1/balance/update-balance
 * Обновить баланс пользователя
 * 
 * Body:
 * {
 *   tokenId: number,
 *   amount: number,
 *   type: 'MAIN' | 'BONUS',
 *   operation: 'add' | 'subtract'
 * }
 */
router.post('/api/v1/balance/update-balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tokenId, amount, type = 'MAIN', operation = 'add' } = req.body;

    // Валидация
    if (!tokenId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'tokenId и положительный amount обязательны',
      });
    }

    if (!['add', 'subtract'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: 'operation должен быть "add" или "subtract"',
      });
    }

    console.log(
      `💰 ${operation === 'add' ? 'Добавляю' : 'Вычитаю'} ${amount} для пользователя ${userId} (токен: ${tokenId}, тип: ${type})`
    );

    // Получаем или создаем баланс
    let balance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: {
          userId: userId,
          tokenId: tokenId,
          type: type,
        },
      },
    });

    if (!balance) {
      console.log(`📝 Баланс не найден, создаю новый...`);
      balance = await prisma.balance.create({
        data: {
          userId: userId,
          tokenId: tokenId,
          type: type,
          amount: operation === 'add' ? amount : 0,
        },
      });
    } else {
      // Вычисляем новую сумму
      const currentAmount = parseFloat(balance.amount.toString());
      let newAmount;

      if (operation === 'add') {
        newAmount = currentAmount + amount;
      } else {
        newAmount = currentAmount - amount;
        
        // Проверяем, чтобы баланс не стал отрицательным
        if (newAmount < 0) {
          return res.status(400).json({
            success: false,
            error: 'Недостаточно средств',
          });
        }
      }

      console.log(
        `🔄 Обновляю баланс: ${currentAmount} → ${newAmount}`
      );

      balance = await prisma.balance.update({
        where: { id: balance.id },
        data: {
          amount: newAmount.toString(),
        },
      });
    }

    console.log(`✅ Баланс обновлён успешно`);

    res.json({
      success: true,
      data: {
        id: balance.id,
        userId: balance.userId,
        tokenId: balance.tokenId,
        type: balance.type,
        amount: balance.amount.toString(),
        createdAt: balance.createdAt,
        updatedAt: balance.updatedAt,
      },
    });
  } catch (error) {
    console.error('❌ Ошибка обновления баланса:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления баланса',
    });
  }
});

/**
 * GET /api/v1/balance/balance/:tokenId
 * Получить баланс конкретного токена
 */
router.get('/api/v1/balance/balance/:tokenId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tokenId = parseInt(req.params.tokenId);
    const type = req.query.type || 'MAIN';

    const balance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: {
          userId: userId,
          tokenId: tokenId,
          type: type,
        },
      },
    });

    if (!balance) {
      return res.json({
        success: true,
        data: {
          userId,
          tokenId,
          type,
          amount: '0',
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: balance.id,
        userId: balance.userId,
        tokenId: balance.tokenId,
        type: balance.type,
        amount: balance.amount.toString(),
        createdAt: balance.createdAt,
        updatedAt: balance.updatedAt,
      },
    });
  } catch (error) {
    console.error('❌ Ошибка получения баланса:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения баланса',
    });
  }
});

module.exports = router;