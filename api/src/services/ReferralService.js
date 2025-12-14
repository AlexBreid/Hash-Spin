/**
 * ✅ ReferralService.js - ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ
 * 
 * ПРОБЛЕМА: WORKER считал комиссии с нуля каждый раз от totalLosses
 * РЕШЕНИЕ: 
 * - REGULAR использует newTurnoverSinceLastPayout (обнуляется после выплаты)
 * - WORKER использует newLossesSinceLastPayout (обнуляется после выплаты)
 * 
 * КОМИССИИ:
 * 1. REGULAR: (House Edge × newTurnover / 2) × Commission Rate
 * 2. WORKER: 5% от newLosses (обновляется при каждом проигрыше, обнуляется после выплаты)
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const Decimal = require('decimal.js');

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
    
    // КОМИССИИ
    HOUSE_EDGE: 0.02,           // 2% HE (преимущество казино) от оборота
    REGULAR_COMMISSION_RATE: 30,    // 30% от (HE × Turnover / 2)
    WORKER_PROFIT_SHARE: 5.0,   // 5% от потерь рефералов (казино выигрывает)
    
    // ПОРОГ ВЫПЛАТЫ
    COMMISSION_PAYOUT_THRESHOLD: 1  // Выплачивать только если > 1 USDT
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

      if (depositNum < ReferralService.CONFIG.MIN_DEPOSIT_AMOUNT) {
        console.log(`❌ [GRANT BONUS] Deposit below minimum`);
        return null;
      }

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

      let bonusAmount = depositNum * (ReferralService.CONFIG.DEPOSIT_BONUS_PERCENT / 100);
      const maxBonus = ReferralService.CONFIG.MAX_BONUS_AMOUNT;

      if (bonusAmount > maxBonus) {
        bonusAmount = maxBonus;
      }

      const totalAmount = depositNum + bonusAmount;
      const requiredWager = totalAmount * ReferralService.CONFIG.WAGERING_MULTIPLIER;
      const maxPayoutAmount = totalAmount * ReferralService.CONFIG.MAX_PAYOUT_MULTIPLIER;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ReferralService.CONFIG.BONUS_EXPIRY_DAYS);

      const result = await prisma.$transaction(async (tx) => {
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

      logger.info('REFERRAL', 'Deposit bonus granted', { userId: userIdNum });
      return result;
    } catch (error) {
      console.error(`❌ [GRANT BONUS] Error:`, error.message);
      logger.error('REFERRAL', 'Error granting bonus', { error: error.message });
      return null;
    }
  }

  /**
   * 🎰 ОБРАБОТАТЬ СТАВКУ И ДОБАВИТЬ В СТАТИСТИКУ
   */
  async processBet(userId, betAmount, tokenId, balanceType = 'MAIN') {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) return;

      const betNum = parseFloat(betAmount);
      if (isNaN(betNum) || betNum <= 0) return;

      const maxBet = ReferralService.CONFIG.MAX_BET_AMOUNT;
      if (betNum > maxBet) {
        logger.warn('REFERRAL', 'Bet exceeds maximum', { userId: userIdNum, betAmount: betNum });
        return;
      }

      // ⭐ ДОБАВЛЯЕМ В СТАТИСТИКУ РЕФЕРАЛОВ
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { referredById: true }
      });

      if (user?.referredById) {
        // Получаем текущую статистику
        const stats = await prisma.referralStats.findUnique({
          where: {
            referrerId_refereeId_tokenId: {
              referrerId: user.referredById,
              refereeId: userIdNum,
              tokenId
            }
          }
        });

        if (stats) {
          // Обновляем существующую запись
          await prisma.referralStats.update({
            where: { id: stats.id },
            data: {
              totalTurnover: { increment: betNum },
              newTurnoverSinceLastPayout: { increment: betNum }  // ⭐ НОВЫЙ ОБОРОТ ДЛЯ REGULAR
            }
          });
        } else {
          // Создаем новую запись
          await prisma.referralStats.create({
            data: {
              referrerId: user.referredById,
              refereeId: userIdNum,
              tokenId,
              totalTurnover: betNum,
              newTurnoverSinceLastPayout: betNum,
              newLossesSinceLastPayout: 0,  // ⭐ ИНИЦИАЛИЗИРУЕМ ДЛЯ WORKER
              totalCommissionPaid: '0',
              totalLosses: '0',
              totalWinnings: '0'
            }
          });
        }
      }

      // Обновляем бонус если это бонусная ставка
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
        }
      }
    } catch (error) {
      logger.warn('REFERRAL', 'Error processing bet', { error: error.message });
    }
  }

  /**
   * 📊 ОБНОВИТЬ РЕЗУЛЬТАТЫ ИГРЫ (ПОТЕРИ/ВЫИГРЫШИ)
   * ⭐ ВАЖНО: обновляем ТОЛЬКО totalLosses/totalWinnings для истории
   * И обновляем newLossesSinceLastPayout для расчета комиссии WORKER
   */
  async recordGameResult(referrerId, refereeId, tokenId, losses, winnings) {
    try {
      const lossesNum = parseFloat(losses);
      const winningsNum = parseFloat(winnings);

      if (isNaN(lossesNum) || isNaN(winningsNum)) return;

      // ⭐ ОБНОВЛЯЕМ СТАТИСТИКУ
      await prisma.referralStats.updateMany({
        where: {
          referrerId,
          refereeId,
          tokenId
        },
        data: {
          totalLosses: { increment: lossesNum },
          totalWinnings: { increment: winningsNum },
          // ⭐ ВАЖНО: обновляем newLossesSinceLastPayout для WORKER
          newLossesSinceLastPayout: { increment: lossesNum }
        }
      });
    } catch (error) {
      logger.warn('REFERRAL', 'Error recording game result', { error: error.message });
    }
  }

  /**
   * ⚡ АННУЛИРОВАТЬ БОНУС если баланс < 0.20 USDT
   */
  async checkAndAnnulateBonusIfLow(userId, tokenId, userBonusId) {
    console.log(`\n⚡ [CHECK ANNULATE] userId=${userId}, userBonusId=${userBonusId}`);

    try {
      const bonus = await prisma.userBonus.findUnique({
        where: { id: userBonusId }
      });

      if (!bonus || !bonus.isActive || bonus.isCompleted) {
        return { annulated: false };
      }

      const bonusBalance = await prisma.balance.findUnique({
        where: { userId_tokenId_type: { userId, tokenId, type: 'BONUS' } }
      });

      if (!bonusBalance) {
        return { annulated: false };
      }

      const currentBonusAmount = parseFloat(bonusBalance.amount.toString());
      const minimumBalance = ReferralService.CONFIG.MINIMUM_BONUS_BALANCE;

      if (currentBonusAmount < minimumBalance) {
        await prisma.$transaction(async (tx) => {
          await tx.balance.update({
            where: { id: bonusBalance.id },
            data: { amount: '0' }
          });

          await tx.userBonus.update({
            where: { id: userBonusId },
            data: {
              isActive: false,
              isCompleted: true,
              completedAt: new Date()
            }
          });
        });

        logger.info('REFERRAL', 'Bonus annulated due to low balance', { userId, userBonusId });
        return {
          annulated: true,
          lostAmount: currentBonusAmount,
          reason: 'Balance below minimum'
        };
      }

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

      const completedBonus = await prisma.userBonus.findFirst({
        where: {
          userId: userIdNum,
          isCompleted: true
        }
      });

      if (completedBonus) {
        return { canUseBonus: false, reason: 'Bonus already used' };
      }

      return { canUseBonus: true };
    } catch (error) {
      logger.error('REFERRAL', 'Error checking bonus availability', { error: error.message });
      return { canUseBonus: false, reason: 'Error' };
    }
  }

  /**
   * 👥 ПОЛУЧИТЬ СТАТИСТИКУ РЕФЕРЕРА (ИЗ БАЗЫ, БЕЗ ПЕРЕСЧЕТА)
   * 🟢 REGULAR: (House Edge × newTurnover / 2) × Commission Rate
   * 🔴 WORKER: 5% от newLosses
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

      // ⭐ Получаем ВСЮ статистику из БД
      const stats = await prisma.referralStats.findMany({
        where: { referrerId: userIdNum }
      });

      let totalTurnover = new Decimal(0);
      let totalCommissionPaid = new Decimal(0);
      let totalLosses = new Decimal(0);
      let pendingCommission = new Decimal(0);

      for (const stat of stats) {
        totalTurnover = totalTurnover.plus(stat.totalTurnover);
        totalCommissionPaid = totalCommissionPaid.plus(stat.totalCommissionPaid);
        totalLosses = totalLosses.plus(stat.totalLosses || 0);

        // Считаем ожидаемую комиссию на основе типа реферера
        if (user.referrerType === 'REGULAR') {
          // ✅ Используем newTurnoverSinceLastPayout
          const turnover = new Decimal(stat.newTurnoverSinceLastPayout || 0);
          const houseEdge = new Decimal(ReferralService.CONFIG.HOUSE_EDGE);
          const commissionRate = new Decimal(ReferralService.CONFIG.REGULAR_COMMISSION_RATE);
          const commission = houseEdge
            .times(turnover)
            .dividedBy(2)
            .times(commissionRate)
            .dividedBy(100);
          pendingCommission = pendingCommission.plus(commission);
        } else if (user.referrerType === 'WORKER') {
          // ✅ Используем newLossesSinceLastPayout (НЕ totalLosses!)
          const losses = new Decimal(stat.newLossesSinceLastPayout || 0);
          const workerShare = new Decimal(ReferralService.CONFIG.WORKER_PROFIT_SHARE);
          const commission = losses.times(workerShare).dividedBy(100);
          pendingCommission = pendingCommission.plus(commission);
        }
      }

      return {
        referralsCount: stats.length,
        totalTurnover: parseFloat(totalTurnover.toString()),
        totalCommissionPaid: parseFloat(totalCommissionPaid.toString()),
        totalLosses: parseFloat(totalLosses.toString()),
        potentialCommission: parseFloat(pendingCommission.toString()),
        commissionRate: user.referrerType === 'REGULAR' 
          ? ReferralService.CONFIG.REGULAR_COMMISSION_RATE
          : ReferralService.CONFIG.WORKER_PROFIT_SHARE,
        referrerType: user.referrerType
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
        return { hasActiveBonus: false, bonus: null };
      }

      const wagered = parseFloat(activeBonus.wageredAmount.toString());
      const required = parseFloat(activeBonus.requiredWager.toString());
      const granted = parseFloat(activeBonus.grantedAmount.toString());
      
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
   * ⭐ ГЛАВНОЕ: 
   * - REGULAR считает на основе newTurnoverSinceLastPayout
   * - WORKER считает на основе newLossesSinceLastPayout
   * - ОБА обнуляют свои счетчики после выплаты!
   */
  async processAllPendingCommissions(tokenId = 2) {
    console.log(`\n💰 [PROCESS COMMISSIONS] Starting...`);
    console.log(`📅 Time: ${new Date().toISOString()}`);
    
    try {
      // ⭐ Находим ВСЕ статистики
      const allStats = await prisma.referralStats.findMany({
        where: { tokenId },
        include: {
          referrer: { select: { id: true, referrerType: true } },
          referee: { select: { id: true } }
        }
      });

      console.log(`📊 [PROCESS] Found ${allStats.length} referral pairs`);

      let processed = 0;
      let success = 0;
      const breakdown = { workers: 0, workersAmount: 0, regular: 0, regularAmount: 0 };

      for (const stat of allStats) {
        try {
          const referrerType = stat.referrer.referrerType;
          let commission = new Decimal(0);

          if (referrerType === 'REGULAR') {
            // 🟢 REGULAR: (HE × newTurnover / 2) × CommRate
            const turnover = new Decimal(stat.newTurnoverSinceLastPayout || 0);
            
            if (turnover.greaterThan(0)) {
              const houseEdge = new Decimal(ReferralService.CONFIG.HOUSE_EDGE);
              const commissionRate = new Decimal(ReferralService.CONFIG.REGULAR_COMMISSION_RATE);
              
              commission = houseEdge
                .times(turnover)
                .dividedBy(2)
                .times(commissionRate)
                .dividedBy(100);

              console.log(`   🟢 REGULAR ${stat.referrer.id}: Turnover=${turnover.toFixed(2)}, Commission=${commission.toFixed(8)}`);
            }

          } else if (referrerType === 'WORKER') {
            // 🔴 WORKER: 5% от newLosses (⭐ НЕ totalLosses!)
            const losses = new Decimal(stat.newLossesSinceLastPayout || 0);
            
            if (losses.greaterThan(0)) {
              const workerShare = new Decimal(ReferralService.CONFIG.WORKER_PROFIT_SHARE);
              commission = losses.times(workerShare).dividedBy(100);

              console.log(`   🔴 WORKER ${stat.referrer.id}: newLosses=${losses.toFixed(2)}, Commission=${commission.toFixed(8)}`);
            }
          }

          // Только если комиссия выше порога
          if (commission.greaterThanOrEqualTo(ReferralService.CONFIG.COMMISSION_PAYOUT_THRESHOLD)) {
            // ⭐ Выплачиваем и обнуляем счетчики
            const result = await prisma.$transaction(async (tx) => {
              // Добавляем комиссию в баланс реферера
              await tx.balance.upsert({
                where: {
                  userId_tokenId_type: {
                    userId: stat.referrer.id,
                    tokenId,
                    type: 'MAIN'
                  }
                },
                create: {
                  userId: stat.referrer.id,
                  tokenId,
                  type: 'MAIN',
                  amount: commission.toFixed(18)
                },
                update: {
                  amount: { increment: commission.toFixed(18) }
                }
              });

              // ⭐ ГЛАВНОЕ: Обнулить оба счетчика!
              await tx.referralStats.update({
                where: { id: stat.id },
                data: {
                  newTurnoverSinceLastPayout: 0,      // ⭐ Обнулить для REGULAR
                  newLossesSinceLastPayout: 0,        // ⭐ Обнулить для WORKER
                  totalCommissionPaid: { increment: commission.toFixed(18) },
                  lastPayoutAt: new Date()
                }
              });

              // Логируем транзакцию
              await tx.transaction.create({
                data: {
                  userId: stat.referrer.id,
                  tokenId,
                  type: 'REFERRAL_COMMISSION',
                  status: 'COMPLETED',
                  amount: commission.toFixed(18),
                  txHash: `REF-${stat.id}-${Date.now()}`,
                  createdAt: new Date()
                }
              });

              return commission;
            });

            success++;

            if (referrerType === 'REGULAR') {
              breakdown.regular++;
              breakdown.regularAmount += parseFloat(result.toString());
            } else {
              breakdown.workers++;
              breakdown.workersAmount += parseFloat(result.toString());
            }
          } else {
            console.log(`   ⏭️ Commission ${commission.toFixed(8)} < threshold ${ReferralService.CONFIG.COMMISSION_PAYOUT_THRESHOLD}, skipped`);
          }

          processed++;

        } catch (error) {
          console.error(`   ❌ Error processing referrer ${stat.referrer.id}:`, error.message);
          processed++;
        }
      }

      console.log(`\n✅ [PROCESS COMMISSIONS] Completed:`);
      console.log(`   📊 Processed: ${processed}`);
      console.log(`   ✅ Paid: ${success}`);
      console.log(`   🟢 Regular: ${breakdown.regular} (${breakdown.regularAmount.toFixed(8)} USDT)`);
      console.log(`   🔴 Workers: ${breakdown.workers} (${breakdown.workersAmount.toFixed(8)} USDT)\n`);

      return {
        processed,
        success,
        totalPaid: (breakdown.regularAmount + breakdown.workersAmount).toFixed(8),
        breakdown
      };

    } catch (error) {
      console.error(`❌ [PROCESS COMMISSIONS] Error:`, error.message);
      logger.error('REFERRAL', 'Error processing all commissions', { error: error.message });
      throw error;
    }
  }

  /**
   * 💰 КОНФИГУРАЦИЯ
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
      minimumBonusBalance: ReferralService.CONFIG.MINIMUM_BONUS_BALANCE,
      houseEdge: ReferralService.CONFIG.HOUSE_EDGE,
      regularCommissionRate: ReferralService.CONFIG.REGULAR_COMMISSION_RATE,
      workerProfitShare: ReferralService.CONFIG.WORKER_PROFIT_SHARE
    };
  }
}

module.exports = new ReferralService();