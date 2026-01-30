/**
 * ✅ ReferralService.js - ИСПРАВЛЕННЫЙ ПОДСЧЁТ РЕФЕРАЛОВ
 * 
 * ИСПРАВЛЕНИЯ:
 * 1. getReferrerStats теперь считает рефералов по User.referredById (не по ReferralStats)
 * 2. Правильный расчёт комиссий для REGULAR и WORKER
 * 
 * КОМИССИИ:
 * 1. REGULAR: (House Edge × newTurnover / 2) × Commission Rate
 *    Пример: (0.02 × 1000 / 2) × 0.30 = 3 USDT
 * 2. WORKER: 5% от newLosses
 *    Пример: 100 × 0.05 = 5 USDT
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const Decimal = require('decimal.js');
const { getCurrencyRateAsync } = require('./currencySyncService');

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
    HOUSE_EDGE: 0.02,               // 2% HE (преимущество казино) от оборота
    REGULAR_COMMISSION_RATE: 30,    // 30% от (HE × Turnover / 2)
    WORKER_PROFIT_SHARE: 5.0,       // 5% от потерь рефералов
    
    // ПОРОГ ВЫПЛАТЫ
    COMMISSION_PAYOUT_THRESHOLD: 1  // Выплачивать только если > 1 USDT
  };

  /**
   * 🎁 ВЫДАТЬ ДЕПОЗИТНЫЙ БОНУС
   * Поддерживает все криптовалюты с пересчётом в USD эквивалент
   */
  async grantDepositBonus(userId, depositAmount, tokenId, referrerId) {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return null;
      }

      const depositNum = parseFloat(depositAmount);
      if (isNaN(depositNum) || depositNum <= 0) {
        return null;
      }

      // Получаем информацию о токене
      const token = await prisma.cryptoToken.findUnique({
        where: { id: tokenId }
      });

      if (!token) {
        logger.error('REFERRAL', 'Token not found', { tokenId });
        return null;
      }

      // Получаем курс валюты к USD
      const rate = await getCurrencyRateAsync(token.symbol);
      
      // Конвертируем сумму депозита в USD для проверки лимитов
      const depositInUSD = depositNum * rate;
      
      logger.info('REFERRAL', 'Checking bonus eligibility', { 
        userId: userIdNum, 
        depositNum, 
        depositInUSD, 
        token: token.symbol, 
        rate 
      });

      // Проверяем минимальный депозит в USD эквиваленте
      if (depositInUSD < ReferralService.CONFIG.MIN_DEPOSIT_AMOUNT) {
        logger.info('REFERRAL', 'Deposit below minimum', { 
          depositInUSD, 
          minRequired: ReferralService.CONFIG.MIN_DEPOSIT_AMOUNT 
        });
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
        return null;
      }

      // Рассчитываем бонус в единицах криптовалюты
      let bonusAmount = depositNum * (ReferralService.CONFIG.DEPOSIT_BONUS_PERCENT / 100);
      
      // Максимальный бонус в USD эквиваленте -> конвертируем в единицы криптовалюты
      const maxBonusInCrypto = ReferralService.CONFIG.MAX_BONUS_AMOUNT / rate;

      if (bonusAmount > maxBonusInCrypto) {
        bonusAmount = maxBonusInCrypto;
      }

      const totalAmount = depositNum + bonusAmount;
      const requiredWager = totalAmount * ReferralService.CONFIG.WAGERING_MULTIPLIER;
      const maxPayoutAmount = totalAmount * ReferralService.CONFIG.MAX_PAYOUT_MULTIPLIER;
      
      // Максимальная ставка в единицах криптовалюты
      const maxBetInCrypto = ReferralService.CONFIG.MAX_BET_AMOUNT / rate;
      
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
          maxBetAmount: maxBetInCrypto,
          maxPayoutAmount: maxPayoutAmount,
          // Добавляем USD эквиваленты для информации
          bonusAmountUSD: bonusAmount * rate,
          totalAmountUSD: totalAmount * rate,
          currency: token.symbol
        };
      });

      logger.info('REFERRAL', 'Deposit bonus granted', { 
        userId: userIdNum, 
        bonusAmount: bonusAmount, 
        currency: token.symbol,
        bonusAmountUSD: bonusAmount * rate
      });
      return result;
    } catch (error) {
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
              newTurnoverSinceLastPayout: { increment: betNum }
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
              newLossesSinceLastPayout: 0,
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
   */
  async recordGameResult(referrerId, refereeId, tokenId, losses, winnings) {
    try {
      const lossesNum = parseFloat(losses);
      const winningsNum = parseFloat(winnings);

      if (isNaN(lossesNum) || isNaN(winningsNum)) return;

      await prisma.referralStats.updateMany({
        where: {
          referrerId,
          refereeId,
          tokenId
        },
        data: {
          totalLosses: { increment: lossesNum },
          totalWinnings: { increment: winningsNum },
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
   * ⭐ ИСПРАВЛЕНО: считаем рефералов по User.referredById, а не по ReferralStats
   * 
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

      // ⭐ ИСПРАВЛЕНИЕ: Считаем рефералов по User.referredById
      const referralsCount = await prisma.user.count({
        where: { referredById: userIdNum }
      });

      // Получаем статистику из ReferralStats
      const stats = await prisma.referralStats.findMany({
        where: { referrerId: userIdNum }
      });

      let totalTurnover = new Decimal(0);
      let totalCommissionPaid = new Decimal(0);
      let totalLosses = new Decimal(0);
      let totalWinnings = new Decimal(0);
      let pendingCommission = new Decimal(0);

      for (const stat of stats) {
        totalTurnover = totalTurnover.plus(stat.totalTurnover || 0);
        totalCommissionPaid = totalCommissionPaid.plus(stat.totalCommissionPaid || 0);
        totalLosses = totalLosses.plus(stat.totalLosses || 0);
        totalWinnings = totalWinnings.plus(stat.totalWinnings || 0);

        // Считаем ожидаемую комиссию на основе типа реферера
        if (user.referrerType === 'REGULAR') {
          // ✅ REGULAR: (HE × newTurnover / 2) × CommissionRate
          const turnover = new Decimal(stat.newTurnoverSinceLastPayout || 0);
          if (turnover.greaterThan(0)) {
            const houseEdge = new Decimal(ReferralService.CONFIG.HOUSE_EDGE);
            const commissionRate = new Decimal(ReferralService.CONFIG.REGULAR_COMMISSION_RATE);
            // Формула: (0.02 × turnover / 2) × 0.30
            const commission = houseEdge
              .times(turnover)
              .dividedBy(2)
              .times(commissionRate)
              .dividedBy(100);
            pendingCommission = pendingCommission.plus(commission);
          }
        } else if (user.referrerType === 'WORKER') {
          // ✅ WORKER: 5% от newLosses
          const losses = new Decimal(stat.newLossesSinceLastPayout || 0);
          if (losses.greaterThan(0)) {
            const workerShare = new Decimal(ReferralService.CONFIG.WORKER_PROFIT_SHARE);
            const commission = losses.times(workerShare).dividedBy(100);
            pendingCommission = pendingCommission.plus(commission);
          }
        }
      }

      const result = {
        // ⭐ ИСПРАВЛЕНО: используем реальное количество рефералов
        referralsCount: referralsCount,
        totalTurnover: parseFloat(totalTurnover.toFixed(8)),
        totalCommissionPaid: parseFloat(totalCommissionPaid.toFixed(8)),
        totalLosses: parseFloat(totalLosses.toFixed(8)),
        totalWinnings: parseFloat(totalWinnings.toFixed(8)),
        potentialCommission: parseFloat(pendingCommission.toFixed(8)),
        commissionRate: user.referrerType === 'REGULAR' 
          ? ReferralService.CONFIG.REGULAR_COMMISSION_RATE
          : ReferralService.CONFIG.WORKER_PROFIT_SHARE,
        referrerType: user.referrerType
      };

      return result;

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
   * 
   * REGULAR: (House Edge × newTurnover / 2) × Commission Rate
   * Пример: Оборот 1000 USDT
   *   - House Edge = 2% = 0.02
   *   - Преимущество казино = 1000 × 0.02 = 20 USDT
   *   - Делим на 2 (fair share) = 10 USDT
   *   - Комиссия 30% = 10 × 0.30 = 3 USDT
   * 
   * WORKER: 5% от потерь рефералов
   * Пример: Потери 100 USDT
   *   - Комиссия = 100 × 0.05 = 5 USDT
   */
  async processAllPendingCommissions(tokenId = 2) {
    try {
      const allStats = await prisma.referralStats.findMany({
        where: { tokenId },
        include: {
          referrer: { select: { id: true, referrerType: true, username: true } },
          referee: { select: { id: true, username: true } }
        }
      });

      let processed = 0;
      let success = 0;
      const breakdown = { workers: 0, workersAmount: 0, regular: 0, regularAmount: 0 };

      for (const stat of allStats) {
        try {
          const referrerType = stat.referrer.referrerType;
          let commission = new Decimal(0);
          let calculationDetails = '';

          if (referrerType === 'REGULAR') {
            // 🟢 REGULAR: (HE × newTurnover / 2) × CommRate
            const turnover = new Decimal(stat.newTurnoverSinceLastPayout || 0);
            
            if (turnover.greaterThan(0)) {
              const houseEdge = new Decimal(ReferralService.CONFIG.HOUSE_EDGE);
              const commissionRate = new Decimal(ReferralService.CONFIG.REGULAR_COMMISSION_RATE);
              
              // Формула: (0.02 × turnover / 2) × 0.30
              const houseProfit = houseEdge.times(turnover);  // 2% от оборота
              const fairShare = houseProfit.dividedBy(2);     // делим на 2
              commission = fairShare.times(commissionRate).dividedBy(100);

              calculationDetails = `Turnover=${turnover.toFixed(2)}, HouseProfit=${houseProfit.toFixed(4)}, FairShare=${fairShare.toFixed(4)}, Commission=${commission.toFixed(8)}`;
              }

          } else if (referrerType === 'WORKER') {
            // 🔴 WORKER: 5% от newLosses
            const losses = new Decimal(stat.newLossesSinceLastPayout || 0);
            
            if (losses.greaterThan(0)) {
              const workerShare = new Decimal(ReferralService.CONFIG.WORKER_PROFIT_SHARE);
              commission = losses.times(workerShare).dividedBy(100);

              calculationDetails = `Losses=${losses.toFixed(2)}, Commission=${commission.toFixed(8)} (${workerShare}%)`;
              }
          }

          // Только если комиссия выше порога
          if (commission.greaterThanOrEqualTo(ReferralService.CONFIG.COMMISSION_PAYOUT_THRESHOLD)) {
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

              // ⭐ Обнуляем счётчики после выплаты
              await tx.referralStats.update({
                where: { id: stat.id },
                data: {
                  newTurnoverSinceLastPayout: 0,
                  newLossesSinceLastPayout: 0,
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
          } else if (commission.greaterThan(0)) {
            }

          processed++;

        } catch (error) {
          processed++;
        }
      }

      return {
        processed,
        success,
        totalPaid: (breakdown.regularAmount + breakdown.workersAmount).toFixed(8),
        breakdown
      };

    } catch (error) {
      logger.error('REFERRAL', 'Error processing all commissions', { error: error.message });
      throw error;
    }
  }

  /**
   * 💰 КОНФИГУРАЦИЯ (статический метод)
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

  /**
   * 💰 КОНФИГУРАЦИЯ (экземпляр метод для обратной совместимости)
   */
  getLimits() {
    return ReferralService.getLimits();
  }
}

// Экспортируем и класс, и экземпляр
module.exports = new ReferralService();
module.exports.ReferralService = ReferralService;

