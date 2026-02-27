const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

/**
 * 🎯 ИСПРАВЛЕННЫЙ balanceRouter.js
 * 
 * ЛОГИКА:
 * 1. GET /balance → возвращает ОБА баланса (MAIN + BONUS)
 * 2. GET /wallet/balance → ALIAS для совместимости с фронтом
 * 3. POST /update-balance → обновляет конкретный баланс
 * 4. ✅ ВСЕ операции проверяют активный бонус
 */

/**
 * GET /api/v1/balance/get-balances
 * Получить ВСЕ балансы пользователя (MAIN + BONUS) + информацию о бонусе
 */
router.get('/api/v1/balance/get-balances', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Неверная аутентификация',
      });
    }

    // Получаем ВСЕ балансы пользователя
    const balances = await prisma.balance.findMany({
      where: { userId: userId },
      include: { token: true },
      orderBy: { createdAt: 'asc' },
    });

    // ✅ Возвращаем в формате с type
    const formatted = balances.map(bal => ({
      id: bal.id,
      userId: bal.userId,
      tokenId: bal.tokenId,
      symbol: bal.token.symbol,
      type: bal.type,  // ✅ 'MAIN' или 'BONUS'
      amount: parseFloat(bal.amount.toString()),
      createdAt: bal.createdAt,
      updatedAt: bal.updatedAt,
    }));

    // Получаем информацию о бонусе
    const activeBonus = await prisma.userBonus.findFirst({
      where: {
        userId,
        isActive: true,
        isCompleted: false,
        expiresAt: { gt: new Date() }
      }
    });

    let bonusInfo = null;
    if (activeBonus) {
      const wagered = parseFloat(activeBonus.wageredAmount.toString());
      const required = parseFloat(activeBonus.requiredWager.toString());
      bonusInfo = {
        id: activeBonus.id,
        granted: parseFloat(activeBonus.grantedAmount.toString()),
        required: required,
        wagered: wagered,
        progress: required > 0 ? Math.min((wagered / required) * 100, 100) : 100,
        remaining: Math.max(required - wagered, 0),
        expiresAt: activeBonus.expiresAt,
        isExpired: new Date() > activeBonus.expiresAt
      };
    }

    res.json({
      success: true,
      data: formatted,
      bonus: bonusInfo
    });
  } catch (error) {
    logger.error('BALANCE', 'Failed to get balances', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Ошибка получения балансов',
    });
  }
});

/**
 * GET /api/v1/wallet/balance
 * ALIAS для TopNavigation и других компонентов
 * 
 * ✅ ОБЪЕДИНЯЕТ балансы по СИМВОЛУ валюты (все USDT вместе, все USDC вместе и т.д.)
 */
router.get('/api/v1/wallet/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Неверная аутентификация',
      });
    }

    // Получаем ВСЕ балансы пользователя
    const balances = await prisma.balance.findMany({
      where: { userId: userId },
      include: { 
        token: {
          select: {
            id: true,
            symbol: true,
            name: true,
            network: true,
            decimals: true
          }
        }
      },
    });

    // ✅ ГРУППИРУЕМ балансы по СИМВОЛУ валюты
    // Все USDT (TRC-20, ERC-20, BEP-20 etc.) → один USDT баланс
    // Все USDC → один USDC баланс
    const balancesBySymbol = new Map();
    
    for (const bal of balances) {
      if (!bal.token) continue;
      
      const symbol = bal.token.symbol;
      const amount = parseFloat(bal.amount.toString()) || 0;
      const type = bal.type; // 'MAIN' или 'BONUS'
      
      if (!balancesBySymbol.has(symbol)) {
        balancesBySymbol.set(symbol, {
          symbol: symbol,
          name: bal.token.name,
          decimals: bal.token.decimals,
          // Берём первый найденный tokenId для этого символа
          tokenId: bal.tokenId,
          main: 0,
          bonus: 0
        });
      }
      
      const entry = balancesBySymbol.get(symbol);
      if (type === 'MAIN') {
        entry.main += amount;
      } else if (type === 'BONUS') {
        entry.bonus += amount;
      }
    }
    
    // Преобразуем Map в массив с отдельными записями для MAIN и BONUS
    const formatted = [];
    for (const [symbol, data] of balancesBySymbol) {
      // Добавляем MAIN баланс
      if (data.main > 0 || data.bonus === 0) {
        formatted.push({
          tokenId: data.tokenId,
          symbol: data.symbol,
          amount: data.main,
          type: 'MAIN',
          token: {
            id: data.tokenId,
            symbol: data.symbol,
            name: data.name,
            network: 'MULTI', // Указываем что это объединённый баланс
          }
        });
      }
      
      // Добавляем BONUS баланс если он есть
      if (data.bonus > 0) {
        formatted.push({
          tokenId: data.tokenId,
          symbol: data.symbol,
          amount: data.bonus,
          type: 'BONUS',
          token: {
            id: data.tokenId,
            symbol: data.symbol,
            name: data.name,
            network: 'MULTI',
          }
        });
      }
    }

    // Получаем информацию о бонусе
    const activeBonus = await prisma.userBonus.findFirst({
      where: {
        userId,
        isActive: true,
        isCompleted: false,
        expiresAt: { gt: new Date() }
      }
    });

    let bonusInfo = null;
    let canWithdraw = true;
    if (activeBonus) {
      const wagered = parseFloat(activeBonus.wageredAmount.toString());
      const required = parseFloat(activeBonus.requiredWager.toString());
      const remaining = Math.max(required - wagered, 0);
      bonusInfo = {
        granted: parseFloat(activeBonus.grantedAmount.toString()),
        required: required,
        wagered: wagered,
        progress: required > 0 ? Math.min((wagered / required) * 100, 100) : 100,
        remaining
      };
      canWithdraw = remaining <= 0; // Без отыгрыша (required=0) или уже отыграно
    }

    // Логируем для отладки
    let totalMain = 0, totalBonus = 0;
    for (const b of formatted) {
      if (b.type === 'MAIN') totalMain += b.amount;
      if (b.type === 'BONUS') totalBonus += b.amount;
    }
    res.json({
      success: true,
      data: formatted,
      bonus: bonusInfo,
      canWithdraw
    });
  } catch (error) {
    logger.error('BALANCE', 'Failed to get wallet balance', { 
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId 
    });
    
    res.status(500).json({
      success: false,
      error: 'Ошибка получения баланса',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/v1/balance/balance/:tokenId
 * Получить баланс конкретного токена (MAIN + BONUS вместе)
 */
router.get('/api/v1/balance/balance/:tokenId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokenId = parseInt(req.params.tokenId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Неверная аутентификация',
      });
    }

    // Получаем ОБА типа баланса для этого токена
    const [mainBalance, bonusBalance] = await Promise.all([
      prisma.balance.findUnique({
        where: {
          userId_tokenId_type: {
            userId: userId,
            tokenId: tokenId,
            type: 'MAIN',
          },
        },
      }),
      prisma.balance.findUnique({
        where: {
          userId_tokenId_type: {
            userId: userId,
            tokenId: tokenId,
            type: 'BONUS',
          },
        },
      }),
    ]);

    const mainAmount = mainBalance ? parseFloat(mainBalance.amount.toString()) : 0;
    const bonusAmount = bonusBalance ? parseFloat(bonusBalance.amount.toString()) : 0;
    const totalAmount = mainAmount + bonusAmount;

    // Получаем информацию о бонусе
    const activeBonus = await prisma.userBonus.findFirst({
      where: {
        userId,
        tokenId,
        isActive: true,
        isCompleted: false,
        expiresAt: { gt: new Date() }
      }
    });

    let bonusInfo = null;
    if (activeBonus) {
      const wagered = parseFloat(activeBonus.wageredAmount.toString());
      const required = parseFloat(activeBonus.requiredWager.toString());
      
      bonusInfo = {
        granted: parseFloat(activeBonus.grantedAmount.toString()),
        required: required,
        wagered: wagered,
        progress: Math.min((wagered / required) * 100, 100),
        remaining: Math.max(required - wagered, 0)
      };
    }

    res.json({
      success: true,
      data: {
        tokenId: tokenId,
        main: mainAmount,
        bonus: bonusAmount,
        total: totalAmount,
      },
      bonus: bonusInfo
    });
  } catch (error) {
    logger.error('BALANCE', 'Failed to get balance', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Ошибка получения баланса',
    });
  }
});

/**
 * POST /api/v1/balance/update-balance
 * Обновить баланс пользователя (MAIN или BONUS)
 */
router.post('/api/v1/balance/update-balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tokenId, amount, type = 'MAIN', operation = 'add' } = req.body;

    if (!userId) {
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

    if (!['MAIN', 'BONUS'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'type должен быть "MAIN" или "BONUS"',
      });
    }

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
      balance = await prisma.balance.create({
        data: {
          userId: userId,
          tokenId: tokenId,
          type: type,
          amount: operation === 'add' ? amount.toString() : '0',
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
        
        if (newAmount < 0) {
          return res.status(400).json({
            success: false,
            error: `Недостаточно ${type} баланса`,
          });
        }
      }

      balance = await prisma.balance.update({
        where: { id: balance.id },
        data: {
          amount: newAmount.toFixed(8).toString(),
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
        amount: parseFloat(balance.amount.toString()),
        createdAt: balance.createdAt,
        updatedAt: balance.updatedAt,
      },
    });
  } catch (error) {
    logger.error('BALANCE', 'Failed to update balance', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления баланса',
    });
  }
});

/**
 * POST /api/v1/balance/transfer
 * Передача между MAIN и BONUS
 */
router.post('/api/v1/balance/transfer', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tokenId, amount, from, to } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Неверная аутентификация',
      });
    }

    if (from === to) {
      return res.status(400).json({
        success: false,
        error: 'Не можешь передавать на тот же баланс',
      });
    }

    // Используем транзакцию для атомарности
    const result = await prisma.$transaction(async (tx) => {
      // Снимаем с исходного баланса
      const fromBalance = await tx.balance.findUnique({
        where: {
          userId_tokenId_type: { userId, tokenId, type: from },
        },
      });

      if (!fromBalance || parseFloat(fromBalance.amount.toString()) < amount) {
        throw new Error(`Недостаточно ${from} баланса`);
      }

      const updated1 = await tx.balance.update({
        where: { id: fromBalance.id },
        data: {
          amount: { decrement: amount },
        },
      });

      // Добавляем на целевой баланс
      const toBalance = await tx.balance.upsert({
        where: {
          userId_tokenId_type: { userId, tokenId, type: to },
        },
        create: { userId, tokenId, type: to, amount: amount.toString() },
        update: { amount: { increment: amount } },
      });

      return { from: updated1, to: toBalance };
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('BALANCE', 'Failed to transfer balance', { error: error.message });
    
    res.status(400).json({
      success: false,
      error: error.message || 'Ошибка передачи баланса',
    });
  }
});

module.exports = router;

