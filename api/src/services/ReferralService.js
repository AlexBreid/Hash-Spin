const prisma = require('../../prismaClient');

// Конфигурация
const CONFIG = {
  // Бонус реферала
  DEPOSIT_BONUS_PERCENT: 100,        // +100% к депозиту
  WAGERING_MULTIPLIER: 10,           // x10 для отыгрыша
  BONUS_EXPIRY_DAYS: 7,              // Бонус сгорает через 7 дней
  
  // Комиссия реферера
  HOUSE_EDGE: 0.03,                  // 3% преимущество казино
  REGULAR_COMMISSION_RATE: 0.30,     // 30% для обычных
  WORKER_COMMISSION_RATE: 0.40,      // 40% для воркеров
  
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
      console.log(`🎁 [REFERRAL] Проверяю бонус для userId=${userId}, deposit=${depositAmount}`);
      
      // 1. Получаем пользователя с реферером
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          referredById: true,
          referrer: {
            select: { id: true, referrerType: true, username: true }
          }
        }
      });
      
      if (!user || !user.referredById) {
        console.log(`⚠️ [REFERRAL] Пользователь ${userId} не имеет реферера`);
        return null;
      }
      
      // 2. Проверяем, это первый депозит?
      const depositCount = await prisma.transaction.count({
        where: {
          userId,
          type: 'DEPOSIT',
          status: 'COMPLETED'
        }
      });
      
      if (depositCount > 1) {
        console.log(`⚠️ [REFERRAL] У пользователя ${userId} уже был депозит (${depositCount})`);
        return null;
      }
      
      // 3. Получаем бонусную программу
      let bonusProgram = await prisma.bonus.findFirst({
        where: { name: 'Referral Welcome Bonus' }
      });
      
      // Создаём если нет
      if (!bonusProgram) {
        bonusProgram = await prisma.bonus.create({
          data: {
            name: 'Referral Welcome Bonus',
            description: '+100% к первому депозиту по реферальной ссылке',
            wageringMultiplier: CONFIG.WAGERING_MULTIPLIER,
            maxBonusAmount: '10000', // Максимум 10k USDT бонуса
            depositBonusPercent: CONFIG.DEPOSIT_BONUS_PERCENT
          }
        });
        console.log(`✅ [REFERRAL] Создана бонусная программа: ${bonusProgram.id}`);
      }
      
      // 4. Рассчитываем бонус
      const maxBonus = parseFloat(bonusProgram.maxBonusAmount.toString());
      const bonusPercent = bonusProgram.depositBonusPercent / 100;
      const bonusAmount = Math.min(depositAmount * bonusPercent, maxBonus);
      const requiredWager = bonusAmount * CONFIG.WAGERING_MULTIPLIER;
      
      console.log(`💰 [REFERRAL] Бонус: ${bonusAmount}, требуемый отыгрыш: ${requiredWager}`);
      
      // 5. Создаём UserBonus
      const userBonus = await prisma.userBonus.create({
        data: {
          userId,
          bonusId: bonusProgram.id,
          tokenId,
          grantedAmount: bonusAmount.toString(),
          requiredWager: requiredWager.toString(),
          wageredAmount: '0',
          isActive: true,
          isCompleted: false,
          referrerId: user.referredById,
          expiresAt: new Date(Date.now() + CONFIG.BONUS_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        }
      });
      
      // 6. Начисляем на BONUS баланс
      await prisma.balance.upsert({
        where: {
          userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
        },
        create: {
          userId,
          tokenId,
          type: 'BONUS',
          amount: bonusAmount.toString()
        },
        update: {
          amount: { increment: bonusAmount }
        }
      });
      
      // 7. Записываем в реферальные транзакции
      await prisma.referralTransaction.create({
        data: {
          referrerId: user.referredById,
          refereeId: userId,
          tokenId,
          eventType: 'DEPOSIT_BONUS',
          amount: bonusAmount.toString(),
          sourceEntityId: userBonus.id,
          sourceEntityType: 'UserBonus'
        }
      });
      
      // 8. Инициализируем статистику реферала
      await prisma.referralStats.upsert({
        where: {
          referrerId_refereeId_tokenId: {
            referrerId: user.referredById,
            refereeId: userId,
            tokenId
          }
        },
        create: {
          referrerId: user.referredById,
          refereeId: userId,
          tokenId,
          totalTurnover: '0',
          turnoverSinceLastPayout: '0',
          totalCommissionPaid: '0'
        },
        update: {} // Ничего не обновляем, просто убеждаемся что запись есть
      });
      
      console.log(`✅ [REFERRAL] Бонус ${bonusAmount} начислен пользователю ${userId}`);
      
      return {
        bonusAmount,
        requiredWager,
        expiresAt: userBonus.expiresAt,
        referrerId: user.referredById,
        referrerUsername: user.referrer?.username
      };
      
    } catch (error) {
      console.error(`❌ [REFERRAL] Ошибка начисления бонуса:`, error);
      throw error;
    }
  }
  
  /**
   * 🎰 Обработать ставку - обновить отыгрыш и статистику
   * @param {number} userId - ID игрока
   * @param {number} betAmount - Сумма ставки
   * @param {number} tokenId - ID токена
   * @param {string} balanceType - Тип баланса ('MAIN' | 'BONUS')
   */
  async processBet(userId, betAmount, tokenId, balanceType = 'MAIN') {
    try {
      const amount = parseFloat(betAmount);
      
      // 1. Если ставка с бонусного баланса - обновляем отыгрыш
      if (balanceType === 'BONUS') {
        await this.updateWagerProgress(userId, amount, tokenId);
      }
      
      // 2. Обновляем статистику оборота для реферера
      await this.updateReferrerStats(userId, amount, tokenId);
      
    } catch (error) {
      console.error(`❌ [REFERRAL] Ошибка обработки ставки:`, error);
      // Не бросаем ошибку - это не должно блокировать игру
    }
  }
  
  /**
   * 📊 Обновить прогресс отыгрыша бонуса
   */
  async updateWagerProgress(userId, betAmount, tokenId) {
    try {
      // Находим активный бонус
      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId,
          tokenId,
          isActive: true,
          isCompleted: false,
          expiresAt: { gt: new Date() }
        },
        include: { bonus: true }
      });
      
      if (!activeBonus) {
        return null;
      }
      
      const newWagered = parseFloat(activeBonus.wageredAmount.toString()) + betAmount;
      const required = parseFloat(activeBonus.requiredWager.toString());
      
      console.log(`📊 [WAGER] User ${userId}: ${newWagered}/${required} отыграно`);
      
      // Обновляем прогресс
      await prisma.userBonus.update({
        where: { id: activeBonus.id },
        data: { wageredAmount: newWagered.toString() }
      });
      
      // Если отыгрыш выполнен - переводим в MAIN
      if (newWagered >= required) {
        await this.completeWagerAndTransfer(userId, tokenId, activeBonus.id);
      }
      
      return {
        wagered: newWagered,
        required,
        progress: Math.min((newWagered / required) * 100, 100).toFixed(2)
      };
      
    } catch (error) {
      console.error(`❌ [REFERRAL] Ошибка обновления отыгрыша:`, error);
    }
  }
  
  /**
   * ✅ Завершить отыгрыш и перевести остаток в MAIN
   */
  async completeWagerAndTransfer(userId, tokenId, userBonusId) {
    try {
      console.log(`✅ [WAGER] Завершаю отыгрыш для userId=${userId}`);
      
      // 1. Получаем текущий бонусный баланс
      const bonusBalance = await prisma.balance.findUnique({
        where: {
          userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
        }
      });
      
      if (!bonusBalance) {
        console.log(`⚠️ [WAGER] Бонусный баланс не найден`);
        return;
      }
      
      const remainingBonus = parseFloat(bonusBalance.amount.toString());
      
      if (remainingBonus > 0) {
        // 2. Переводим остаток в MAIN
        await prisma.$transaction([
          // Обнуляем BONUS
          prisma.balance.update({
            where: { id: bonusBalance.id },
            data: { amount: '0' }
          }),
          // Добавляем в MAIN
          prisma.balance.upsert({
            where: {
              userId_tokenId_type: { userId, tokenId, type: 'MAIN' }
            },
            create: {
              userId,
              tokenId,
              type: 'MAIN',
              amount: remainingBonus.toString()
            },
            update: {
              amount: { increment: remainingBonus }
            }
          }),
          // Логируем транзакцию
          prisma.transaction.create({
            data: {
              userId,
              tokenId,
              type: 'BONUS_TO_MAIN',
              status: 'COMPLETED',
              amount: remainingBonus.toString()
            }
          })
        ]);
        
        console.log(`💰 [WAGER] Переведено ${remainingBonus} из BONUS в MAIN`);
      }
      
      // 3. Помечаем бонус как завершённый
      await prisma.userBonus.update({
        where: { id: userBonusId },
        data: { isActive: false, isCompleted: true }
      });
      
      return remainingBonus;
      
    } catch (error) {
      console.error(`❌ [REFERRAL] Ошибка перевода бонуса:`, error);
      throw error;
    }
  }
  
  /**
   * 📈 Обновить статистику оборота реферера (аккумулятор)
   */
  async updateReferrerStats(userId, betAmount, tokenId) {
    try {
      // Находим реферера пользователя
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referredById: true }
      });
      
      if (!user?.referredById) {
        return; // Нет реферера
      }
      
      // Инкрементируем оборот
      await prisma.referralStats.upsert({
        where: {
          referrerId_refereeId_tokenId: {
            referrerId: user.referredById,
            refereeId: userId,
            tokenId
          }
        },
        create: {
          referrerId: user.referredById,
          refereeId: userId,
          tokenId,
          totalTurnover: betAmount.toString(),
          turnoverSinceLastPayout: betAmount.toString(),
          totalCommissionPaid: '0'
        },
        update: {
          totalTurnover: { increment: betAmount },
          turnoverSinceLastPayout: { increment: betAmount }
        }
      });
      
    } catch (error) {
      console.error(`❌ [REFERRAL] Ошибка обновления статистики:`, error);
    }
  }
  
  /**
   * 💸 Рассчитать и выплатить комиссию рефереру
   * Формула: Commission = (HouseEdge × Turnover / 2) × Rate
   * 
   * @param {number} referrerId - ID реферера
   * @param {number} refereeId - ID реферала
   * @param {number} tokenId - ID токена
   */
  async payoutReferrerCommission(referrerId, refereeId, tokenId) {
    try {
      // 1. Получаем статистику
      const stats = await prisma.referralStats.findUnique({
        where: {
          referrerId_refereeId_tokenId: { referrerId, refereeId, tokenId }
        }
      });
      
      if (!stats) {
        return null;
      }
      
      const turnover = parseFloat(stats.turnoverSinceLastPayout.toString());
      
      if (turnover < CONFIG.MIN_TURNOVER_FOR_PAYOUT) {
        console.log(`⚠️ [COMMISSION] Оборот ${turnover} меньше минимума ${CONFIG.MIN_TURNOVER_FOR_PAYOUT}`);
        return null;
      }
      
      // 2. Определяем процент комиссии
      const referrer = await prisma.user.findUnique({
        where: { id: referrerId },
        select: { referrerType: true }
      });
      
      const commissionRate = referrer?.referrerType === 'WORKER' 
        ? CONFIG.WORKER_COMMISSION_RATE 
        : CONFIG.REGULAR_COMMISSION_RATE;
      
      // 3. Рассчитываем комиссию: (HouseEdge × Turnover / 2) × Rate
      const commission = (CONFIG.HOUSE_EDGE * turnover / 2) * commissionRate;
      
      if (commission < CONFIG.MIN_COMMISSION_PAYOUT) {
        console.log(`⚠️ [COMMISSION] Комиссия ${commission} меньше минимума ${CONFIG.MIN_COMMISSION_PAYOUT}`);
        return null;
      }
      
      console.log(`💸 [COMMISSION] Реферер ${referrerId}: turnover=${turnover}, rate=${commissionRate * 100}%, commission=${commission}`);
      
      // 4. Выплачиваем комиссию
      await prisma.$transaction([
        // Обновляем статистику
        prisma.referralStats.update({
          where: { id: stats.id },
          data: {
            turnoverSinceLastPayout: '0',
            totalCommissionPaid: { increment: commission },
            lastPayoutAt: new Date()
          }
        }),
        // Начисляем на баланс реферера
        prisma.balance.upsert({
          where: {
            userId_tokenId_type: { userId: referrerId, tokenId, type: 'MAIN' }
          },
          create: {
            userId: referrerId,
            tokenId,
            type: 'MAIN',
            amount: commission.toString()
          },
          update: {
            amount: { increment: commission }
          }
        }),
        // Логируем транзакцию
        prisma.transaction.create({
          data: {
            userId: referrerId,
            tokenId,
            type: 'REFERRAL_COMMISSION',
            status: 'COMPLETED',
            amount: commission.toString()
          }
        }),
        // Реферальная транзакция
        prisma.referralTransaction.create({
          data: {
            referrerId,
            refereeId,
            tokenId,
            eventType: 'BET_COMMISSION',
            amount: commission.toString(),
            sourceEntityId: stats.id,
            sourceEntityType: 'ReferralStats'
          }
        })
      ]);
      
      console.log(`✅ [COMMISSION] Выплачено ${commission} рефереру ${referrerId}`);
      
      return {
        commission,
        turnover,
        rate: commissionRate * 100
      };
      
    } catch (error) {
      console.error(`❌ [REFERRAL] Ошибка выплаты комиссии:`, error);
      throw error;
    }
  }
  
  /**
   * 🔄 Массовая выплата комиссий (для CRON)
   * Вызывать раз в час/день для всех накопленных комиссий
   */
  async processAllPendingCommissions(tokenId = 2) {
    try {
      console.log(`🔄 [COMMISSION] Начинаю массовую выплату комиссий...`);
      
      // Находим все записи с достаточным оборотом
      const pendingStats = await prisma.referralStats.findMany({
        where: {
          tokenId,
          turnoverSinceLastPayout: { gte: CONFIG.MIN_TURNOVER_FOR_PAYOUT }
        }
      });
      
      console.log(`📊 [COMMISSION] Найдено ${pendingStats.length} записей для обработки`);
      
      let totalPaid = 0;
      let successCount = 0;
      
      for (const stats of pendingStats) {
        try {
          const result = await this.payoutReferrerCommission(
            stats.referrerId, 
            stats.refereeId, 
            stats.tokenId
          );
          
          if (result) {
            totalPaid += result.commission;
            successCount++;
          }
        } catch (error) {
          console.error(`❌ [COMMISSION] Ошибка для пары ${stats.referrerId}-${stats.refereeId}:`, error.message);
        }
      }
      
      console.log(`✅ [COMMISSION] Выплачено ${totalPaid} по ${successCount} записям`);
      
      return {
        processed: pendingStats.length,
        success: successCount,
        totalPaid
      };
      
    } catch (error) {
      console.error(`❌ [REFERRAL] Ошибка массовой выплаты:`, error);
      throw error;
    }
  }
  
  /**
   * 👷 Установить пользователя как воркера
   */
  async setUserAsWorker(userId) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { referrerType: 'WORKER' }
      });
      
      console.log(`👷 [REFERRAL] Пользователь ${userId} установлен как WORKER`);
      return user;
      
    } catch (error) {
      console.error(`❌ [REFERRAL] Ошибка установки воркера:`, error);
      throw error;
    }
  }
  
  /**
   * 📊 Получить статистику реферера
   */
  async getReferrerStats(userId, tokenId = 2) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referrerType: true, referralCode: true }
      });
      
      // Количество рефералов
      const referralsCount = await prisma.user.count({
        where: { referredById: userId }
      });
      
      // Агрегируем статистику
      const stats = await prisma.referralStats.aggregate({
        where: { referrerId: userId, tokenId },
        _sum: {
          totalTurnover: true,
          totalCommissionPaid: true,
          turnoverSinceLastPayout: true
        }
      });
      
      const commissionRate = user?.referrerType === 'WORKER' 
        ? CONFIG.WORKER_COMMISSION_RATE 
        : CONFIG.REGULAR_COMMISSION_RATE;
      
      // Расчёт потенциальной комиссии
      const pendingTurnover = parseFloat(stats._sum.turnoverSinceLastPayout?.toString() || '0');
      const potentialCommission = (CONFIG.HOUSE_EDGE * pendingTurnover / 2) * commissionRate;
      
      return {
        referralCode: user?.referralCode,
        referrerType: user?.referrerType || 'REGULAR',
        commissionRate: commissionRate * 100,
        referralsCount,
        totalTurnover: parseFloat(stats._sum.totalTurnover?.toString() || '0'),
        totalCommissionPaid: parseFloat(stats._sum.totalCommissionPaid?.toString() || '0'),
        pendingTurnover,
        potentialCommission: potentialCommission.toFixed(4)
      };
      
    } catch (error) {
      console.error(`❌ [REFERRAL] Ошибка получения статистики:`, error);
      throw error;
    }
  }
  
  /**
   * 📊 Получить прогресс отыгрыша для реферала
   */
  async getWagerProgress(userId, tokenId = 2) {
    try {
      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId,
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
      
      // Текущий бонусный баланс
      const bonusBalance = await prisma.balance.findUnique({
        where: {
          userId_tokenId_type: { userId, tokenId, type: 'BONUS' }
        }
      });
      
      const currentBonus = parseFloat(bonusBalance?.amount.toString() || '0');
      
      return {
        bonusGranted: granted,
        bonusRemaining: currentBonus,
        wagered,
        required,
        progress: Math.min((wagered / required) * 100, 100).toFixed(2),
        remaining: Math.max(required - wagered, 0),
        expiresAt: activeBonus.expiresAt,
        isExpired: activeBonus.expiresAt && new Date() > activeBonus.expiresAt
      };
      
    } catch (error) {
      console.error(`❌ [REFERRAL] Ошибка получения прогресса:`, error);
      throw error;
    }
  }
}

module.exports = new ReferralService();
module.exports.CONFIG = CONFIG;
