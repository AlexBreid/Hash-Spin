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
  console.log(`\n${'='.repeat(80)}`);
  console.log(`⏰ [CRON] Starting referral commission payout`);
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(80)}`);
  
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
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ [CRON] Commission payout COMPLETED`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 Processed: ${result.processed}`);
    console.log(`✅ Success: ${result.success}`);
    console.log(`💰 Total paid: ${totalPaidNum.toFixed(8)} USDT`);
    console.log(`🟢 Regular: ${result.breakdown?.regular || 0} (${result.breakdown?.regularAmount?.toFixed(8) || '0'} USDT)`);
    console.log(`🔴 Workers: ${result.breakdown?.workers || 0} (${result.breakdown?.workersAmount?.toFixed(8) || '0'} USDT)`);
    console.log(`${'='.repeat(80)}\n`);
    
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
    console.error(`\n❌ [CRON] CRITICAL ERROR:`, error.message);
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
    console.log('⚠️ [CRON] Referral cron already running');
    return { cronInterval, initialTimeout };
  }
  
  logger.info('CRON', `Starting referral commission cron (interval: ${(intervalMs / 1000 / 60).toFixed(0)} min)`);
  console.log(`🚀 [CRON] Starting referral commission cron`);
  console.log(`   Interval: ${(intervalMs / 1000 / 60).toFixed(0)} minutes`);
  console.log(`   First run: in 5 minutes\n`);
  
  // Первый запуск через 5 минут
  initialTimeout = setTimeout(() => {
    console.log(`⏱️ [CRON] Running first scheduled commission check...\n`);
    processCommissions().catch(error => {
      logger.error('CRON', `Error in initial commission processing: ${error.message}`);
      console.error(error);
    });
  }, 5 * 60 * 1000);
  
  // Регулярные запуски
  cronInterval = setInterval(() => {
    processCommissions().catch(error => {
      logger.error('CRON', `Error in scheduled commission processing: ${error.message}`);
      console.error(error);
    });
  }, intervalMs);
  
  logger.info('CRON', 'Referral commission cron started successfully');
  console.log('✅ [CRON] Referral commission cron initialized\n');
  
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
  console.log('🛑 [CRON] Referral commission cron stopped');
}

/**
 * 🧹 Очистить истёкшие бонусы (запускать раз в день)
 */
async function cleanupExpiredBonuses() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧹 [CRON] Cleaning up expired bonuses...`);
  console.log(`${'='.repeat(80)}`);
  
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
    
    console.log(`📊 Found ${expiredBonuses.length} expired bonuses`);
    
    if (expiredBonuses.length === 0) {
      console.log('✅ No expired bonuses');
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
        
        console.log(`   ✅ Expired: User ${bonus.userId}, Bonus ${grantedAmount.toFixed(8)}`);
        logger.debug('CRON', `Expired bonus ${bonus.id} for user ${bonus.userId}`);
        
      } catch (error) {
        console.error(`   ❌ Error cleaning bonus ${bonus.id}:`, error.message);
        logger.error('CRON', `Error cleaning up bonus ${bonus.id}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ [CRON] Cleanup completed: ${cleaned} bonuses cleaned`);
    console.log(`💸 Total lost: ${totalLost.toFixed(8)} USDT`);
    console.log(`${'='.repeat(80)}\n`);
    
    logger.info('CRON', `Cleanup completed: ${cleaned} bonuses cleaned`);
    
    return { cleaned, totalLost };
    
  } catch (error) {
    console.error(`\n❌ [CRON] Error cleaning up bonuses:`, error.message);
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