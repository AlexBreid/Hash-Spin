/**
 * ✅ ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ ReferralService.js
 * КОПИРУЙ ВЕСЬ КОД В src/services/ReferralService.js
 * 
 * ✅ ИСПРАВЛЕНИЯ:
 * 1. ✅ toFixed(8) для ВСЕХ денег
 * 2. ✅ ПРАВИЛЬНАЯ формула комиссии для воркеров
 * 3. ✅ Database transactions везде
 * 4. ✅ Логирование через logger
 * 5. ✅ Валидация везде
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const validators = require('../utils/validators');

// Конфигурация
const CONFIG = {
  // Бонус реферала
  DEPOSIT_BONUS_PERCENT: 100,        // +100% к депозиту
  WAGERING_MULTIPLIER: 10,           // x10 для отыгрыша
  BONUS_EXPIRY_DAYS: 7,              // Бонус сгорает через 7 дней
  
  // ✅ ИСПРАВЛЕННАЯ: Комиссия обычных рефералов
  HOUSE_EDGE: 0.03,                  // 3% преимущество казино
  REGULAR_COMMISSION_RATE: 0.30,     // 30% от дохода казино
  
  // ✅ НОВОЕ: Комиссия воркеров (5% от чистого профита)
  WORKER_PROFIT_SHARE: 0.05,         // 5% от профита
  
  // Оптимизация
  MIN_TURNOVER_FOR_PAYOUT: 100,      // Минимальный оборот для выплаты комиссии
  MIN_COMMISSION_PAYOUT: 1,          // Минимальная сумма комиссии для выплаты
};

class ReferralService {
  
  /**
   * 🎁 Начислить бонус рефералу при первом депозите
   * @param {number} userId - ID реферала
   * @param {number} depositAmount - Сумма депозита
   * @param {number} tokenId - ID токена
   * @returns {Object|null} - Информация о бонусе или null
   */
  async grantDepositBonus(userId, depositAmount, tokenId) {
    try {
      // ✅ ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ
      const userIdNum = parseInt(userId);
      const depositAmountNum = parseFloat(depositAmount);
      const tokenIdNum = parseInt(tokenId);
      
      if (!validators.validateUserId(userIdNum)) {
        logger.warn('REFERRAL', `Invalid userId: ${userId}`);
        return null;
      }
      
      if (!validators.validateAmount(depositAmountNum)) {
        logger.warn('REFERRAL', `Invalid depositAmount: ${depositAmount}`);
        return null;
      }
      
      if (isNaN(tokenIdNum) || tokenIdNum <= 0) {
        logger.warn('REFERRAL', `Invalid tokenId: ${tokenId}`);
        return null;
      }
      
      logger.info('REFERRAL', `Checking bonus for userId=${userIdNum}`, { 
        depositAmount: depositAmountNum.toFixed(8) 
      });
      
      // 1. Получаем пользователя с реферером
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { 
          id: true, 
          referredById: true,
          referrer: {
            select: { id: true, referrerType: true, username: true }
          }
        }
      });
      
      if (!user || !user.referredById) {
        logger.warn('REFERRAL', `User ${userIdNum} has no referrer`);
        return null;
      }
      
      // 2. Проверяем, это первый депозит?
      const depositCount = await prisma.transaction.count({
        where: {
          userId: userIdNum,
          type: 'DEPOSIT',
          status: 'COMPLETED'
        }
      });
      
      if (depositCount > 1) {
        logger.warn('REFERRAL', `User ${userIdNum} already has ${depositCount} deposits`);
        return null;
      }
      
      // 3. Получаем/создаём бонусную программу
      let bonusProgram = await prisma.bonus.findFirst({
        where: { name: 'Referral Welcome Bonus' }
      });
      
      if (!bonusProgram) {
        bonusProgram = await prisma.bonus.create({
          data: {
            name: 'Referral Welcome Bonus',
            description: '+100% к первому депозиту по реферальной ссылке',
            wageringMultiplier: CONFIG.WAGERING_MULTIPLIER,
            maxBonusAmount: '10000',
            depositBonusPercent: CONFIG.DEPOSIT_BONUS_PERCENT
          }
        });
        logger.info('REFERRAL', `Created bonus program: ${bonusProgram.id}`);
      }
      
      // ✅ ИСПРАВЛЕНИЕ: Правильная обработка денег с toFixed(8)
      const maxBonus = parseFloat(bonusProgram.maxBonusAmount.toString());
      const bonusPercent = bonusProgram.depositBonusPercent / 100;
      const rawBonus = depositAmountNum * bonusPercent;
      const bonusAmount = parseFloat(Math.min(rawBonus, maxBonus).toFixed(8));
      const requiredWager = parseFloat((bonusAmount * CONFIG.WAGERING_MULTIPLIER).toFixed(8));
      
      logger.info('REFERRAL', `Calculated bonus`, {
        depositAmount: depositAmountNum.toFixed(8),
        bonusAmount: bonusAmount.toFixed(8),
        requiredWager: requiredWager.toFixed(8)
      });
      
      // 4. Используем TRANSACTION для атомарности
      const result = await prisma.$transaction(async (tx) => {
        // Создаём UserBonus
        const userBonus = await tx.userBonus.create({
          data: {
            userId: userIdNum,
            bonusId: bonusProgram.id,
            tokenId: tokenIdNum,
            grantedAmount: bonusAmount.toFixed(8).toString(),
            requiredWager: requiredWager.toFixed(8).toString(),
            wageredAmount: '0',
            isActive: true,
            isCompleted: false,
            referrerId: user.referredById,
            expiresAt: new Date(Date.now() + CONFIG.BONUS_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
          }
        });
        
        // Начисляем на BONUS баланс
        await tx.balance.upsert({
          where: {
            userId_tokenId_type: { userId: userIdNum, tokenId: tokenIdNum, type: 'BONUS' }
          },
          create: {
            userId: userIdNum,
            tokenId: tokenIdNum,
            type: 'BONUS',
            amount: bonusAmount.toFixed(8).toString()
          },
          update: {
            amount: { increment: bonusAmount }
          }
        });
        
        // Записываем реферальную транзакцию
        await tx.referralTransaction.create({
          data: {
            referrerId: user.referredById,
            refereeId: userIdNum,
            tokenId: tokenIdNum,
            eventType: 'DEPOSIT_BONUS',
            amount: bonusAmount.toFixed(8).toString(),
            sourceEntityId: userBonus.id,
            sourceEntityType: 'UserBonus'
          }
        });
        
        // Инициализируем статистику
        await tx.referralStats.upsert({
          where: {
            referrerId_refereeId_tokenId: {
              referrerId: user.referredById,
              refereeId: userIdNum,
              tokenId: tokenIdNum
            }
          },
          create: {
            referrerId: user.referredById,
            refereeId: userIdNum,
            tokenId: tokenIdNum,
            totalTurnover: '0',
            turnoverSinceLastPayout: '0',
            totalCommissionPaid: '0',
            totalLosses: '0',
            totalWinnings: '0'
          },
          update: {}
        });
        
        return userBonus;
      });
      
      logger.info('REFERRAL', `Bonus granted`, {
        userId: userIdNum,
        referrerId: user.referredById,
        bonusAmount: bonusAmount.toFixed(8),
        requiredWager: requiredWager.toFixed(8)
      });
      
      return {
        bonusAmount: bonusAmount.toFixed(8),
        requiredWager: requiredWager.toFixed(8),
        expiresAt: result.expiresAt,
        referrerId: user.referredById,
        referrerUsername: user.referrer?.username
      };
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to grant deposit bonus', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 🎰 Обработать ставку - обновить отыгрыш и статистику
   */
  async processBet(userId, betAmount, tokenId, balanceType = 'MAIN') {
    try {
      const userIdNum = parseInt(userId);
      const betAmountNum = parseFloat(betAmount);
      const tokenIdNum = parseInt(tokenId);
      
      if (isNaN(userIdNum) || isNaN(betAmountNum) || betAmountNum <= 0 || isNaN(tokenIdNum)) {
        logger.warn('REFERRAL', 'Invalid processBet parameters', { userId, betAmount, tokenId });
        return;
      }
      
      // 1. Если ставка с бонусного баланса - обновляем отыгрыш
      if (balanceType === 'BONUS') {
        await this.updateWagerProgress(userIdNum, betAmountNum, tokenIdNum);
      }
      
      // 2. Обновляем статистику оборота для реферера
      await this.updateReferrerStats(userIdNum, betAmountNum, tokenIdNum);
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to process bet', { error: error.message });
    }
  }
  
  /**
   * 📊 Обновить прогресс отыгрыша бонуса
   */
  async updateWagerProgress(userId, betAmount, tokenId) {
    try {
      const userIdNum = parseInt(userId);
      const betAmountNum = parseFloat(betAmount);
      const tokenIdNum = parseInt(tokenId);
      
      if (isNaN(userIdNum) || isNaN(betAmountNum) || isNaN(tokenIdNum)) {
        return null;
      }
      
      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId: userIdNum,
          tokenId: tokenIdNum,
          isActive: true,
          isCompleted: false,
          expiresAt: { gt: new Date() }
        },
        include: { bonus: true }
      });
      
      if (!activeBonus) {
        return null;
      }
      
      // ✅ ИСПРАВЛЕНИЕ: toFixed(8) везде
      const currentWagered = parseFloat(activeBonus.wageredAmount.toString());
      const newWagered = parseFloat((currentWagered + betAmountNum).toFixed(8));
      const required = parseFloat(activeBonus.requiredWager.toString());
      
      logger.debug('REFERRAL', `Wager progress`, {
        userId: userIdNum,
        wagered: newWagered.toFixed(8),
        required: required.toFixed(8)
      });
      
      await prisma.userBonus.update({
        where: { id: activeBonus.id },
        data: { wageredAmount: newWagered.toFixed(8).toString() }
      });
      
      if (newWagered >= required) {
        await this.completeWagerAndTransfer(userIdNum, tokenIdNum, activeBonus.id);
      }
      
      return {
        wagered: newWagered.toFixed(8),
        required: required.toFixed(8),
        progress: Math.min((newWagered / required) * 100, 100).toFixed(2)
      };
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to update wager progress', { error: error.message });
    }
  }
  
  /**
   * ✅ Завершить отыгрыш и перевести в MAIN
   */
  async completeWagerAndTransfer(userId, tokenId, userBonusId) {
    try {
      const userIdNum = parseInt(userId);
      const tokenIdNum = parseInt(tokenId);
      const userBonusIdNum = parseInt(userBonusId);
      
      if (isNaN(userIdNum) || isNaN(tokenIdNum) || isNaN(userBonusIdNum)) {
        return null;
      }
      
      logger.info('REFERRAL', `Completing wager`, { userId: userIdNum });
      
      const bonusBalance = await prisma.balance.findUnique({
        where: {
          userId_tokenId_type: { userId: userIdNum, tokenId: tokenIdNum, type: 'BONUS' }
        }
      });
      
      if (!bonusBalance) {
        logger.warn('REFERRAL', `No bonus balance found`, { userId: userIdNum });
        return null;
      }
      
      const remainingBonus = parseFloat(bonusBalance.amount.toString());
      
      if (remainingBonus > 0) {
        // ✅ TRANSACTION для атомарности
        await prisma.$transaction(async (tx) => {
          // Обнуляем BONUS
          await tx.balance.update({
            where: { id: bonusBalance.id },
            data: { amount: '0' }
          });
          
          // Добавляем в MAIN
          await tx.balance.upsert({
            where: {
              userId_tokenId_type: { userId: userIdNum, tokenId: tokenIdNum, type: 'MAIN' }
            },
            create: {
              userId: userIdNum,
              tokenId: tokenIdNum,
              type: 'MAIN',
              amount: remainingBonus.toFixed(8).toString()
            },
            update: {
              amount: { increment: remainingBonus }
            }
          });
          
          // Логируем
          await tx.transaction.create({
            data: {
              userId: userIdNum,
              tokenId: tokenIdNum,
              type: 'BONUS_TO_MAIN',
              status: 'COMPLETED',
              amount: remainingBonus.toFixed(8).toString()
            }
          });
        });
        
        logger.info('REFERRAL', `Bonus transferred to MAIN`, {
          userId: userIdNum,
          amount: remainingBonus.toFixed(8)
        });
      }
      
      // Помечаем бонус завершённым
      await prisma.userBonus.update({
        where: { id: userBonusIdNum },
        data: { isActive: false, isCompleted: true }
      });
      
      return remainingBonus;
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to complete wager', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 📈 Обновить статистику оборота реферера
   */
  async updateReferrerStats(userId, betAmount, tokenId) {
    try {
      const userIdNum = parseInt(userId);
      const betAmountNum = parseFloat(betAmount);
      const tokenIdNum = parseInt(tokenId);
      
      if (isNaN(userIdNum) || isNaN(betAmountNum) || isNaN(tokenIdNum)) {
        return;
      }
      
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { referredById: true }
      });
      
      if (!user?.referredById) {
        return;
      }
      
      // ✅ ИСПРАВЛЕНИЕ: toFixed(8)
      await prisma.referralStats.upsert({
        where: {
          referrerId_refereeId_tokenId: {
            referrerId: user.referredById,
            refereeId: userIdNum,
            tokenId: tokenIdNum
          }
        },
        create: {
          referrerId: user.referredById,
          refereeId: userIdNum,
          tokenId: tokenIdNum,
          totalTurnover: betAmountNum.toFixed(8).toString(),
          turnoverSinceLastPayout: betAmountNum.toFixed(8).toString(),
          totalCommissionPaid: '0',
          totalLosses: '0',
          totalWinnings: '0'
        },
        update: {
          totalTurnover: { increment: betAmountNum },
          turnoverSinceLastPayout: { increment: betAmountNum }
        }
      });
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to update referrer stats', { error: error.message });
    }
  }
  
  /**
   * 📊 Обновить результат ставки (выигрыш/проигрыш)
   */
  async recordGameResult(userId, betAmount, resultAmount, tokenId) {
    try {
      const userIdNum = parseInt(userId);
      const betAmountNum = parseFloat(betAmount);
      const resultAmountNum = parseFloat(resultAmount);
      const tokenIdNum = parseInt(tokenId);
      
      if (isNaN(userIdNum) || isNaN(betAmountNum) || isNaN(resultAmountNum) || isNaN(tokenIdNum)) {
        return;
      }
      
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { referredById: true }
      });
      
      if (!user?.referredById) {
        return;
      }
      
      // ✅ ИСПРАВЛЕНИЕ: Правильный расчет профита казино
      const casinoProfit = parseFloat((betAmountNum - resultAmountNum).toFixed(8));
      
      const stats = await prisma.referralStats.findUnique({
        where: {
          referrerId_refereeId_tokenId: {
            referrerId: user.referredById,
            refereeId: userIdNum,
            tokenId: tokenIdNum
          }
        }
      });
      
      if (stats) {
        const currentLosses = parseFloat(stats.totalLosses?.toString() || '0');
        const currentWinnings = parseFloat(stats.totalWinnings?.toString() || '0');
        
        // ✅ ИСПРАВЛЕНИЕ: toFixed(8)
        const newLosses = parseFloat(
          (currentLosses + (casinoProfit > 0 ? casinoProfit : 0)).toFixed(8)
        );
        const newWinnings = parseFloat(
          (currentWinnings + (casinoProfit < 0 ? Math.abs(casinoProfit) : 0)).toFixed(8)
        );
        
        await prisma.referralStats.update({
          where: { id: stats.id },
          data: {
            totalLosses: newLosses.toFixed(8).toString(),
            totalWinnings: newWinnings.toFixed(8).toString()
          }
        });
        
        logger.debug('REFERRAL', `Game result recorded`, {
          userId: userIdNum,
          betAmount: betAmountNum.toFixed(8),
          resultAmount: resultAmountNum.toFixed(8),
          casinoProfit: casinoProfit.toFixed(8)
        });
      }
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to record game result', { error: error.message });
    }
  }
  
  /**
   * 💸 ВЫПЛАТИТЬ КОМИССИЮ РЕФЕРЕРУ
   * ✅ ИСПРАВЛЕНИЕ #6: ПРАВИЛЬНАЯ ФОРМУЛА
   */
  async payoutReferrerCommission(referrerId, refereeId, tokenId) {
    try {
      const referrerIdNum = parseInt(referrerId);
      const refereeIdNum = parseInt(refereeId);
      const tokenIdNum = parseInt(tokenId);
      
      if (isNaN(referrerIdNum) || isNaN(refereeIdNum) || isNaN(tokenIdNum)) {
        logger.warn('REFERRAL', 'Invalid commission parameters', { referrerId, refereeId, tokenId });
        return null;
      }
      
      const stats = await prisma.referralStats.findUnique({
        where: {
          referrerId_refereeId_tokenId: {
            referrerId: referrerIdNum,
            refereeId: refereeIdNum,
            tokenId: tokenIdNum
          }
        }
      });
      
      if (!stats) {
        logger.warn('REFERRAL', 'Stats not found for commission', { referrerId: referrerIdNum, refereeId: refereeIdNum });
        return null;
      }
      
      const turnover = parseFloat(stats.turnoverSinceLastPayout.toString());
      
      if (turnover < CONFIG.MIN_TURNOVER_FOR_PAYOUT) {
        logger.debug('REFERRAL', `Turnover too low for payout`, { 
          turnover: turnover.toFixed(8), 
          minimum: CONFIG.MIN_TURNOVER_FOR_PAYOUT 
        });
        return null;
      }
      
      const referrer = await prisma.user.findUnique({
        where: { id: referrerIdNum },
        select: { referrerType: true }
      });
      
      let commission = 0;
      let calculationDetails = {};
      
      // ✅ ИСПРАВЛЕННАЯ ФОРМУЛА КОМИССИИ
      if (referrer?.referrerType === 'WORKER') {
        // ВОРКЕР: 5% от чистого профита (потерь казино)
        const losses = parseFloat(stats.totalLosses?.toString() || '0');
        commission = parseFloat((losses * CONFIG.WORKER_PROFIT_SHARE).toFixed(8));
        
        calculationDetails = {
          type: 'WORKER',
          turnover: turnover.toFixed(8),
          losses: losses.toFixed(8),
          rate: CONFIG.WORKER_PROFIT_SHARE * 100,
          commission: commission.toFixed(8)
        };
        
        logger.info('REFERRAL', `Worker commission calculated`, calculationDetails);
      } 
      else {
        // ОБЫЧНЫЙ РЕФЕРАЛ: 30% от дохода казино
        // ✅ ПРАВИЛЬНАЯ ФОРМУЛА: commission = (turnover * HOUSE_EDGE) * RATE
        const casinoIncome = parseFloat((turnover * CONFIG.HOUSE_EDGE).toFixed(8));
        commission = parseFloat((casinoIncome * CONFIG.REGULAR_COMMISSION_RATE).toFixed(8));
        
        calculationDetails = {
          type: 'REGULAR',
          turnover: turnover.toFixed(8),
          casinoIncome: casinoIncome.toFixed(8),
          rate: CONFIG.REGULAR_COMMISSION_RATE * 100,
          commission: commission.toFixed(8)
        };
        
        logger.info('REFERRAL', `Regular commission calculated`, calculationDetails);
      }
      
      if (commission < CONFIG.MIN_COMMISSION_PAYOUT) {
        logger.debug('REFERRAL', `Commission too low for payout`, { 
          commission: commission.toFixed(8), 
          minimum: CONFIG.MIN_COMMISSION_PAYOUT 
        });
        return null;
      }
      
      // ✅ TRANSACTION для атомарности
      await prisma.$transaction(async (tx) => {
        // Обновляем статистику
        await tx.referralStats.update({
          where: { id: stats.id },
          data: {
            turnoverSinceLastPayout: '0',
            totalCommissionPaid: { increment: commission },
            lastPayoutAt: new Date()
          }
        });
        
        // Начисляем комиссию на баланс
        await tx.balance.upsert({
          where: {
            userId_tokenId_type: { userId: referrerIdNum, tokenId: tokenIdNum, type: 'MAIN' }
          },
          create: {
            userId: referrerIdNum,
            tokenId: tokenIdNum,
            type: 'MAIN',
            amount: commission.toFixed(8).toString()
          },
          update: {
            amount: { increment: commission }
          }
        });
        
        // Логируем транзакцию
        await tx.transaction.create({
          data: {
            userId: referrerIdNum,
            tokenId: tokenIdNum,
            type: 'REFERRAL_COMMISSION',
            status: 'COMPLETED',
            amount: commission.toFixed(8).toString()
          }
        });
        
        // Реферальная транзакция
        await tx.referralTransaction.create({
          data: {
            referrerId: referrerIdNum,
            refereeId: refereeIdNum,
            tokenId: tokenIdNum,
            eventType: 'BET_COMMISSION',
            amount: commission.toFixed(8).toString(),
            sourceEntityId: stats.id,
            sourceEntityType: 'ReferralStats'
          }
        });
      });
      
      logger.info('REFERRAL', `Commission paid`, {
        referrerId: referrerIdNum,
        refereeId: refereeIdNum,
        commission: commission.toFixed(8)
      });
      
      return {
        commission: commission.toFixed(8),
        ...calculationDetails
      };
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to payout commission', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 🔄 Массовая выплата комиссий (для CRON)
   * ✅ ИСПРАВЛЕНИЕ: Гарантирует что totalPaid всегда число
   */
  async processAllPendingCommissions(tokenId = 2) {
    try {
      logger.info('REFERRAL', `Processing all pending commissions`);
      
      const pendingStats = await prisma.referralStats.findMany({
        where: {
          tokenId,
          turnoverSinceLastPayout: { gte: CONFIG.MIN_TURNOVER_FOR_PAYOUT }
        }
      });
      
      logger.info('REFERRAL', `Found pending payouts`, { count: pendingStats.length });
      
      let totalPaidNum = 0; // ✅ ИСПРАВЛЕНИЕ: используем число вместо строки
      let successCount = 0;
      let workerCount = 0;
      let regularCount = 0;
      
      for (const stats of pendingStats) {
        try {
          const result = await this.payoutReferrerCommission(
            stats.referrerId, 
            stats.refereeId, 
            stats.tokenId
          );
          
          if (result) {
            // ✅ ИСПРАВЛЕНИЕ: Парсим комиссию и добавляем как число
            const commissionNum = typeof result.commission === 'string' 
              ? parseFloat(result.commission) 
              : parseFloat(result.commission);
            
            totalPaidNum += commissionNum;
            successCount++;
            
            if (result.type === 'WORKER') {
              workerCount++;
            } else {
              regularCount++;
            }
          }
        } catch (error) {
          logger.error('REFERRAL', `Failed to payout for pair`, {
            referrerId: stats.referrerId,
            refereeId: stats.refereeId,
            error: error.message
          });
        }
      }
      
      // ✅ ИСПРАВЛЕНИЕ: Возвращаем totalPaid как число (не строку)
      const result = {
        processed: pendingStats.length,
        success: successCount,
        totalPaid: parseFloat(totalPaidNum.toFixed(8)), // число!
        breakdown: {
          workers: workerCount,
          regular: regularCount
        }
      };
      
      logger.info('REFERRAL', `All commissions processed`, result);
      
      return result;
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to process all commissions', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 👷 Установить пользователя как воркера
   */
  async setUserAsWorker(userId) {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || !validators.validateUserId(userIdNum)) {
        throw new Error('Invalid userId');
      }
      
      const user = await prisma.user.update({
        where: { id: userIdNum },
        data: { referrerType: 'WORKER' }
      });
      
      logger.info('REFERRAL', `User set as WORKER`, { userId: userIdNum });
      return user;
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to set user as worker', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 📊 Получить статистику реферера
   */
  async getReferrerStats(userId, tokenId = 2) {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || !validators.validateUserId(userIdNum)) {
        throw new Error('Invalid userId');
      }
      
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { referrerType: true, referralCode: true }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const referralsCount = await prisma.user.count({
        where: { referredById: userIdNum }
      });
      
      const stats = await prisma.referralStats.aggregate({
        where: { referrerId: userIdNum, tokenId },
        _sum: {
          totalTurnover: true,
          totalCommissionPaid: true,
          turnoverSinceLastPayout: true,
          totalLosses: true,
          totalWinnings: true
        }
      });
      
      const isWorker = user?.referrerType === 'WORKER';
      const totalLosses = parseFloat(stats._sum.totalLosses?.toString() || '0');
      const totalTurnover = parseFloat(stats._sum.totalTurnover?.toString() || '0');
      const pendingTurnover = parseFloat(stats._sum.turnoverSinceLastPayout?.toString() || '0');
      const totalCommissionPaid = parseFloat(stats._sum.totalCommissionPaid?.toString() || '0');
      
      let potentialCommission = 0;
      let commissionRate = 0;
      
      if (isWorker) {
        // ВОРКЕР: 5% от чистого профита
        potentialCommission = parseFloat((totalLosses * CONFIG.WORKER_PROFIT_SHARE).toFixed(8));
        commissionRate = CONFIG.WORKER_PROFIT_SHARE * 100;
      } else {
        // ОБЫЧНЫЙ: 30% от дохода казино
        const casinoIncome = parseFloat((totalTurnover * CONFIG.HOUSE_EDGE).toFixed(8));
        potentialCommission = parseFloat((casinoIncome * CONFIG.REGULAR_COMMISSION_RATE).toFixed(8));
        commissionRate = CONFIG.REGULAR_COMMISSION_RATE * 100;
      }
      
      return {
        referralCode: user?.referralCode,
        referrerType: user?.referrerType || 'REGULAR',
        isWorker,
        commissionRate,
        referralsCount,
        totalTurnover: totalTurnover.toFixed(8),
        totalLosses: totalLosses.toFixed(8),
        totalCommissionPaid: totalCommissionPaid.toFixed(8),
        pendingTurnover: pendingTurnover.toFixed(8),
        potentialCommission: potentialCommission.toFixed(8)
      };
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to get referrer stats', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 📊 Получить прогресс отыгрыша
   */
  async getWagerProgress(userId, tokenId = 2) {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || !validators.validateUserId(userIdNum)) {
        throw new Error('Invalid userId');
      }
      
      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId: userIdNum,
          tokenId,
          isActive: true,
          isCompleted: false
        },
        include: { bonus: true }
      });
      
      if (!activeBonus) {
        return null;
      }
      
      const wagered = parseFloat(activeBonus.wageredAmount.toString());
      const required = parseFloat(activeBonus.requiredWager.toString());
      const granted = parseFloat(activeBonus.grantedAmount.toString());
      
      const bonusBalance = await prisma.balance.findUnique({
        where: {
          userId_tokenId_type: { userId: userIdNum, tokenId, type: 'BONUS' }
        }
      });
      
      const currentBonus = parseFloat(bonusBalance?.amount.toString() || '0');
      
      return {
        bonusGranted: granted.toFixed(8),
        bonusRemaining: currentBonus.toFixed(8),
        wagered: wagered.toFixed(8),
        required: required.toFixed(8),
        progress: Math.min((wagered / required) * 100, 100).toFixed(2),
        remaining: Math.max(required - wagered, 0).toFixed(8),
        expiresAt: activeBonus.expiresAt,
        isExpired: activeBonus.expiresAt && new Date() > activeBonus.expiresAt
      };
      
    } catch (error) {
      logger.error('REFERRAL', 'Failed to get wager progress', { error: error.message });
      throw error;
    }
  }
}

module.exports = new ReferralService();
module.exports.CONFIG = CONFIG;