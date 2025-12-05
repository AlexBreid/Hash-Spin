const referralService = require('../../services/ReferralService');
const prisma = require('../../../prismaClient');

/**
 * 🎯 Определить с какого баланса списывать ставку
 * Приоритет: BONUS -> MAIN
 * 
 * @param {number} userId 
 * @param {number} betAmount 
 * @param {number} tokenId 
 * @returns {Object} { balanceType: 'MAIN'|'BONUS', balance: Balance }
 */
async function determineBalanceForBet(userId, betAmount, tokenId) {
  // Сначала проверяем бонусный баланс
  const bonusBalance = await prisma.balance.findUnique({
    where: {
      userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
    }
  });

  if (bonusBalance && parseFloat(bonusBalance.amount.toString()) >= betAmount) {
    // Проверяем есть ли активный бонус для отыгрыша
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
      return { balanceType: 'BONUS', balance: bonusBalance };
    }
  }

  // Основной баланс
  const mainBalance = await prisma.balance.findUnique({
    where: {
      userId_tokenId_type: { userId, tokenId, type: 'MAIN' }
    }
  });

  return { balanceType: 'MAIN', balance: mainBalance };
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
    await referralService.processBet(userId, betAmount, tokenId, balanceType);
  } catch (error) {
    // Логируем но не прерываем игру
    console.error(`⚠️ [REFERRAL] Error tracking bet for user ${userId}:`, error.message);
  }
}

/**
 * 💰 Списать ставку с правильного баланса
 * Возвращает информацию о том с какого баланса было списано
 * 
 * @param {number} userId 
 * @param {number} betAmount 
 * @param {number} tokenId 
 * @returns {Object} { success: boolean, balanceType: string, newBalance: number }
 */
async function deductBetFromBalance(userId, betAmount, tokenId) {
  const { balanceType, balance } = await determineBalanceForBet(userId, betAmount, tokenId);

  if (!balance || parseFloat(balance.amount.toString()) < betAmount) {
    return { success: false, error: 'Insufficient balance' };
  }

  // Списываем средства
  const updated = await prisma.balance.update({
    where: { id: balance.id },
    data: { amount: { decrement: betAmount } }
  });

  // Отслеживаем для реферальной системы
  await trackBet(userId, betAmount, tokenId, balanceType);

  return {
    success: true,
    balanceType,
    newBalance: parseFloat(updated.amount.toString()),
    fromBonus: balanceType === 'BONUS'
  };
}

/**
 * 🏆 Зачислить выигрыш
 * Выигрыш всегда идёт на тот же баланс с которого была ставка
 * 
 * @param {number} userId 
 * @param {number} winAmount 
 * @param {number} tokenId 
 * @param {string} balanceType 
 */
async function creditWinnings(userId, winAmount, tokenId, balanceType = 'MAIN') {
  await prisma.balance.upsert({
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
}

/**
 * 📊 Получить оба баланса пользователя
 */
async function getUserBalances(userId, tokenId) {
  const [main, bonus] = await Promise.all([
    prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'MAIN' } }
    }),
    prisma.balance.findUnique({
      where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } }
    })
  ]);

  return {
    main: parseFloat(main?.amount?.toString() || '0'),
    bonus: parseFloat(bonus?.amount?.toString() || '0'),
    total: parseFloat(main?.amount?.toString() || '0') + parseFloat(bonus?.amount?.toString() || '0')
  };
}

module.exports = {
  determineBalanceForBet,
  trackBet,
  deductBetFromBalance,
  creditWinnings,
  getUserBalances
};
