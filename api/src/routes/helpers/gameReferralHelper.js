/**
 * 🎯 ИСПРАВЛЕННЫЙ gameReferralHelper.js
 * 
 * ЛОГИКА БАЛАНСА:
 * 1. При ставке: BONUS → MAIN (приоритет бонусу)
 * 2. При выигрыше: На тот же баланс откуда взяли ставку
 * 3. Отображение: Сумма BONUS + MAIN
 */

const referralService = require('../../services/ReferralService');
const prisma = require('../../../prismaClient');

/**
 * 💰 Получить оба баланса пользователя с объединённой суммой
 * 
 * @param {number} userId 
 * @param {number} tokenId 
 * @returns {Object} { main, bonus, total }
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
      total: mainAmount + bonusAmount,  // ✅ ОБЪЕДИНЁННЫЙ БАЛАНС
    };
  } catch (error) {
    console.error(`❌ [BALANCE] Error getting user balances:`, error.message);
    return { main: 0, bonus: 0, total: 0 };
  }
}

/**
 * 🎰 Определить с какого баланса списывать ставку
 * 
 * ПРИОРИТЕТ: BONUS → MAIN
 * 
 * @param {number} userId 
 * @param {number} betAmount 
 * @param {number} tokenId 
 * @returns {Object} { balanceType: 'MAIN'|'BONUS', balance: Balance, amount: number }
 */
async function determineBalanceForBet(userId, betAmount, tokenId) {
  console.log(`\n🎯 [DETERMINE BALANCE] userId=${userId}, betAmount=${betAmount}, tokenId=${tokenId}`);

  try {
    // 1️⃣ Проверяем бонусный баланс (ПРИОРИТЕТ)
    const bonusBalance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
      }
    });

    const bonusAmount = bonusBalance ? parseFloat(bonusBalance.amount.toString()) : 0;
    console.log(`   💛 BONUS баланс: ${bonusAmount.toFixed(8)}`);

    // Если бонус достаточно и есть активный бонус для отыгрыша
    if (bonusAmount >= betAmount) {
      console.log(`   ✅ BONUS >= ставке (${bonusAmount.toFixed(8)} >= ${betAmount})`);

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
        console.log(`   ✅ Активный бонус найден: ${activeBonus.id}`);
        return { balanceType: 'BONUS', balance: bonusBalance, amount: bonusAmount };
      } else {
        console.log(`   ⚠️ Активный бонус НЕ найден, используем MAIN`);
      }
    } else {
      console.log(`   ❌ BONUS < ставке (${bonusAmount.toFixed(8)} < ${betAmount})`);
    }

    // 2️⃣ Используем основной баланс
    const mainBalance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: { userId, tokenId, type: 'MAIN' }
      }
    });

    const mainAmount = mainBalance ? parseFloat(mainBalance.amount.toString()) : 0;
    console.log(`   🔵 MAIN баланс: ${mainAmount.toFixed(8)}`);

    if (mainAmount >= betAmount) {
      console.log(`   ✅ MAIN >= ставке, используем MAIN`);
      return { balanceType: 'MAIN', balance: mainBalance, amount: mainAmount };
    }

    console.log(`   ❌ Оба баланса < ставке!`);
    return { balanceType: 'NONE', balance: null, amount: 0 };

  } catch (error) {
    console.error(`❌ [DETERMINE BALANCE] Error:`, error.message);
    return { balanceType: 'NONE', balance: null, amount: 0 };
  }
}

/**
 * 🎰 Отследить ставку для реферальной системы
 * Вызывать ПОСЛЕ успешного списания средств
 * 
 * @param {number} userId - ID игрока
 * @param {number} betAmount - Сумма ставки
 * @param {number} tokenId - ID токена
 * @param {string} balanceType - Тип баланса ('MAIN' | 'BONUS')
 */
async function trackBet(userId, betAmount, tokenId, balanceType = 'MAIN') {
  try {
    console.log(`   📊 [TRACK BET] userId=${userId}, amount=${betAmount}, type=${balanceType}`);
    await referralService.processBet(userId, betAmount, tokenId, balanceType);
    console.log(`   ✅ [TRACK BET] Отслежено`);
  } catch (error) {
    console.warn(`⚠️ [REFERRAL] Error tracking bet for user ${userId}:`, error.message);
  }
}

/**
 * 💳 Списать ставку с правильного баланса
 * Возвращает информацию о том с какого баланса было списано
 * 
 * FLOW:
 * 1. Определить баланс (BONUS → MAIN)
 * 2. Проверить достаточность средств
 * 3. Списать средства
 * 4. Отследить в реферальной системе
 * 
 * @param {number} userId 
 * @param {number} betAmount 
 * @param {number} tokenId 
 * @returns {Object} { success, error?, balanceType, newBalance }
 */
async function deductBetFromBalance(userId, betAmount, tokenId) {
  console.log(`\n💳 [DEDUCT BET] Списание ставки...`);

  try {
    // 1️⃣ Определяем баланс
    const { balanceType, balance, amount } = await determineBalanceForBet(userId, betAmount, tokenId);

    if (balanceType === 'NONE' || !balance) {
      console.log(`❌ [DEDUCT BET] Баланс не найден или недостаточно средств`);
      return { 
        success: false, 
        error: 'Insufficient balance',
        balanceType: 'NONE'
      };
    }

    if (amount < betAmount) {
      console.log(`❌ [DEDUCT BET] ${balanceType} баланс < ставке (${amount.toFixed(8)} < ${betAmount})`);
      return { 
        success: false, 
        error: `Insufficient ${balanceType} balance`,
        balanceType
      };
    }

    // 2️⃣ Списываем средства
    console.log(`   💸 Списываю ${betAmount} с ${balanceType} баланса...`);
    
    const updated = await prisma.balance.update({
      where: { id: balance.id },
      data: { amount: { decrement: betAmount } }
    });

    const newBalance = parseFloat(updated.amount.toString());
    console.log(`   ✅ Списано! Новый баланс: ${newBalance.toFixed(8)}`);

    // 3️⃣ Отслеживаем для реферальной системы
    await trackBet(userId, betAmount, tokenId, balanceType);

    console.log(`✅ [DEDUCT BET] УСПЕХ: ${balanceType}, новый баланс=${newBalance.toFixed(8)}\n`);

    return {
      success: true,
      balanceType,
      newBalance,
      fromBonus: balanceType === 'BONUS'
    };

  } catch (error) {
    console.error(`❌ [DEDUCT BET] ОШИБКА:`, error.message);
    return { 
      success: false, 
      error: error.message || 'Failed to deduct bet',
      balanceType: 'NONE'
    };
  }
}

/**
 * 🏆 Зачислить выигрыш
 * 
 * Выигрыш ВСЕГДА идёт на тот же баланс с которого была ставка!
 * 
 * @param {number} userId 
 * @param {number} winAmount 
 * @param {number} tokenId 
 * @param {string} balanceType - 'MAIN' или 'BONUS' (должно соответствовать ставке)
 */
async function creditWinnings(userId, winAmount, tokenId, balanceType = 'MAIN') {
  try {
    console.log(`\n🏆 [CREDIT WINNINGS] userId=${userId}, amount=${winAmount}, type=${balanceType}`);

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
    console.log(`✅ [CREDIT WINNINGS] Выигрыш на ${balanceType}: ${newBalance.toFixed(8)}\n`);

    return { success: true, newBalance };

  } catch (error) {
    console.error(`❌ [CREDIT WINNINGS] ОШИБКА:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📊 Получить баланс для отображения (ОБЪЕДИНЁННЫЙ)
 * 
 * Возвращает:
 * - main: только основной баланс
 * - bonus: только бонусный баланс
 * - total: объединённый (MAIN + BONUS)
 * 
 * @param {number} userId 
 * @param {number} tokenId 
 * @returns {Object}
 */
async function getDisplayBalance(userId, tokenId) {
  return getUserBalances(userId, tokenId);
}

/**
 * 🎮 Создать объект баланса для фронта
 * 
 * @param {number} userId 
 * @param {number} tokenId 
 * @param {string} tokenSymbol 
 * @returns {Array} массив с main и bonus
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
    return [
      { tokenId, symbol: tokenSymbol, amount: 0, type: 'MAIN' },
      { tokenId, symbol: tokenSymbol, amount: 0, type: 'BONUS' }
    ];
  }
}

/**
 * 📝 Вспомогательная функция для логирования баланса
 */
async function logBalanceState(userId, tokenId, prefix = '') {
  const balances = await getUserBalances(userId, tokenId);
  console.log(`${prefix} [BALANCE STATE] Main=${balances.main.toFixed(8)}, Bonus=${balances.bonus.toFixed(8)}, Total=${balances.total.toFixed(8)}`);
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
  logBalanceState
};