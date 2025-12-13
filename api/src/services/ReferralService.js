/**
 * ✅ ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ ReferralService.js
 * 
 * ИСПРАВЛЕНИЯ:
 * 1. MAX_PAYOUT = (Депо + Бонус) * 3
 * 2. Убрали неправильный user relation из userBonus.create()
 * 3. Добавили processAllPendingCommissions метод
 * 4. Все параметры правильные
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');

class ReferralService {
  static CONFIG = {
    // БОНУСНАЯ СИСТЕМА
    DEPOSIT_BONUS_PERCENT: 100,
    MAX_BONUS_AMOUNT: 1500,
    
    // ВЕЙДЖЕР И СТАВКИ
    WAGERING_MULTIPLIER: 10,
    MAX_BET_AMOUNT: 100,
    MAX_PAYOUT_MULTIPLIER: 3,
    
    // МИНИМУМЫ И МАКСИМУМЫ
    MIN_DEPOSIT_AMOUNT: 10,
    MINIMUM_BONUS_BALANCE: 0.20,
    
    // СРОКИ
    BONUS_EXPIRY_DAYS: 7,
    
    // КОМИССИИ (для реферальной программы)
    HOUSE_EDGE: 0.03,
    REGULAR_COMMISSION_RATE: 0.30,
    WORKER_PROFIT_SHARE: 0.05
  };

  /**
   * 🎁 ВЫДАТЬ ДЕПОЗИТНЫЙ БОНУС
   */
  async grantDepositBonus(userId, depositAmount, tokenId, referrerId) {
    console.log(`\n🎁 [GRANT BONUS] userId=${userId}, deposit=${depositAmount.toFixed(8)}`);

    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        console.error(`❌ Invalid userId`);
        return null;
      }

      const depositNum = parseFloat(depositAmount);
      if (isNaN(depositNum) || depositNum <= 0) {
        console.error(`❌ Invalid deposit amount`);
        return null;
      }

      // ✅ ПРОВЕРКА 1: Минимальный депозит >= 10 USDT
      if (depositNum < ReferralService.CONFIG.MIN_DEPOSIT_AMOUNT) {
        console.log(`❌ [GRANT BONUS] Deposit below minimum (${depositNum.toFixed(8)} < ${ReferralService.CONFIG.MIN_DEPOSIT_AMOUNT})`);
        return null;
      }

      console.log(`   ✅ Deposit is valid (>= ${ReferralService.CONFIG.MIN_DEPOSIT_AMOUNT})`);

      // ✅ ПРОВЕРКА 2: Нет активного бонуса
      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId: userIdNum,
          tokenId,
          isActive: true,
          isCompleted: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (activeBonus) {
        console.log(`⚠️ [GRANT BONUS] User already has active bonus`);
        return null;
      }

      // ✅ РАССЧИТЫВАЕМ БОНУС с лимитом 1500
      let bonusAmount = depositNum * (ReferralService.CONFIG.DEPOSIT_BONUS_PERCENT / 100);
      const maxBonus = ReferralService.CONFIG.MAX_BONUS_AMOUNT;

      if (bonusAmount > maxBonus) {
        console.log(`   ⚠️ Calculated bonus ${bonusAmount.toFixed(8)} exceeds maximum ${maxBonus}`);
        bonusAmount = maxBonus;
        console.log(`   ✅ Capped bonus to ${maxBonus}`);
      }

      // ✅ ИТОГОВАЯ СУММА (всё что пойдёт на BONUS баланс)
      const totalAmount = depositNum + bonusAmount;
      
      // ✅ ВЕЙДЖЕР = 10x от ВСЕЙ суммы (депо + бонус)
      const requiredWager = totalAmount * ReferralService.CONFIG.WAGERING_MULTIPLIER;
      
      // ✅ ИСПРАВЛЕНИЕ: Max выплата от ВСЕЙ суммы, а не только депозита!
      const maxPayoutAmount = totalAmount * ReferralService.CONFIG.MAX_PAYOUT_MULTIPLIER;
      
      // ✅ СРОКИ ИСТЕЧЕНИЯ
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ReferralService.CONFIG.BONUS_EXPIRY_DAYS);

      console.log(`\n📊 [GRANT BONUS] Расчеты:`);
      console.log(`   💙 Депозит: ${depositNum.toFixed(8)} USDT`);
      console.log(`   💛 Бонус: ${bonusAmount.toFixed(8)} USDT (макс: ${maxBonus})`);
      console.log(`   📈 ВСЕГО на BONUS: ${totalAmount.toFixed(8)} USDT`);
      console.log(`   ⚡ Требуемый вейджер: ${requiredWager.toFixed(8)} USDT`);
      console.log(`   🎲 Макс ставка: ${ReferralService.CONFIG.MAX_BET_AMOUNT} USDT`);
      console.log(`   💰 Макс выплата: ${maxPayoutAmount.toFixed(8)} USDT (${ReferralService.CONFIG.MAX_PAYOUT_MULTIPLIER}x от ВСЕЙ суммы)`);
      console.log(`   ⏰ Истекает: ${expiresAt.toISOString()}`);

      const result = await prisma.$transaction(async (tx) => {
        // 1️⃣ ОЧИЩАЕМ MAIN баланс (депозит НЕ идёт в MAIN!)
        const mainBalance = await tx.balance.findUnique({
          where: { userId_tokenId_type: { userId: userIdNum, tokenId, type: 'MAIN' } }
        });

        if (mainBalance) {
          await tx.balance.update({
            where: { id: mainBalance.id },
            data: { amount: '0' }
          });
          console.log(`   ✅ MAIN баланс очищен (был: ${parseFloat(mainBalance.amount.toString()).toFixed(8)})`);
        }

        // 2️⃣ СОЗДАЁМ UserBonus запись
        // ✅ ИСПРАВЛЕНИЕ: Убираем неправильный user relation!
        const userBonus = await tx.userBonus.create({
          data: {
            userId: userIdNum,
            tokenId,
            grantedAmount: bonusAmount.toFixed(8),
            requiredWager: requiredWager.toFixed(8),
            wageredAmount: '0',
            isActive: true,
            isCompleted: false,
            expiresAt,
            referrerId: referrerId || null
          }
        });

        console.log(`   ✅ UserBonus создан: ID=${userBonus.id}`);

        // 3️⃣ КЛАДЁМ ВСЮ СУММУ на BONUS баланс (депозит + бонус)
        await tx.balance.upsert({
          where: { userId_tokenId_type: { userId: userIdNum, tokenId, type: 'BONUS' } },
          create: {
            userId: userIdNum,
            tokenId,
            type: 'BONUS',
            amount: totalAmount.toFixed(8)
          },
          update: {
            amount: { increment: totalAmount }
          }
        });

        console.log(`   ✅ BONUS баланс: ${totalAmount.toFixed(8)} USDT`);

        return {
          userBonusId: userBonus.id,
          depositAmount: depositNum,
          bonusAmount: bonusAmount,
          totalAmount: totalAmount,
          requiredWager: requiredWager,
          expiresAt: expiresAt,
          maxBetAmount: ReferralService.CONFIG.MAX_BET_AMOUNT,
          maxPayoutAmount: maxPayoutAmount
        };
      });

      console.log(`\n✅ [GRANT BONUS] Success! Баланс: MAIN=0, BONUS=${result.totalAmount.toFixed(8)}\n`);

      logger.info('REFERRAL', 'Deposit bonus granted', {
        userId: userIdNum,
        depositAmount: depositNum.toFixed(8),
        bonusAmount: bonusAmount.toFixed(8),
        totalAmount: result.totalAmount.toFixed(8),
        requiredWager: result.requiredWager.toFixed(8),
        maxPayoutAmount: result.maxPayoutAmount.toFixed(8)
      });

      return result;
    } catch (error) {
      console.error(`❌ [GRANT BONUS] Error:`, error.message);
      logger.error('REFERRAL', 'Error granting bonus', { error: error.message });
      return null;
    }
  }

  /**
   * 🎰 ОБРАБОТАТЬ СТАВКУ
   */
  async processBet(userId, betAmount, tokenId, balanceType = 'MAIN') {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) return;

      const betNum = parseFloat(betAmount);
      if (isNaN(betNum) || betNum <= 0) return;

      const maxBet = ReferralService.CONFIG.MAX_BET_AMOUNT;
      if (betNum > maxBet) {
        logger.warn('REFERRAL', 'Bet exceeds maximum', {
          userId: userIdNum,
          betAmount: betNum.toFixed(8),
          maxBet: maxBet
        });
        console.warn(`⚠️ [PROCESS BET] Bet ${betNum.toFixed(8)} exceeds max ${maxBet}`);
        return;
      }

      if (balanceType === 'BONUS') {
        const activeBonus = await prisma.userBonus.findFirst({
          where: {
            userId: userIdNum,
            tokenId,
            isActive: true,
            isCompleted: false
          }
        });

        if (activeBonus) {
          const newWagered = parseFloat(activeBonus.wageredAmount.toString()) + betNum;
          await prisma.userBonus.update({
            where: { id: activeBonus.id },
            data: { wageredAmount: newWagered.toFixed(8) }
          });

          console.log(`📊 [PROCESS BET] Вейджер обновлён: ${newWagered.toFixed(8)}`);
        }
      }
    } catch (error) {
      logger.warn('REFERRAL', 'Error processing bet', { error: error.message });
    }
  }

  /**
   * ⚡ ПРОВЕРИТЬ И АННУЛИРОВАТЬ БОНУС если баланс < 0.20 USDT
   */
  async checkAndAnnulateBonusIfLow(userId, tokenId, userBonusId) {
    console.log(`\n⚡ [CHECK ANNULATE] userId=${userId}, userBonusId=${userBonusId}`);

    try {
      const bonus = await prisma.userBonus.findUnique({
        where: { id: userBonusId }
      });

      if (!bonus) {
        console.log(`   ℹ️ Bonus not found`);
        return { annulated: false };
      }

      if (!bonus.isActive || bonus.isCompleted) {
        console.log(`   ℹ️ Bonus not active`);
        return { annulated: false };
      }

      const bonusBalance = await prisma.balance.findUnique({
        where: {
          userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
        }
      });

      if (!bonusBalance) {
        console.log(`   ℹ️ BONUS balance not found`);
        return { annulated: false };
      }

      const currentBonusAmount = parseFloat(bonusBalance.amount.toString());
      const minimumBalance = ReferralService.CONFIG.MINIMUM_BONUS_BALANCE;

      console.log(`   💛 Current BONUS: ${currentBonusAmount.toFixed(8)} USDT`);
      console.log(`   📊 Minimum required: ${minimumBalance.toFixed(8)} USDT`);

      if (currentBonusAmount < minimumBalance) {
        console.log(`\n⚠️ [ANNULATE] BONUS balance too low! Annulating bonus...`);

        await prisma.$transaction(async (tx) => {
          if (currentBonusAmount > 0) {
            console.log(`   💳 Returning ${currentBonusAmount.toFixed(8)} to MAIN`);

            await tx.balance.update({
              where: { id: bonusBalance.id },
              data: { amount: '0' }
            });

            await tx.balance.upsert({
              where: {
                userId_tokenId_type: { userId, tokenId, type: 'MAIN' }
              },
              update: {
                amount: { increment: currentBonusAmount }
              },
              create: {
                userId,
                tokenId,
                type: 'MAIN',
                amount: currentBonusAmount.toFixed(8)
              }
            });

            console.log(`   ✅ Returned to MAIN`);
          } else {
            console.log(`   ℹ️ BONUS balance is 0`);
            
            await tx.balance.update({
              where: { id: bonusBalance.id },
              data: { amount: '0' }
            });
          }

          await tx.userBonus.update({
            where: { id: userBonusId },
            data: {
              isActive: false,
              isCompleted: true,
              completedAt: new Date()
            }
          });

          console.log(`   ✅ Bonus marked as completed (annulated)`);
        });

        console.log(`\n✅ [ANNULATE] Bonus annulated successfully!\n`);

        logger.info('REFERRAL', 'Bonus annulated due to low balance', {
          userId,
          userBonusId,
          returnedAmount: currentBonusAmount.toFixed(8)
        });

        return {
          annulated: true,
          returnedAmount: currentBonusAmount,
          reason: 'Balance below minimum'
        };
      }

      console.log(`   ✅ Bonus is fine, no annulation needed\n`);
      return { annulated: false };

    } catch (error) {
      console.error(`❌ [CHECK ANNULATE] Error:`, error.message);
      logger.error('REFERRAL', 'Error checking bonus annulation', { error: error.message });
      return { annulated: false, error: error.message };
    }
  }

  /**
   * 👥 ПРОВЕРИТЬ ДОСТУПНОСТЬ БОНУСА
   */
  async checkBonusAvailability(userId) {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return { canUseBonus: false, reason: 'Invalid userId' };
      }

      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { referredById: true }
      });

      if (!user?.referredById) {
        return { canUseBonus: false, reason: 'No referrer' };
      }

      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId: userIdNum,
          isActive: true,
          isCompleted: false
        }
      });

      if (activeBonus) {
        return { canUseBonus: false, reason: 'Active bonus exists' };
      }

      return { canUseBonus: true };
    } catch (error) {
      logger.error('REFERRAL', 'Error checking bonus availability', { error: error.message });
      return { canUseBonus: false, reason: 'Error' };
    }
  }

  /**
   * 👥 ПОЛУЧИТЬ СТАТИСТИКУ РЕФЕРЕРА
   */
  async getReferrerStats(userId) {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) return null;

      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { referrerType: true }
      });

      if (!user) return null;

      const referrals = await prisma.user.findMany({
        where: { referredById: userIdNum },
        select: { id: true }
      });

      const referralIds = referrals.map(r => r.id);

      let totalTurnover = 0;
      let totalCommissionPaid = 0;

      for (const refId of referralIds) {
        const txSum = await prisma.transaction.aggregate({
          where: { userId: refId, type: 'DEPOSIT', status: 'COMPLETED' },
          _sum: { amount: true }
        });

        const turnover = parseFloat(txSum._sum.amount?.toString() || '0');
        totalTurnover += turnover;

        const commission = turnover * (ReferralService.CONFIG.REGULAR_COMMISSION_RATE / 100);
        totalCommissionPaid += commission;
      }

      const potentialCommission = totalTurnover * (ReferralService.CONFIG.REGULAR_COMMISSION_RATE / 100);

      return {
        referralsCount: referralIds.length,
        totalTurnover: parseFloat(totalTurnover.toFixed(8)),
        totalCommissionPaid: parseFloat(totalCommissionPaid.toFixed(8)),
        potentialCommission: parseFloat(potentialCommission.toFixed(8)),
        commissionRate: ReferralService.CONFIG.REGULAR_COMMISSION_RATE
      };
    } catch (error) {
      logger.error('REFERRAL', 'Error getting referrer stats', { error: error.message });
      return null;
    }
  }

  /**
   * 📊 ПОЛУЧИТЬ СТАТИСТИКУ БОНУСА
   */
  async getBonusStats(userId) {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) return null;

      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId: userIdNum,
          isActive: true,
          isCompleted: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (!activeBonus) {
        return {
          hasActiveBonus: false,
          bonus: null
        };
      }

      const wagered = parseFloat(activeBonus.wageredAmount.toString());
      const required = parseFloat(activeBonus.requiredWager.toString());
      const granted = parseFloat(activeBonus.grantedAmount.toString());
      
      // ✅ ИСПРАВЛЕНИЕ: Max выплата = ВСЕЙ суммы * 3
      const totalAmount = required / ReferralService.CONFIG.WAGERING_MULTIPLIER;
      const maxPayoutAmount = totalAmount * ReferralService.CONFIG.MAX_PAYOUT_MULTIPLIER;

      return {
        hasActiveBonus: true,
        bonus: {
          id: activeBonus.id,
          granted: granted,
          required: required,
          wagered: wagered,
          progress: Math.min((wagered / required) * 100, 100),
          remaining: Math.max(required - wagered, 0),
          expiresAt: activeBonus.expiresAt,
          isExpired: new Date() > activeBonus.expiresAt,
          maxBetAmount: ReferralService.CONFIG.MAX_BET_AMOUNT,
          maxPayoutAmount: maxPayoutAmount,
          maxPayoutMultiplier: ReferralService.CONFIG.MAX_PAYOUT_MULTIPLIER
        }
      };
    } catch (error) {
      logger.error('REFERRAL', 'Error getting bonus stats', { error: error.message });
      return { hasActiveBonus: false };
    }
  }

  /**
   * 💰 ОБРАБОТАТЬ ВСЕ НАКОПЛЕННЫЕ КОМИССИИ
   * ✅ НОВОЕ: Этот метод был отсутствующим!
   */
  async processAllPendingCommissions(tokenId = 2) {
    console.log(`\n💰 [PROCESS COMMISSIONS] Starting...`);
    
    try {
      const referrers = await prisma.user.findMany({
        where: { referrerType: { in: ['REGULAR', 'WORKER'] } },
        select: { id: true, referrerType: true }
      });

      let processed = 0;
      let success = 0;
      let totalPaid = 0;

      const breakdown = { workers: 0, regular: 0 };

      for (const referrer of referrers) {
        try {
          // Получаем рефералов
          const referrals = await prisma.user.findMany({
            where: { referredById: referrer.id },
            select: { id: true }
          });

          for (const referral of referrals) {
            // Получаем сумму депозитов
            const depositSum = await prisma.transaction.aggregate({
              where: {
                userId: referral.id,
                type: 'DEPOSIT',
                status: 'COMPLETED'
              },
              _sum: { amount: true }
            });

            const depositAmount = parseFloat(depositSum._sum.amount?.toString() || '0');
            
            if (depositAmount <= 0) continue;

            // Рассчитываем комиссию
            const commissionRate = referrer.referrerType === 'WORKER' 
              ? ReferralService.CONFIG.WORKER_PROFIT_SHARE 
              : ReferralService.CONFIG.REGULAR_COMMISSION_RATE;

            const commission = depositAmount * (commissionRate / 100);

            if (commission <= 0) continue;

            // Добавляем комиссию на баланс
            await prisma.balance.upsert({
              where: {
                userId_tokenId_type: {
                  userId: referrer.id,
                  tokenId,
                  type: 'MAIN'
                }
              },
              create: {
                userId: referrer.id,
                tokenId,
                type: 'MAIN',
                amount: commission.toFixed(8)
              },
              update: {
                amount: { increment: commission }
              }
            });

            processed++;
            success++;
            totalPaid += commission;

            if (referrer.referrerType === 'WORKER') {
              breakdown.workers++;
            } else {
              breakdown.regular++;
            }

            console.log(`   ✅ Commission paid to user ${referrer.id}: ${commission.toFixed(8)} USDT`);
          }
        } catch (error) {
          console.error(`   ❌ Error processing referrer ${referrer.id}:`, error.message);
          processed++;
        }
      }

      console.log(`\n📊 [PROCESS COMMISSIONS] Completed:`);
      console.log(`   Processed: ${processed}`);
      console.log(`   Success: ${success}`);
      console.log(`   Total paid: ${totalPaid.toFixed(8)} USDT`);
      console.log(`   Workers: ${breakdown.workers}, Regular: ${breakdown.regular}`);

      return {
        processed,
        success,
        totalPaid: totalPaid.toFixed(8),
        breakdown
      };
    } catch (error) {
      console.error(`❌ [PROCESS COMMISSIONS] Error:`, error.message);
      logger.error('REFERRAL', 'Error processing all commissions', { error: error.message });
      throw error;
    }
  }

  /**
   * 💰 ПОЛУЧИТЬ ВСЕ ЛИМИТЫ И КОНФИГУРАЦИЮ
   */
  static getLimits() {
    return {
      minDeposit: ReferralService.CONFIG.MIN_DEPOSIT_AMOUNT,
      maxBonus: ReferralService.CONFIG.MAX_BONUS_AMOUNT,
      maxBet: ReferralService.CONFIG.MAX_BET_AMOUNT,
      maxPayoutMultiplier: ReferralService.CONFIG.MAX_PAYOUT_MULTIPLIER,
      depositBonusPercent: ReferralService.CONFIG.DEPOSIT_BONUS_PERCENT,
      wageringMultiplier: ReferralService.CONFIG.WAGERING_MULTIPLIER,
      bonusExpiryDays: ReferralService.CONFIG.BONUS_EXPIRY_DAYS,
      minimumBonusBalance: ReferralService.CONFIG.MINIMUM_BONUS_BALANCE
    };
  }
}

module.exports = new ReferralService();