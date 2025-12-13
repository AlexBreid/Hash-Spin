/**
 * ✅ ReferralService.js - ИСПРАВЛЕННЫЙ
 * 
 * КОМИССИИ:
 * 1. REGULAR: (House Edge × Turnover / 2) × Commission Rate
 * 2. WORKER: 5% от потерь казино (суммы которую проебали рефералы)
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
    
    // КОМИССИИ
    HOUSE_EDGE: 0.03,           // 3% HE для REGULAR комиссии
    REGULAR_COMMISSION_RATE: 0.30,  // 0.30% от (HE × Turnover / 2)
    WORKER_PROFIT_SHARE: 5.0    // 5% от потерь
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
        logger.warn('REFERRAL', 'Bet exceeds maximum', { userId: userIdNum, betAmount: betNum });
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
        }
      }
    } catch (error) {
      logger.warn('REFERRAL', 'Error processing bet', { error: error.message });
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
   * 👥 ПОЛУЧИТЬ СТАТИСТИКУ РЕФЕРЕРА
   * 🟢 REGULAR: (House Edge × Turnover / 2) × Commission Rate
   * 🔴 WORKER: 5% от потерь казино (суммы которую проебали рефералы)
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

      if (user.referrerType === 'REGULAR') {
        // 🟢 REGULAR: (HE × Turnover / 2) × Commission Rate
        console.log(`\n👤 [STATS] REGULAR реферер ${userIdNum}`);
        console.log(`   Формула: (HE × Turnover / 2) × CommRate`);

        let totalTurnover = 0;
        let totalCommissionPaid = 0;

        for (const refId of referralIds) {
          // Получаем ставки из CRASH игр
          const crashBets = await prisma.crashBet.aggregate({
            where: { userId: refId },
            _sum: { betAmount: true }
          });

          // Получаем ставки из обычных игр
          const otherBets = await prisma.bet.aggregate({
            where: { userId: refId },
            _sum: { betAmount: true }
          });

          const crashTurnover = parseFloat(crashBets._sum.betAmount?.toString() || '0');
          const otherTurnover = parseFloat(otherBets._sum.betAmount?.toString() || '0');
          const turnover = crashTurnover + otherTurnover;

          if (turnover <= 0) continue;

          totalTurnover += turnover;

          // Формула: (HE × Turnover / 2) × CommRate
          const houseEdge = ReferralService.CONFIG.HOUSE_EDGE;        // 0.03
          const commissionRate = ReferralService.CONFIG.REGULAR_COMMISSION_RATE;  // 0.30
          const commission = (houseEdge * turnover / 2) * (commissionRate / 100);
          
          totalCommissionPaid += commission;

          console.log(`   Реферал ${refId}: Turnover=${turnover.toFixed(2)}, Commission=${commission.toFixed(8)}`);
        }

        console.log(`   ✅ Total: Turnover=${totalTurnover.toFixed(2)}, Paid=${totalCommissionPaid.toFixed(8)}\n`);

        return {
          referralsCount: referralIds.length,
          totalTurnover: parseFloat(totalTurnover.toFixed(8)),
          totalCommissionPaid: parseFloat(totalCommissionPaid.toFixed(8)),
          potentialCommission: parseFloat(totalCommissionPaid.toFixed(8)),
          commissionRate: ReferralService.CONFIG.REGULAR_COMMISSION_RATE,
          referrerType: 'REGULAR'
        };

      } else if (user.referrerType === 'WORKER') {
        // 🔴 WORKER: 5% от потерь казино
        console.log(`\n👷 [STATS] WORKER реферер ${userIdNum}`);
        console.log(`   Формула: 5% от потерь рефералов`);

        let totalTurnover = 0;
        let totalLosses = 0;
        let totalCommissionPaid = 0;

        for (const refId of referralIds) {
          // CRASH ставки
          const crashStats = await prisma.crashBet.aggregate({
            where: { userId: refId },
            _sum: { betAmount: true, winnings: true }
          });

          const crashBetAmount = parseFloat(crashStats._sum.betAmount?.toString() || '0');
          const crashWinnings = parseFloat(crashStats._sum.winnings?.toString() || '0');

          // Обычные ставки
          const otherStats = await prisma.bet.aggregate({
            where: { userId: refId },
            _sum: { betAmount: true, payoutAmount: true }
          });

          const otherBetAmount = parseFloat(otherStats._sum.betAmount?.toString() || '0');
          const otherPayout = parseFloat(otherStats._sum.payoutAmount?.toString() || '0');

          const totalBet = crashBetAmount + otherBetAmount;
          const totalWon = crashWinnings + otherPayout;

          if (totalBet <= 0) continue;

          totalTurnover += totalBet;

          // Потери казино = выигрыши игрока минус ставки
          // Если игрок выиграл больше чем поставил - казино потеряло
          const losses = Math.max(totalWon - totalBet, 0);
          
          if (losses <= 0) continue;

          totalLosses += losses;

          // 5% от потерь
          const workerProfit = losses * (ReferralService.CONFIG.WORKER_PROFIT_SHARE / 100);
          totalCommissionPaid += workerProfit;

          console.log(`   Реферал ${refId}: Bet=${totalBet.toFixed(2)}, Won=${totalWon.toFixed(2)}, Losses=${losses.toFixed(2)}, Worker5%=${workerProfit.toFixed(8)}`);
        }

        console.log(`   ✅ Total: Turnover=${totalTurnover.toFixed(2)}, Losses=${totalLosses.toFixed(2)}, Paid=${totalCommissionPaid.toFixed(8)}\n`);

        return {
          referralsCount: referralIds.length,
          totalTurnover: parseFloat(totalTurnover.toFixed(8)),
          totalLosses: parseFloat(totalLosses.toFixed(8)),
          totalCommissionPaid: parseFloat(totalCommissionPaid.toFixed(8)),
          potentialCommission: parseFloat(totalCommissionPaid.toFixed(8)),
          commissionRate: ReferralService.CONFIG.WORKER_PROFIT_SHARE,
          referrerType: 'WORKER'
        };
      }

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
   * 🟢 REGULAR: (HE × Turnover / 2) × CommRate
   * 🔴 WORKER: 5% от потерь
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

      const breakdown = { workers: 0, workersAmount: 0, regular: 0, regularAmount: 0 };

      for (const referrer of referrers) {
        try {
          const referrals = await prisma.user.findMany({
            where: { referredById: referrer.id },
            select: { id: true }
          });

          let referrerCommission = 0;

          if (referrer.referrerType === 'REGULAR') {
            // 🟢 REGULAR: (HE × Turnover / 2) × CommRate
            for (const referral of referrals) {
              const crashBets = await prisma.crashBet.aggregate({
                where: { userId: referral.id },
                _sum: { betAmount: true }
              });

              const otherBets = await prisma.bet.aggregate({
                where: { userId: referral.id },
                _sum: { betAmount: true }
              });

              const crashTurnover = parseFloat(crashBets._sum.betAmount?.toString() || '0');
              const otherTurnover = parseFloat(otherBets._sum.betAmount?.toString() || '0');
              const turnover = crashTurnover + otherTurnover;

              if (turnover <= 0) continue;

              const houseEdge = ReferralService.CONFIG.HOUSE_EDGE;
              const commissionRate = ReferralService.CONFIG.REGULAR_COMMISSION_RATE;
              const commission = (houseEdge * turnover / 2) * (commissionRate / 100);
              
              referrerCommission += commission;
            }

            if (referrerCommission > 0) {
              breakdown.regular++;
              breakdown.regularAmount += referrerCommission;
            }

          } else if (referrer.referrerType === 'WORKER') {
            // 🔴 WORKER: 5% от потерь
            for (const referral of referrals) {
              const crashStats = await prisma.crashBet.aggregate({
                where: { userId: referral.id },
                _sum: { betAmount: true, winnings: true }
              });

              const otherStats = await prisma.bet.aggregate({
                where: { userId: referral.id },
                _sum: { betAmount: true, payoutAmount: true }
              });

              const crashBetAmount = parseFloat(crashStats._sum.betAmount?.toString() || '0');
              const crashWinnings = parseFloat(crashStats._sum.winnings?.toString() || '0');
              const otherBetAmount = parseFloat(otherStats._sum.betAmount?.toString() || '0');
              const otherPayout = parseFloat(otherStats._sum.payoutAmount?.toString() || '0');

              const totalBet = crashBetAmount + otherBetAmount;
              const totalWon = crashWinnings + otherPayout;
              
              if (totalBet <= 0) continue;

              const losses = Math.max(totalWon - totalBet, 0);
              if (losses <= 0) continue;

              const workerProfit = losses * (ReferralService.CONFIG.WORKER_PROFIT_SHARE / 100);
              referrerCommission += workerProfit;
            }

            if (referrerCommission > 0) {
              breakdown.workers++;
              breakdown.workersAmount += referrerCommission;
            }
          }

          if (referrerCommission <= 0) {
            processed++;
            continue;
          }

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
              amount: referrerCommission.toFixed(8)
            },
            update: {
              amount: { increment: referrerCommission }
            }
          });

          processed++;
          success++;
          totalPaid += referrerCommission;

          console.log(`   ✅ ${referrer.referrerType} ${referrer.id}: ${referrerCommission.toFixed(8)} USDT`);

        } catch (error) {
          console.error(`   ❌ Error processing referrer ${referrer.id}:`, error.message);
          processed++;
        }
      }

      console.log(`\n📊 [PROCESS COMMISSIONS] Completed:`);
      console.log(`   Total: ${processed}, Success: ${success}`);
      console.log(`   Paid: ${totalPaid.toFixed(8)} USDT`);
      console.log(`   REGULAR: ${breakdown.regular} (${breakdown.regularAmount.toFixed(8)} USDT)`);
      console.log(`   WORKER: ${breakdown.workers} (${breakdown.workersAmount.toFixed(8)} USDT)\n`);

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