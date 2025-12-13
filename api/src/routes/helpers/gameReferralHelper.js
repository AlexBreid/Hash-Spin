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
    console.log(`\n💰 [GET BALANCES] userId=${userId}, tokenId=${tokenId}`);
    
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

    console.log(`   💙 MAIN: ${mainAmount.toFixed(8)}`);
    console.log(`   💛 BONUS: ${bonusAmount.toFixed(8)}`);
    console.log(`   📊 TOTAL: ${(mainAmount + bonusAmount).toFixed(8)}\n`);

    return {
      main: mainAmount,
      bonus: bonusAmount,
      total: mainAmount + bonusAmount,
    };
  } catch (error) {
    console.error(`❌ [GET BALANCES] Error:`, error.message);
    logger.error('BALANCE', 'Failed to get user balances', { error: error.message });
    return { main: 0, bonus: 0, total: 0 };
  }
}

/**
 * 🎰 Определить с какого баланса списывать ставку
 * ПРИОРИТЕТ: BONUS (если активен) → MAIN
 */
async function determineBalanceForBet(userId, betAmount, tokenId) {
  console.log(`\n🎯 [DETERMINE BALANCE] userId=${userId}, betAmount=${betAmount.toFixed(8)}`);

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
      console.log(`   💛 Активный бонус найден (ID=${activeBonus.id})`);

      // Проверяем BONUS баланс
      const bonusBalance = await prisma.balance.findUnique({
        where: {
          userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
        }
      });

      const bonusAmount = bonusBalance ? parseFloat(bonusBalance.amount.toString()) : 0;
      console.log(`   💛 BONUS баланс: ${bonusAmount.toFixed(8)}`);

      if (bonusAmount >= betAmount) {
        console.log(`   ✅ BONUS >= ставке, используем BONUS\n`);
        
        return { 
          balanceType: 'BONUS', 
          balance: bonusBalance, 
          amount: bonusAmount,
          userBonusId: activeBonus.id
        };
      } else {
        console.log(`   ❌ BONUS < ставке (${bonusAmount.toFixed(8)} < ${betAmount.toFixed(8)})`);
      }
    } else {
      console.log(`   ℹ️ Нет активного бонуса`);
    }

    // 2️⃣ Проверяем MAIN баланс
    const mainBalance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: { userId, tokenId, type: 'MAIN' }
      }
    });

    const mainAmount = mainBalance ? parseFloat(mainBalance.amount.toString()) : 0;
    console.log(`   💙 MAIN баланс: ${mainAmount.toFixed(8)}`);

    if (mainAmount >= betAmount) {
      console.log(`   ✅ MAIN >= ставке, используем MAIN\n`);
      
      return { 
        balanceType: 'MAIN', 
        balance: mainBalance, 
        amount: mainAmount,
        userBonusId: null
      };
    }

    console.log(`   ❌ Недостаточно средств (MAIN: ${mainAmount.toFixed(8)}, нужно: ${betAmount.toFixed(8)})\n`);
    
    return { 
      balanceType: 'NONE', 
      balance: null, 
      amount: 0,
      userBonusId: null
    };

  } catch (error) {
    console.error(`❌ [DETERMINE BALANCE] Error:`, error.message);
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
 */
async function deductBetFromBalance(userId, betAmount, tokenId) {
  console.log(`\n💳 [DEDUCT BET] Списание ставки ${betAmount.toFixed(8)}...`);

  try {
    const { balanceType, balance, amount, userBonusId } = await determineBalanceForBet(userId, betAmount, tokenId);

    if (balanceType === 'NONE' || !balance) {
      console.log(`❌ [DEDUCT BET] Баланс не найден или недостаточно средств`);
      return { 
        success: false, 
        error: 'Insufficient balance',
        balanceType: 'NONE',
        userBonusId: null
      };
    }

    if (amount < betAmount) {
      console.log(`❌ [DEDUCT BET] ${balanceType} баланс < ставке (${amount.toFixed(8)} < ${betAmount.toFixed(8)})`);
      return { 
        success: false, 
        error: `Insufficient ${balanceType} balance`,
        balanceType,
        userBonusId: null
      };
    }

    console.log(`   💸 Списываю ${betAmount.toFixed(8)} с ${balanceType} баланса...`);
    
    const updated = await prisma.balance.update({
      where: { id: balance.id },
      data: { amount: { decrement: betAmount } }
    });

    const newBalance = parseFloat(updated.amount.toString());
    console.log(`   ✅ Списано! ${balanceType} баланс: ${newBalance.toFixed(8)}`);

    // Отслеживаем для реферальной системы
    await trackBet(userId, betAmount, tokenId, balanceType);

    console.log(`✅ [DEDUCT BET] УСПЕХ: ${balanceType}, userBonusId=${userBonusId}\n`);

    return {
      success: true,
      balanceType,
      newBalance,
      fromBonus: balanceType === 'BONUS',
      userBonusId
    };

  } catch (error) {
    console.error(`❌ [DEDUCT BET] ОШИБКА:`, error.message);
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
    console.log(`   📊 [TRACK BET] Отслеживаю ставку ${betAmount.toFixed(8)} (${balanceType})`);
    
    await referralService.processBet(userId, betAmount, tokenId, balanceType);
    
    console.log(`   ✅ [TRACK BET] Отслежено`);
  } catch (error) {
    console.warn(`⚠️ [TRACK BET] Error:`, error.message);
    logger.warn('BALANCE', 'Failed to track bet', { error: error.message });
  }
}

/**
 * 🏆 Зачислить выигрыш на правильный баланс
 * Выигрыш идёт на ТОТ ЖЕ баланс откуда была ставка!
 */
async function creditWinnings(userId, winAmount, tokenId, balanceType = 'MAIN') {
  try {
    console.log(`\n🏆 [CREDIT WINNINGS] userId=${userId}, amount=${winAmount.toFixed(8)}, type=${balanceType}`);

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
    console.log(`✅ [CREDIT WINNINGS] Выигрыш ${winAmount.toFixed(8)} на ${balanceType}: новый баланс ${newBalance.toFixed(8)}\n`);

    return { success: true, newBalance };

  } catch (error) {
    console.error(`❌ [CREDIT WINNINGS] ОШИБКА:`, error.message);
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
    console.log(`\n💛 [UPDATE WAGER] userId=${userId}, wager=${wagerAmount.toFixed(8)}`);

    if (!userBonusId) {
      console.log(`   ℹ️ Нет bonusId, пропускаем\n`);
      return { converted: false };
    }

    const bonus = await prisma.userBonus.findUnique({
      where: { id: userBonusId }
    });

    if (!bonus) {
      console.warn(`   ⚠️ Бонус не найден (ID=${userBonusId})\n`);
      return { converted: false };
    }

    console.log(`   💛 Текущий вейджер: ${bonus.wageredAmount.toString()}`);
    console.log(`   💛 Требуется: ${bonus.requiredWager.toString()}`);

    const currentWagered = parseFloat(bonus.wageredAmount.toString());
    const newWagered = parseFloat((currentWagered + wagerAmount).toFixed(8));
    const requiredNum = parseFloat(bonus.requiredWager.toString());

    console.log(`   💛 Новый вейджер: ${newWagered.toFixed(8)}`);

    // Обновляем wageredAmount
    await prisma.userBonus.update({
      where: { id: userBonusId },
      data: { wageredAmount: newWagered.toString() }
    });

    console.log(`   ✅ Вейджер обновлён`);

    // Проверяем выполнен ли вейджер
    if (newWagered >= requiredNum) {
      console.log(`\n🎊 [UPDATE WAGER] ВЕЙДЖЕР ВЫПОЛНЕН! ${newWagered.toFixed(8)} >= ${requiredNum.toFixed(8)}`);
      
      return await convertBonusToMain(userId, tokenId, userBonusId);
    }

    console.log(`   📊 Осталось: ${(requiredNum - newWagered).toFixed(8)}\n`);

    return { converted: false };

  } catch (error) {
    console.error(`❌ [UPDATE WAGER] ОШИБКА:`, error.message);
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
    console.log(`\n💳 [CONVERT] Конвертирую BONUS → MAIN для userId=${userId}`);

    // Получаем текущий BONUS баланс
    const bonusBalance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
      }
    });

    if (!bonusBalance) {
      console.warn(`   ⚠️ BONUS баланс не найден`);
      
      // Всё равно помечаем бонус завершённым
      await prisma.userBonus.update({
        where: { id: userBonusId },
        data: { isActive: false, isCompleted: true }
      });
      
      return { converted: false, amount: 0 };
    }

    const remainingBonus = parseFloat(bonusBalance.amount.toString());
    console.log(`   💛 BONUS баланс: ${remainingBonus.toFixed(8)}`);

    if (remainingBonus <= 0) {
      console.log(`   ℹ️ BONUS баланс пуст`);
      
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
      
      console.log(`   ✅ BONUS баланс обнулен`);

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
      
      console.log(`   ✅ MAIN баланс +${remainingBonus.toFixed(8)}`);

      // 3. Помечаем бонус завершённым
      await tx.userBonus.update({
        where: { id: userBonusId },
        data: { 
          isCompleted: true,
          isActive: false
        }
      });
      
      console.log(`   ✅ Бонус помечен завершённым`);
    });

    console.log(`✅ [CONVERT] Конверсия завершена! ${remainingBonus.toFixed(8)} BONUS → MAIN\n`);

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
    console.error(`❌ [CONVERT] ОШИБКА:`, error.message);
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
    console.error(`❌ [GET BALANCE FOR FRONT] Error:`, error.message);
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
  console.log(`${prefix}[BALANCE STATE] MAIN=${balances.main.toFixed(8)}, BONUS=${balances.bonus.toFixed(8)}, TOTAL=${balances.total.toFixed(8)}`);
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