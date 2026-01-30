/**
 * ✅ referralCommissionCron.js - ИСПРАВЛЕННЫЙ
 * 
 * Запускается раз в час и обрабатывает все накопленные комиссии
 * Использует processAllPendingCommissions из ReferralService
 * который считает комиссии на основе newTurnoverSinceLastPayout (REGULAR)
 * и newLossesSinceLastPayout (WORKER)
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const referralService = require('../services/ReferralService');

const CRON_INTERVAL_MS = 60 * 60 * 10000; // 1 час
const DEFAULT_TOKEN_ID = 2; // USDT

let cronInterval = null;
let initialTimeout = null;

/**
 * 🔄 Обработать все накопленные комиссии
 */
async function processCommissions() {
  try {
    // ⭐ Вызываем исправленный метод
    const result = await referralService.processAllPendingCommissions(DEFAULT_TOKEN_ID);
    
    if (!result) {
      logger.warn('CRON', 'processAllPendingCommissions returned null');
      return { processed: 0, success: 0, totalPaid: '0' };
    }
    
    const totalPaidNum = typeof result.totalPaid === 'string' 
      ? parseFloat(result.totalPaid) 
      : result.totalPaid;
    
    logger.info('CRON', 'Commission processing completed', {
      processed: result.processed,
      success: result.success,
      totalPaid: totalPaidNum.toFixed(8),
      breakdown: result.breakdown
    });
    
    return {
      ...result,
      totalPaid: totalPaidNum.toFixed(8)
    };
    
  } catch (error) {
    logger.error('CRON', `Error processing commissions: ${error.message}`, {
      stack: error.stack
    });
    return { processed: 0, success: 0, totalPaid: '0', error: error.message };
  }
}

/**
 * 🚀 Запустить CRON
 */
function startReferralCron(intervalMs = CRON_INTERVAL_MS) {
  if (cronInterval) {
    logger.warn('CRON', 'Referral cron already running');
    return { cronInterval, initialTimeout };
  }
  
  logger.info('CRON', `Starting referral commission cron (interval: ${(intervalMs / 1000 / 60).toFixed(0)} min)`);
  // Первый запуск через 5 минут
  initialTimeout = setTimeout(() => {
    processCommissions().catch(error => {
      logger.error('CRON', `Error in initial commission processing: ${error.message}`);
      });
  }, 5 * 60 * 1000);
  
  // Регулярные запуски
  cronInterval = setInterval(() => {
    processCommissions().catch(error => {
      logger.error('CRON', `Error in scheduled commission processing: ${error.message}`);
      });
  }, intervalMs);
  
  logger.info('CRON', 'Referral commission cron started successfully');
  return { cronInterval, initialTimeout };
}

/**
 * 🛑 Остановить CRON
 */
function stopReferralCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
  
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  
  logger.info('CRON', 'Referral commission cron stopped');
  }

/**
 * 🧹 Очистить истёкшие бонусы (запускать раз в день)
 */
async function cleanupExpiredBonuses() {
  logger.info('CRON', 'Starting expired bonuses cleanup');
  
  try {
    const expiredBonuses = await prisma.userBonus.findMany({
      where: {
        isActive: true,
        isCompleted: false,
        expiresAt: { lt: new Date() }
      },
      select: { id: true, userId: true, tokenId: true, grantedAmount: true }
    });
    
    if (expiredBonuses.length === 0) {
      return { cleaned: 0 };
    }
    
    let cleaned = 0;
    let totalLost = 0;
    
    for (const bonus of expiredBonuses) {
      try {
        await prisma.$transaction(async (tx) => {
          // Помечаем как неактивный
          await tx.userBonus.update({
            where: { id: bonus.id },
            data: {
              isActive: false,
              isCompleted: true,
              completedAt: new Date()
            }
          });
          
          // Обнуляем бонусный баланс
          await tx.balance.updateMany({
            where: {
              userId: bonus.userId,
              tokenId: bonus.tokenId,
              type: 'BONUS'
            },
            data: { amount: '0' }
          });
        });
        
        cleaned++;
        const grantedAmount = parseFloat(bonus.grantedAmount.toString());
        totalLost += grantedAmount;
        
        logger.debug('CRON', `Expired bonus ${bonus.id} for user ${bonus.userId}`);
        
      } catch (error) {
        logger.error('CRON', `Error cleaning up bonus ${bonus.id}: ${error.message}`);
      }
    }
    
    logger.info('CRON', `Cleanup completed: ${cleaned} bonuses cleaned`);
    
    return { cleaned, totalLost };
    
  } catch (error) {
    logger.error('CRON', `Error cleaning up bonuses: ${error.message}`);
    throw error;
  }
}

/**
 * 🔍 Получить статус CRON
 */
function getCronStatus() {
  return {
    isRunning: cronInterval !== null,
    lastCheck: new Date().toISOString(),
    interval: `${(CRON_INTERVAL_MS / 1000 / 60).toFixed(0)} minutes`
  };
}

module.exports = {
  processCommissions,
  startReferralCron,
  stopReferralCron,
  cleanupExpiredBonuses,
  getCronStatus
};

