/**
 * 🎯 ИСПРАВЛЕННЫЙ gameReferralHelper.js
 * 
 * ЛОГИКА БАЛАНСА С ВЕЙДЖЕРОМ:
 * 1. При ставке: BONUS → MAIN (приоритет бонусу)
 * 2. При выигрыше: На тот же баланс откуда взяли ставку
 * 3. ОТЫГРЫШ: Ставка считается в wageredAmount (UserBonus)
 * 4. После отыгрыша: BONUS → MAIN (конверсия)
 * 
 * 🆕 ОБНОВЛЕНО: Теперь возвращает userBonusId!
 */

const referralService = require('../../services/ReferralService');
const prisma = require('../../../prismaClient');

/**
 * 💰 Получить оба баланса пользователя с объединённой суммой
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
    console.error(`❌ [BALANCE] Error getting user balances:`, error.message);
    return { main: 0, bonus: 0, total: 0 };
  }
}

/**
 * 🎰 Определить с какого баланса списывать ставку
 * ПРИОРИТЕТ: BONUS → MAIN
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

    if (bonusAmount >= betAmount) {
      console.log(`   ✅ BONUS >= ставке, ИСПОЛЬЗУЕМ BONUS`);
      
      // 🆕 Получи ID активного бонуса
      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId,
          tokenId,
          isActive: true,
          isCompleted: false,
          expiresAt: { gt: new Date() }
        }
      });
      
      return { 
        balanceType: 'BONUS', 
        balance: bonusBalance, 
        amount: bonusAmount,
        userBonusId: activeBonus?.id || null  // 🆕 ID ДЛЯ ВЕЙДЖЕРА
      };
    }

    // 2️⃣ Основной баланс
    const mainBalance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: { userId, tokenId, type: 'MAIN' }
      }
    });

    const mainAmount = mainBalance ? parseFloat(mainBalance.amount.toString()) : 0;
    console.log(`   🔵 MAIN баланс: ${mainAmount.toFixed(8)}`);

    if (mainAmount >= betAmount) {
      console.log(`   ✅ MAIN >= ставке, используем MAIN`);
      return { 
        balanceType: 'MAIN', 
        balance: mainBalance, 
        amount: mainAmount,
        userBonusId: null  // 🆕 ДОБАВЛЕНО
      };
    }

    console.log(`   ❌ Недостаточно средств!`);
    return { 
      balanceType: 'NONE', 
      balance: null, 
      amount: 0,
      userBonusId: null
    };

  } catch (error) {
    console.error(`❌ [DETERMINE BALANCE] Error:`, error.message);
    return { 
      balanceType: 'NONE', 
      balance: null, 
      amount: 0,
      userBonusId: null
    };
  }
}

/**
 * 🎰 Отследить ставку для реферальной системы И ВЕЙДЖЕРА
 */
async function trackBet(userId, betAmount, tokenId, balanceType = 'MAIN') {
  try {
    console.log(`   📊 [TRACK BET] userId=${userId}, amount=${betAmount}, type=${balanceType}`);
    
    // Отследить в реферальной системе
    await referralService.processBet(userId, betAmount, tokenId, balanceType);
    
    // 🆕 ЕСЛИ СТАВКА С БОНУСА - ОБНОВЛЯЕМ WAGERED AMOUNT
    if (balanceType === 'BONUS') {
      console.log(`   💛 [UPDATE WAGER] Обновляю wageredAmount для бонусов...`);
      
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
        const newWagered = parseFloat(activeBonus.wageredAmount.toString()) + betAmount;
        const requiredWager = parseFloat(activeBonus.requiredWager.toString());

        console.log(`   💛 Текущий вейджер: ${newWagered.toFixed(8)} / ${requiredWager.toFixed(8)}`);

        await prisma.userBonus.update({
          where: { id: activeBonus.id },
          data: { wageredAmount: newWagered.toString() }
        });

        if (newWagered >= requiredWager) {
          console.log(`   ✅ ВЕЙДЖЕР ВЫПОЛНЕН!`);
          await convertBonusToMain(userId, tokenId, activeBonus.id);
        }
      }
    }
    
    console.log(`   ✅ [TRACK BET] Отслежено`);
  } catch (error) {
    console.warn(`⚠️ [TRACK BET] Error:`, error.message);
  }
}

/**
 * 🆕 КОНВЕРСИЯ БОНУСА В MAIN
 */
async function convertBonusToMain(userId, tokenId, bonusId) {
  try {
    console.log(`\n💳 [CONVERT BONUS] userId=${userId}, bonusId=${bonusId}`);

    const bonusBalance = await prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } }
    });

    if (!bonusBalance) {
      console.log(`⚠️ [CONVERT BONUS] Бонусный баланс не найден`);
      return;
    }

    const bonusAmount = parseFloat(bonusBalance.amount.toString());
    console.log(`   💛 Конвертирую ${bonusAmount.toFixed(8)} BONUS → MAIN`);

    await prisma.$transaction(async (tx) => {
      // Обнуляем BONUS
      await tx.balance.update({
        where: { id: bonusBalance.id },
        data: { amount: 0 }
      });

      // Добавляем в MAIN
      await tx.balance.upsert({
        where: { userId_tokenId_type: { userId, tokenId, type: 'MAIN' } },
        create: {
          userId,
          tokenId,
          type: 'MAIN',
          amount: bonusAmount.toString()
        },
        update: {
          amount: { increment: bonusAmount }
        }
      });

      // Отмечаем бонус как завершённый
      await tx.userBonus.update({
        where: { id: bonusId },
        data: { isCompleted: true }
      });

      // Записываем транзакцию
      await tx.transaction.create({
        data: {
          userId,
          tokenId,
          type: 'BONUS_TO_MAIN',
          amount: bonusAmount.toString(),
          status: 'COMPLETED'
        }
      });
    });

    console.log(`   ✅ [CONVERT BONUS] ${bonusAmount.toFixed(8)} переведено в MAIN\n`);

  } catch (error) {
    console.error(`❌ [CONVERT BONUS] Error:`, error.message);
  }
}

/**
 * 💳 Списать ставку с правильного баланса
 * 🆕 Теперь ВОЗВРАЩАЕТ userBonusId для отыгрыша!
 */
async function deductBetFromBalance(userId, betAmount, tokenId) {
  console.log(`\n💳 [DEDUCT BET] Списание ставки...`);

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
      console.log(`❌ [DEDUCT BET] ${balanceType} баланс < ставке`);
      return { 
        success: false, 
        error: `Insufficient ${balanceType} balance`,
        balanceType,
        userBonusId: null
      };
    }

    // Списываем средства
    console.log(`   💸 Списываю ${betAmount} с ${balanceType} баланса...`);
    
    const updated = await prisma.balance.update({
      where: { id: balance.id },
      data: { amount: { decrement: betAmount } }
    });

    const newBalance = parseFloat(updated.amount.toString());
    console.log(`   ✅ Списано! Новый баланс: ${newBalance.toFixed(8)}`);

    // Отслеживаем для реферальной системы И ВЕЙДЖЕРА
    await trackBet(userId, betAmount, tokenId, balanceType);

    console.log(`✅ [DEDUCT BET] УСПЕХ: ${balanceType}, userBonusId=${userBonusId}\n`);

    return {
      success: true,
      balanceType,
      newBalance,
      fromBonus: balanceType === 'BONUS',
      userBonusId  // 🆕 ВОЗВРАЩАЕМ ID БОНУСА!
    };

  } catch (error) {
    console.error(`❌ [DEDUCT BET] ОШИБКА:`, error.message);
    return { 
      success: false, 
      error: error.message || 'Failed to deduct bet',
      balanceType: 'NONE',
      userBonusId: null
    };
  }
}

/**
 * 🏆 Зачислить выигрыш
 * Выигрыш идёт на ТОТ ЖЕ баланс откуда была ставка!
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
    console.log(`✅ [CREDIT WINNINGS] Выигрыш на ${balanceType}: ${newBalance.toFixed(8)}`);

    // 🆕 ЕСЛИ ВЫИГРЫШ НА БОНУСЕ - ОБНОВЛЯЕМ ВЕЙДЖЕР
    if (balanceType === 'BONUS') {
      console.log(`   💛 [UPDATE WAGER] Выигрыш считается как отыграемая сумма`);
      
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
        const newWagered = parseFloat(activeBonus.wageredAmount.toString()) + winAmount;
        const requiredWager = parseFloat(activeBonus.requiredWager.toString());

        console.log(`   💛 Новый вейджер: ${newWagered.toFixed(8)} / ${requiredWager.toFixed(8)}`);

        await prisma.userBonus.update({
          where: { id: activeBonus.id },
          data: { wageredAmount: newWagered.toString() }
        });

        if (newWagered >= requiredWager) {
          console.log(`   ✅ ВЕЙДЖЕР ВЫПОЛНЕН!`);
          await convertBonusToMain(userId, tokenId, activeBonus.id);
        }
      }
    }

    console.log();
    return { success: true, newBalance };

  } catch (error) {
    console.error(`❌ [CREDIT WINNINGS] ОШИБКА:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📊 Получить баланс для отображения (ОБЪЕДИНЁННЫЙ)
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
  convertBonusToMain,
  logBalanceState
};