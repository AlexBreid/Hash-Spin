/**
 * ✅ ПОЛНЫЙ gameReferralHelper.js
 * 
 * ПРАВИЛЬНАЯ ЛОГИКА:
 * - При выполнении вейджера конвертируется ВСЯ оставшаяся сумма на BONUS
 * - Вейджер считается от ВСЕХ ставок (не только проигрышей)
 * - Выигрыши добавляют к wagered
 */

const referralService = require('../../services/ReferralService');
const prisma = require('../../../prismaClient');
const logger = require('../../utils/logger');

/**
 * 💰 Получить оба баланса пользователя
 */
async function getUserBalances(userId, tokenId) {
  try {
    const [main, bonus] = await Promise.all([
      prisma.balance.findUnique({
        where: { userId_tokenId_type: { userId, tokenId, type: 'MAIN' } }
      }),
      prisma.balance.findUnique({
        where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } }
      })
    ]);

    const mainAmount = parseFloat(main?.amount?.toString() || '0');
    const bonusAmount = parseFloat(bonus?.amount?.toString() || '0');

    return {
      main: mainAmount,
      bonus: bonusAmount,
      total: mainAmount + bonusAmount,
    };
  } catch (error) {
    logger.error('BALANCE', 'Failed to get user balances', { error: error.message });
    return { main: 0, bonus: 0, total: 0 };
  }
}

/**
 * 🎰 Определить с какого баланса списывать ставку
 * ПРИОРИТЕТ: BONUS (если активен) → MAIN
 */
async function determineBalanceForBet(userId, betAmount, tokenId) {
  try {
    // 1️⃣ Проверяем есть ли активный BONUS
    const activeBonus = await prisma.userBonus.findFirst({
      where: {
        userId,
        tokenId,
        isActive: true,
        isCompleted: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (activeBonus) {
      // Проверяем BONUS баланс
      const bonusBalance = await prisma.balance.findUnique({
        where: {
          userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
        }
      });

      const bonusAmount = bonusBalance ? parseFloat(bonusBalance.amount.toString()) : 0;
      if (bonusAmount >= betAmount) {
        return { 
          balanceType: 'BONUS', 
          balance: bonusBalance, 
          amount: bonusAmount,
          userBonusId: activeBonus.id
        };
      } else {
        }
    } else {
      }

    // 2️⃣ Проверяем MAIN баланс
    const mainBalance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: { userId, tokenId, type: 'MAIN' }
      }
    });

    const mainAmount = mainBalance ? parseFloat(mainBalance.amount.toString()) : 0;
    if (mainAmount >= betAmount) {
      return { 
        balanceType: 'MAIN', 
        balance: mainBalance, 
        amount: mainAmount,
        userBonusId: null
      };
    }

    return { 
      balanceType: 'NONE', 
      balance: null, 
      amount: 0,
      userBonusId: null
    };

  } catch (error) {
    logger.error('BALANCE', 'Failed to determine balance', { error: error.message });
    
    return { 
      balanceType: 'NONE', 
      balance: null, 
      amount: 0,
      userBonusId: null
    };
  }
}

/**
 * 💳 Списать ставку с правильного баланса
 * АТОМАРНАЯ ОПЕРАЦИЯ с retry логикой для защиты от race condition
 */
async function deductBetFromBalance(userId, betAmount, tokenId, retryCount = 0) {
  const MAX_RETRIES = 3;
  try {
    // Используем транзакцию для атомарной проверки и списания
    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Проверяем активный BONUS
      const activeBonus = await tx.userBonus.findFirst({
        where: {
          userId,
          tokenId,
          isActive: true,
          isCompleted: false,
          expiresAt: { gt: new Date() }
        }
      });

      // 2️⃣ Пробуем списать с BONUS (если есть активный бонус)
      if (activeBonus) {
        const bonusBalance = await tx.balance.findUnique({
          where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } }
        });

        const bonusAmount = bonusBalance ? parseFloat(bonusBalance.amount.toString()) : 0;

        if (bonusAmount >= betAmount && bonusBalance) {
          // Условный update - списываем только если баланс >= ставки
          const updated = await tx.balance.updateMany({
            where: { 
              id: bonusBalance.id,
              amount: { gte: betAmount } // Защита от race condition
            },
            data: { amount: { decrement: betAmount } }
          });

          if (updated.count > 0) {
            // Получаем новый баланс
            const newBalanceRecord = await tx.balance.findUnique({
              where: { id: bonusBalance.id }
            });
            const newBalance = newBalanceRecord ? parseFloat(newBalanceRecord.amount.toString()) : 0;
            
            return {
              success: true,
              balanceType: 'BONUS',
              newBalance,
              fromBonus: true,
              userBonusId: activeBonus.id
            };
          }
          // Если update.count === 0, баланс изменился между проверкой и обновлением
        }
      }

      // 3️⃣ Списываем с MAIN
      const mainBalance = await tx.balance.findUnique({
        where: { userId_tokenId_type: { userId, tokenId, type: 'MAIN' } }
      });

      if (!mainBalance) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const mainAmount = parseFloat(mainBalance.amount.toString());

      if (mainAmount < betAmount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Условный update - списываем только если баланс >= ставки
      const updated = await tx.balance.updateMany({
        where: { 
          id: mainBalance.id,
          amount: { gte: betAmount } // Защита от race condition
        },
        data: { amount: { decrement: betAmount } }
      });

      if (updated.count === 0) {
        // Баланс изменился между проверкой и обновлением - retry
        throw new Error('BALANCE_CHANGED');
      }

      // Получаем новый баланс
      const newBalanceRecord = await tx.balance.findUnique({
        where: { id: mainBalance.id }
      });
      const newBalance = newBalanceRecord ? parseFloat(newBalanceRecord.amount.toString()) : 0;

      return {
        success: true,
        balanceType: 'MAIN',
        newBalance,
        fromBonus: false,
        userBonusId: null
      };
    }); // Используем стандартную изоляцию (ReadCommitted)

    // Отслеживаем для реферальной системы (вне транзакции, т.к. не критично)
    await trackBet(userId, betAmount, tokenId, result.balanceType);

    // Проверяем и обнуляем бонус, если баланс < 0.01 USDT (после списания)
    if (result.balanceType === 'BONUS' && result.userBonusId && result.newBalance < 0.01) {
      await referralService.checkAndAnnulateBonusIfLow(userId, tokenId, result.userBonusId);
    }

    return result;

  } catch (error) {
    // Retry при конфликтах записи или изменении баланса
    const isRetryable = error.message === 'BALANCE_CHANGED' || 
                        error.code === 'P2034' || // Write conflict
                        (error.message && error.message.includes('deadlock'));
    
    if (isRetryable && retryCount < MAX_RETRIES) {
      // Небольшая задержка перед retry
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      return deductBetFromBalance(userId, betAmount, tokenId, retryCount + 1);
    }

    if (error.message === 'INSUFFICIENT_BALANCE' || error.message === 'BALANCE_CHANGED') {
      return { 
        success: false, 
        error: 'Недостаточно средств',
        balanceType: 'NONE',
        userBonusId: null
      };
    }

    logger.error('BALANCE', 'Failed to deduct bet', { error: error.message });
    
    return { 
      success: false, 
      error: error.message || 'Failed to deduct bet',
      balanceType: 'NONE',
      userBonusId: null
    };
  }
}

/**
 * 🎰 Отследить ставку для реферальной системы
 */
async function trackBet(userId, betAmount, tokenId, balanceType = 'MAIN') {
  try {
    await referralService.processBet(userId, betAmount, tokenId, balanceType);
    
    } catch (error) {
    logger.warn('BALANCE', 'Failed to track bet', { error: error.message });
  }
}

/**
 * 🏆 Зачислить выигрыш на правильный баланс
 * Выигрыш идёт на ТОТ ЖЕ баланс откуда была ставка!
 */
async function creditWinnings(userId, winAmount, tokenId, balanceType = 'MAIN') {
  try {
    const updated = await prisma.balance.upsert({
      where: {
        userId_tokenId_type: { userId, tokenId, type: balanceType }
      },
      create: {
        userId,
        tokenId,
        type: balanceType,
        amount: winAmount.toString()
      },
      update: {
        amount: { increment: winAmount }
      }
    });

    const newBalance = parseFloat(updated.amount.toString());
    
    // Проверяем и обнуляем бонус, если баланс < 0.01 USDT
    if (balanceType === 'BONUS') {
      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId,
          tokenId,
          isActive: true,
          isCompleted: false
        }
      });
      
      if (activeBonus && newBalance < 0.01) {
        await referralService.checkAndAnnulateBonusIfLow(userId, tokenId, activeBonus.id);
      }
    }
    
    return { success: true, newBalance };

  } catch (error) {
    logger.error('BALANCE', 'Failed to credit winnings', { error: error.message });
    
    return { success: false, error: error.message };
  }
}

/**
 * 💛 ОБНОВИТЬ WAGERED И ПРОВЕРИТЬ КОНВЕРСИЮ
 * 
 * Вызывается когда:
 * - Юзер делает ставку с BONUS
 * - Юзер выигрывает с BONUS
 * 
 * ✅ Конвертирует ВСЮ оставшуюся сумму на BONUS в MAIN
 */
async function updateWagerAndCheckConversion(userId, wagerAmount, tokenId, userBonusId) {
  try {
    if (!userBonusId) {
      return { converted: false };
    }

    const bonus = await prisma.userBonus.findUnique({
      where: { id: userBonusId }
    });

    if (!bonus) {
      return { converted: false };
    }

    const currentWagered = parseFloat(bonus.wageredAmount.toString());
    const newWagered = parseFloat((currentWagered + wagerAmount).toFixed(8));
    const requiredNum = parseFloat(bonus.requiredWager.toString());

    // Обновляем wageredAmount
    await prisma.userBonus.update({
      where: { id: userBonusId },
      data: { wageredAmount: newWagered.toString() }
    });

    // Проверяем выполнен ли вейджер
    if (newWagered >= requiredNum) {
      return await convertBonusToMain(userId, tokenId, userBonusId);
    }

    // Проверяем и обнуляем бонус, если баланс < 0.01 USDT
    const bonusBalance = await prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } }
    });
    
    if (bonusBalance) {
      const bonusAmount = parseFloat(bonusBalance.amount.toString());
      if (bonusAmount < 0.01) {
        await referralService.checkAndAnnulateBonusIfLow(userId, tokenId, userBonusId);
      }
    }

    return { converted: false };

  } catch (error) {
    logger.error('BALANCE', 'Failed to update wager', { error: error.message });
    
    return { converted: false, error: error.message };
  }
}

/**
 * 💳 КОНВЕРТИРОВАТЬ BONUS В MAIN
 * 
 * ✅ Конвертирует ВСЮ оставшуюся сумму на BONUS в MAIN
 * (не просто исходный размер бонуса, а всё что осталось)
 */
async function convertBonusToMain(userId, tokenId, userBonusId) {
  try {
    // Получаем текущий BONUS баланс
    const bonusBalance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
      }
    });

    if (!bonusBalance) {
      // Всё равно помечаем бонус завершённым
      await prisma.userBonus.update({
        where: { id: userBonusId },
        data: { isActive: false, isCompleted: true }
      });
      
      return { converted: false, amount: 0 };
    }

    const remainingBonus = parseFloat(bonusBalance.amount.toString());
    if (remainingBonus <= 0) {
      // Помечаем бонус завершённым
      await prisma.userBonus.update({
        where: { id: userBonusId },
        data: { isActive: false, isCompleted: true }
      });
      
      return { converted: true, amount: 0 };
    }

    // TRANSACTION для атомарности
    await prisma.$transaction(async (tx) => {
      // 1. Обнуляем BONUS баланс
      await tx.balance.update({
        where: { id: bonusBalance.id },
        data: { amount: '0' }
      });
      
      // 2. Добавляем в MAIN
      await tx.balance.upsert({
        where: {
          userId_tokenId_type: { userId, tokenId, type: 'MAIN' }
        },
        create: {
          userId,
          tokenId,
          type: 'MAIN',
          amount: remainingBonus.toFixed(8).toString()
        },
        update: {
          amount: { increment: remainingBonus }
        }
      });
      
      // 3. Помечаем бонус завершённым
      await tx.userBonus.update({
        where: { id: userBonusId },
        data: { 
          isCompleted: true,
          isActive: false
        }
      });
      
      });

    logger.info('BALANCE', 'Bonus converted to main', {
      userId,
      bonusAmount: remainingBonus.toFixed(8),
      userBonusId
    });

    return { 
      converted: true, 
      amount: remainingBonus
    };

  } catch (error) {
    logger.error('BALANCE', 'Failed to convert bonus', { error: error.message });
    
    return { converted: false, error: error.message };
  }
}

/**
 * 📊 Получить баланс для отображения
 */
async function getDisplayBalance(userId, tokenId) {
  return getUserBalances(userId, tokenId);
}

/**
 * 🎮 Создать объект баланса для фронта
 */
async function getBalanceForFront(userId, tokenId, tokenSymbol = 'USDT') {
  try {
    const [main, bonus] = await Promise.all([
      prisma.balance.findUnique({
        where: { userId_tokenId_type: { userId, tokenId, type: 'MAIN' } }
      }),
      prisma.balance.findUnique({
        where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } }
      })
    ]);

    return [
      {
        tokenId,
        symbol: tokenSymbol,
        amount: parseFloat(main?.amount?.toString() || '0'),
        type: 'MAIN'
      },
      {
        tokenId,
        symbol: tokenSymbol,
        amount: parseFloat(bonus?.amount?.toString() || '0'),
        type: 'BONUS'
      }
    ];
  } catch (error) {
    logger.error('BALANCE', 'Failed to get balance for front', { error: error.message });
    
    return [
      { tokenId, symbol: tokenSymbol, amount: 0, type: 'MAIN' },
      { tokenId, symbol: tokenSymbol, amount: 0, type: 'BONUS' }
    ];
  }
}

/**
 * 📝 Логирование состояния баланса
 */
async function logBalanceState(userId, tokenId, prefix = '') {
  const balances = await getUserBalances(userId, tokenId);
  return balances;
}

module.exports = {
  getUserBalances,
  getDisplayBalance,
  getBalanceForFront,
  determineBalanceForBet,
  trackBet,
  deductBetFromBalance,
  creditWinnings,
  updateWagerAndCheckConversion,
  convertBonusToMain,
  logBalanceState
};

