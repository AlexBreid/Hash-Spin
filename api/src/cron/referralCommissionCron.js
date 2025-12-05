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
    const result = await referralService.processAllPendingCommissions(DEFAULT_TOKEN_ID);
    
    console.log(`✅ [CRON] Commission payout completed:`);
    console.log(`   📊 Processed: ${result.processed}`);
    console.log(`   ✅ Success: ${result.success}`);
    console.log(`   💰 Total paid: ${result.totalPaid.toFixed(4)} USDT`);
    
    return result;
  } catch (error) {
    console.error(`❌ [CRON] Error processing commissions:`, error.message);
    throw error;
  }
}

/**
 * 🚀 Запустить CRON job
 */
function startReferralCron(intervalMs = CRON_INTERVAL_MS) {
  if (cronInterval) {
    console.log('⚠️ [CRON] Referral cron already running');
    return;
  }
  
  console.log(`🚀 [CRON] Starting referral commission cron (interval: ${intervalMs / 1000}s)`);
  
  // Первый запуск через 5 минут после старта сервера
  setTimeout(() => {
    processCommissions().catch(console.error);
  }, 5 * 60 * 1000);
  
  // Регулярные запуски
  cronInterval = setInterval(() => {
    processCommissions().catch(console.error);
  }, intervalMs);
  
  console.log('✅ [CRON] Referral commission cron started');
}

/**
 * 🛑 Остановить CRON job
 */
function stopReferralCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('🛑 [CRON] Referral commission cron stopped');
  }
}

/**
 * 🔧 Проверить истёкшие бонусы
 * Рекомендуется запускать раз в день
 */
async function cleanupExpiredBonuses() {
  const prisma = require('../../prismaClient');
  
  console.log(`\n🧹 [CRON] Cleaning up expired bonuses...`);
  
  try {
    // Находим истёкшие бонусы
    const expiredBonuses = await prisma.userBonus.findMany({
      where: {
        isActive: true,
        isCompleted: false,
        expiresAt: { lt: new Date() }
      }
    });
    
    console.log(`📊 [CRON] Found ${expiredBonuses.length} expired bonuses`);
    
    for (const bonus of expiredBonuses) {
      // Помечаем как неактивный
      await prisma.userBonus.update({
        where: { id: bonus.id },
        data: { isActive: false }
      });
      
      // Обнуляем бонусный баланс для этого пользователя
      await prisma.balance.updateMany({
        where: {
          userId: bonus.userId,
          tokenId: bonus.tokenId,
          type: 'BONUS'
        },
        data: { amount: '0' }
      });
      
      console.log(`   🗑️ Expired bonus ${bonus.id} for user ${bonus.userId}`);
    }
    
    console.log(`✅ [CRON] Cleanup completed`);
    return { cleaned: expiredBonuses.length };
  } catch (error) {
    console.error(`❌ [CRON] Error cleaning up bonuses:`, error.message);
    throw error;
  }
}

module.exports = {
  processCommissions,
  startReferralCron,
  stopReferralCron,
  cleanupExpiredBonuses
};
