/**
 * ✅ ИСПРАВЛЕННЫЙ CRON для обработки реферальных комиссий
 * КОПИРУЙ В: src/cron/referralCommissionCron.js
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const referralService = require('../services/ReferralService');

// Конфигурация
const CRON_INTERVAL_MS = 60 * 60 * 1000; // 1 час
const DEFAULT_TOKEN_ID = 2; // USDT

let cronInterval = null;

/**
 * 🔄 Обработать все накопленные комиссии
 */
async function processCommissions() {
  console.log(`\n⏰ [CRON] Starting referral commission payout...`);
  console.log(`📅 [CRON] Time: ${new Date().toISOString()}`);
  
  try {
    // ✅ ИСПРАВЛЕНИЕ: processAllPendingCommissions теперь существует!
    const result = await referralService.processAllPendingCommissions(DEFAULT_TOKEN_ID);
    
    // ✅ Проверяем что result существует и имеет нужные свойства
    if (!result) {
      logger.warn('CRON', 'processAllPendingCommissions returned null');
      return { processed: 0, success: 0, totalPaid: '0' };
    }
    
    // ✅ Приводим totalPaid к числу перед toFixed
    const totalPaidNum = typeof result.totalPaid === 'string' 
      ? parseFloat(result.totalPaid) 
      : result.totalPaid;
    
    const totalPaidFixed = parseFloat(totalPaidNum.toFixed(8));
    
    console.log(`✅ [CRON] Commission payout completed:`);
    console.log(`   📊 Processed: ${result.processed}`);
    console.log(`   ✅ Success: ${result.success}`);
    console.log(`   💰 Total paid: ${totalPaidFixed.toFixed(4)} USDT`);
    console.log(`   📦 Breakdown - Workers: ${result.breakdown?.workers || 0}, Regular: ${result.breakdown?.regular || 0}`);
    
    return {
      ...result,
      totalPaid: totalPaidFixed.toFixed(8)
    };
  } catch (error) {
    logger.error('CRON', `Error processing commissions: ${error.message}`);
    console.error(`❌ [CRON] Error processing commissions:`, error);
    return { processed: 0, success: 0, totalPaid: '0', error: error.message };
  }
}

/**
 * 🚀 Запустить CRON job
 */
function startReferralCron(intervalMs = CRON_INTERVAL_MS) {
  if (cronInterval) {
    logger.warn('CRON', 'Referral cron already running');
    console.log('⚠️ [CRON] Referral cron already running');
    return;
  }
  
  logger.info('CRON', `Starting referral commission cron (interval: ${intervalMs / 1000}s)`);
  console.log(`🚀 [CRON] Starting referral commission cron (interval: ${intervalMs / 1000}s)`);
  
  // Первый запуск через 5 минут после старта сервера
  const initialTimeout = setTimeout(() => {
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
  console.log('✅ [CRON] Referral commission cron started');
  
  return { cronInterval, initialTimeout };
}

/**
 * 🛑 Остановить CRON job
 */
function stopReferralCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    logger.info('CRON', 'Referral commission cron stopped');
    console.log('🛑 [CRON] Referral commission cron stopped');
  }
}

/**
 * 🔧 Проверить истёкшие бонусы
 * Рекомендуется запускать раз в день
 */
async function cleanupExpiredBonuses() {
  console.log(`\n🧹 [CRON] Cleaning up expired bonuses...`);
  logger.info('CRON', 'Starting expired bonuses cleanup');
  
  try {
    // Находим истёкшие бонусы
    const expiredBonuses = await prisma.userBonus.findMany({
      where: {
        isActive: true,
        isCompleted: false,
        expiresAt: { lt: new Date() }
      },
      select: { id: true, userId: true, tokenId: true }
    });
    
    console.log(`📊 [CRON] Found ${expiredBonuses.length} expired bonuses`);
    logger.info('CRON', `Found ${expiredBonuses.length} expired bonuses to cleanup`);
    
    let cleaned = 0;
    
    for (const bonus of expiredBonuses) {
      try {
        // ✅ Используем transaction для атомарности
        await prisma.$transaction(async (tx) => {
          // Помечаем как неактивный
          await tx.userBonus.update({
            where: { id: bonus.id },
            data: { isActive: false }
          });
          
          // Обнуляем бонусный баланс для этого пользователя
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
        logger.debug('CRON', `Expired bonus ${bonus.id} for user ${bonus.userId}`);
        console.log(`   🗑️ Expired bonus ${bonus.id} for user ${bonus.userId}`);
      } catch (error) {
        logger.error('CRON', `Error cleaning up bonus ${bonus.id}: ${error.message}`);
        console.error(`   ❌ Error cleaning bonus ${bonus.id}:`, error.message);
      }
    }
    
    console.log(`✅ [CRON] Cleanup completed: ${cleaned} bonuses cleaned`);
    logger.info('CRON', `Cleanup completed: ${cleaned} bonuses cleaned`);
    
    return { cleaned };
  } catch (error) {
    logger.error('CRON', `Error cleaning up bonuses: ${error.message}`);
    console.error(`❌ [CRON] Error cleaning up bonuses:`, error);
    throw error;
  }
}

/**
 * 🔍 Проверить статус CRON
 */
function getCronStatus() {
  return {
    isRunning: cronInterval !== null,
    lastCheck: new Date().toISOString()
  };
}

module.exports = {
  processCommissions,
  startReferralCron,
  stopReferralCron,
  cleanupExpiredBonuses,
  getCronStatus
};