const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * GET /api/v1/balance/get-balances
 * Получить все балансы текущего пользователя
 * 
 * ✅ ИСПРАВЛЕНО: req.user.id → req.user.userId
 */
router.get('/api/v1/balance/get-balances', authenticateToken, async (req, res) => {
  try {
    // ✅ ИСПРАВЛЕНО: Берем userId из authMiddleware (не id!)
    const userId = req.user.userId;

    console.log(`📊 Получаю балансы для пользователя ${userId}`);

    // Проверка что userId существует
    if (!userId) {
      console.error('❌ userId не найден в req.user');
      return res.status(401).json({
        success: false,
        error: 'Неверная аутентификация',
      });
    }

    // Получаем все балансы пользователя
    const balances = await prisma.balance.findMany({
      where: {
        userId: userId,  // ✅ ТЕПЕРЬ ПРАВИЛЬНО ФИЛЬТРУЕТСЯ!
      },
      include: {
        token: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`✅ Найдено ${balances.length} балансов для пользователя ${userId}`);

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
 * ✅ ИСПРАВЛЕНО: req.user.id → req.user.userId
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
    // ✅ ИСПРАВЛЕНО: Берем userId из authMiddleware (не id!)
    const userId = req.user.userId;
    const { tokenId, amount, type = 'MAIN', operation = 'add' } = req.body;

    // Проверка что userId существует
    if (!userId) {
      console.error('❌ userId не найден в req.user');
      return res.status(401).json({
        success: false,
        error: 'Неверная аутентификация',
      });
    }

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
          userId: userId,  // ✅ ТЕПЕРЬ ПРАВИЛЬНО!
          tokenId: tokenId,
          type: type,
        },
      },
    });

    if (!balance) {
      console.log(`📝 Баланс не найден, создаю новый для пользователя ${userId}...`);
      balance = await prisma.balance.create({
        data: {
          userId: userId,  // ✅ ТЕПЕРЬ ПРАВИЛЬНО!
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
          console.warn(`⚠️ Попытка получить отрицательный баланс для пользователя ${userId}`);
          return res.status(400).json({
            success: false,
            error: 'Недостаточно средств',
          });
        }
      }

      console.log(
        `🔄 Обновляю баланс пользователя ${userId}: ${currentAmount} → ${newAmount}`
      );

      balance = await prisma.balance.update({
        where: { id: balance.id },
        data: {
          amount: newAmount.toString(),
        },
      });
    }

    console.log(`✅ Баланс пользователя ${userId} обновлён успешно`);

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
 * 
 * ✅ ИСПРАВЛЕНО: req.user.id → req.user.userId
 */
router.get('/api/v1/balance/balance/:tokenId', authenticateToken, async (req, res) => {
  try {
    // ✅ ИСПРАВЛЕНО: Берем userId из authMiddleware (не id!)
    const userId = req.user.userId;
    const tokenId = parseInt(req.params.tokenId);
    const type = req.query.type || 'MAIN';

    // Проверка что userId существует
    if (!userId) {
      console.error('❌ userId не найден в req.user');
      return res.status(401).json({
        success: false,
        error: 'Неверная аутентификация',
      });
    }

    console.log(`💵 Получаю баланс токена ${tokenId} для пользователя ${userId}`);

    const balance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: {
          userId: userId,  // ✅ ТЕПЕРЬ ПРАВИЛЬНО!
          tokenId: tokenId,
          type: type,
        },
      },
    });

    if (!balance) {
      console.log(`⚠️ Баланс не найден, возвращаю 0 для пользователя ${userId}`);
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

    console.log(`✅ Баланс найден: ${balance.amount}`);

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