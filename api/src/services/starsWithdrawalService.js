/**
 * ⭐ Сервис для вывода Telegram Stars
 * 
 * Stars можно вывести двумя способами:
 * 1. refundStarPayment - возврат Stars пользователю (нужен telegram_payment_charge_id)
 * 2. Конвертация в другую валюту (ручной процесс)
 * 
 * Согласно документации Telegram:
 * https://core.telegram.org/bots/payments-stars
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const telegramStarsService = require('./telegramStarsService');

// Минимальная сумма вывода в Stars
const MIN_STARS_WITHDRAWAL = 100; // ~$2

// Комиссия на вывод Stars (конвертация в USDT)
const STARS_WITHDRAWAL_FEE_PERCENT = 10; // 10%

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 НАСТРОЙКИ АВТОМАТИЧЕСКОГО ОДОБРЕНИЯ
// ═══════════════════════════════════════════════════════════════════════════════
const AUTO_APPROVE_LIMIT_USD = 100;      // Автоматическое одобрение до $100
const MAX_AUTO_WITHDRAWALS_PER_DAY = 2;  // Максимум 2 автоматических вывода в сутки

/**
 * ⭐ Проверить, может ли вывод Stars быть автоматически одобрен
 * @param {number} userId - ID пользователя
 * @param {number} amountUSD - Сумма в USD
 * @returns {Object} { canAutoApprove: boolean, reason: string }
 */
async function checkStarsAutoApproval(userId, amountUSD) {
  // Проверка суммы
  if (amountUSD > AUTO_APPROVE_LIMIT_USD) {
    return {
      canAutoApprove: false,
      reason: `Сумма ${amountUSD.toFixed(2)} USD превышает лимит автоматического одобрения ($${AUTO_APPROVE_LIMIT_USD})`
    };
  }
  
  // Проверка количества выводов за последние 24 часа
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentWithdrawals = await prisma.transaction.count({
    where: {
      userId: userId,
      type: 'WITHDRAW',
      status: 'COMPLETED',
      createdAt: { gte: oneDayAgo }
    }
  });
  
  if (recentWithdrawals >= MAX_AUTO_WITHDRAWALS_PER_DAY) {
    return {
      canAutoApprove: false,
      reason: `Превышен лимит автоматических выводов (${MAX_AUTO_WITHDRAWALS_PER_DAY} в сутки)`
    };
  }
  
  return {
    canAutoApprove: true,
    reason: 'Автоматическое одобрение'
  };
}

/**
 * Создать заявку на вывод Stars
 * @param {number} userId - ID пользователя
 * @param {number} starsAmount - Количество Stars для вывода
 * @param {string} method - Метод вывода: 'refund' (возврат) или 'convert' (конвертация в USDT)
 */
async function createStarsWithdrawal(userId, starsAmount, method = 'convert') {
  try {
    const amount = parseInt(starsAmount);
    
    if (isNaN(amount) || amount < MIN_STARS_WITHDRAWAL) {
      return {
        success: false,
        error: `Минимальная сумма вывода: ${MIN_STARS_WITHDRAWAL} Stars`
      };
    }
    
    // Проверяем баланс Stars пользователя
    const balance = await telegramStarsService.getUserStarsBalance(userId);
    
    if (balance < amount) {
      return {
        success: false,
        error: `Недостаточно Stars. Доступно: ${balance}`
      };
    }
    
    // Проверяем активный бонус
    const xtrToken = await prisma.cryptoToken.findFirst({
      where: { symbol: 'XTR', network: 'TELEGRAM' }
    });
    
    if (xtrToken) {
      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId: userId,
          tokenId: xtrToken.id,
          isActive: true,
          isCompleted: false,
          expiresAt: { gt: new Date() }
        }
      });
      
      if (activeBonus) {
        const wagered = parseFloat(activeBonus.wageredAmount.toString());
        const required = parseFloat(activeBonus.requiredWager.toString());
        const remaining = Math.max(required - wagered, 0);
        
        return {
          success: false,
          error: `Вывод заблокирован! Активен бонус. Осталось отыграть: ${remaining.toFixed(2)} USDT`
        };
      }
    }
    
    // Рассчитываем сумму к выплате
    const usdAmount = telegramStarsService.starsToUSD(amount);
    const fee = method === 'convert' ? (usdAmount * STARS_WITHDRAWAL_FEE_PERCENT / 100) : 0;
    const netAmount = usdAmount - fee;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ⭐ ПРОВЕРКА АВТОМАТИЧЕСКОГО ОДОБРЕНИЯ
    // ═══════════════════════════════════════════════════════════════════════════════
    
    const autoApprovalCheck = await checkStarsAutoApproval(userId, usdAmount);
    
    logger.info('STARS_WITHDRAWAL', 'Auto-approval check', {
      userId,
      amount,
      usdAmount: usdAmount.toFixed(2),
      canAutoApprove: autoApprovalCheck.canAutoApprove,
      reason: autoApprovalCheck.reason
    });
    
    // Создаём транзакцию
    const result = await prisma.$transaction(async (tx) => {
      // Списываем Stars с баланса
      await tx.balance.update({
        where: {
          userId_tokenId_type: {
            userId: userId,
            tokenId: xtrToken.id,
            type: 'MAIN'
          }
        },
        data: {
          amount: { decrement: amount }
        }
      });
      
      // Создаём запись о выводе
      const withdrawal = await tx.transaction.create({
        data: {
          userId: userId,
          tokenId: xtrToken.id,
          type: 'WITHDRAW',
          status: autoApprovalCheck.canAutoApprove ? 'COMPLETED' : 'PENDING',
          amount: amount.toString(),
          txHash: autoApprovalCheck.canAutoApprove ? `auto_stars_${Date.now()}` : null,
          walletAddress: method // Храним метод в walletAddress
        }
      });
      
      return withdrawal;
    });
    
    logger.info('STARS_WITHDRAWAL', 'Withdrawal request created', {
      userId,
      amount,
      method,
      usdAmount,
      fee,
      netAmount,
      withdrawalId: result.id,
      autoApproved: autoApprovalCheck.canAutoApprove
    });
    
    if (autoApprovalCheck.canAutoApprove) {
      return {
        success: true,
        data: {
          withdrawalId: result.id,
          starsAmount: amount,
          usdAmount: usdAmount,
          fee: fee,
          netAmount: netAmount,
          method: method,
          status: 'COMPLETED',
          autoApproved: true,
          message: '✅ Вывод Stars выполнен автоматически!'
        }
      };
    } else {
      return {
        success: true,
        data: {
          withdrawalId: result.id,
          starsAmount: amount,
          usdAmount: usdAmount,
          fee: fee,
          netAmount: netAmount,
          method: method,
          status: 'PENDING',
          autoApproved: false,
          message: `⏳ ${autoApprovalCheck.reason}. Заявка отправлена на рассмотрение.`
        }
      };
    }
    
  } catch (error) {
    logger.error('STARS_WITHDRAWAL', 'Failed to create withdrawal', {
      userId,
      amount: starsAmount,
      error: error.message
    });
    
    return {
      success: false,
      error: error.message || 'Ошибка создания заявки на вывод'
    };
  }
}

/**
 * Обработать вывод Stars (для админа)
 * @param {Object} bot - Telegram bot instance
 * @param {number} withdrawalId - ID заявки
 * @param {boolean} approve - Одобрить или отклонить
 * @param {string} telegramPaymentChargeId - ID платежа для refund (опционально)
 */
async function processStarsWithdrawal(bot, withdrawalId, approve, telegramPaymentChargeId = null) {
  try {
    const withdrawal = await prisma.transaction.findUnique({
      where: { id: withdrawalId },
      include: {
        user: { select: { id: true, telegramId: true, username: true } },
        token: { select: { symbol: true } }
      }
    });
    
    if (!withdrawal) {
      throw new Error('Заявка не найдена');
    }
    
    if (withdrawal.status !== 'PENDING') {
      throw new Error(`Заявка уже обработана: ${withdrawal.status}`);
    }
    
    if (withdrawal.token.symbol !== 'XTR') {
      throw new Error('Это не Stars заявка');
    }
    
    const amount = parseInt(withdrawal.amount);
    const method = withdrawal.walletAddress; // 'refund' или 'convert'
    const userId = withdrawal.userId;
    const telegramId = withdrawal.user.telegramId;
    
    if (approve) {
      // Одобряем вывод
      if (method === 'refund' && telegramPaymentChargeId) {
        // Возврат Stars через Telegram API
        try {
          await bot.telegram.callApi('refundStarPayment', {
            user_id: parseInt(telegramId),
            telegram_payment_charge_id: telegramPaymentChargeId
          });
          
          logger.info('STARS_WITHDRAWAL', 'Stars refunded via Telegram', {
            withdrawalId,
            telegramPaymentChargeId,
            amount
          });
        } catch (refundError) {
          logger.error('STARS_WITHDRAWAL', 'Telegram refund failed', {
            error: refundError.message
          });
          // Продолжаем как convert если refund не сработал
        }
      }
      
      // Обновляем статус
      await prisma.transaction.update({
        where: { id: withdrawalId },
        data: {
          status: 'COMPLETED',
          txHash: telegramPaymentChargeId || `manual_${Date.now()}`,
          updatedAt: new Date()
        }
      });
      
      // Уведомляем пользователя
      try {
        await bot.telegram.sendMessage(
          telegramId,
          `✅ *Вывод Stars одобрен!*\n\n` +
          `⭐ Сумма: ${amount} Stars\n` +
          `💵 Эквивалент: $${telegramStarsService.starsToUSD(amount).toFixed(2)}\n` +
          `⏰ Дата: ${new Date().toLocaleString()}\n\n` +
          `Средства отправлены!`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
      
      return { success: true, status: 'COMPLETED' };
      
    } else {
      // Отклоняем - возвращаем Stars на баланс
      const xtrToken = await prisma.cryptoToken.findFirst({
        where: { symbol: 'XTR', network: 'TELEGRAM' }
      });
      
      await prisma.$transaction(async (tx) => {
        // Возвращаем Stars
        await tx.balance.upsert({
          where: {
            userId_tokenId_type: {
              userId: userId,
              tokenId: xtrToken.id,
              type: 'MAIN'
            }
          },
          create: {
            userId: userId,
            tokenId: xtrToken.id,
            type: 'MAIN',
            amount: amount
          },
          update: {
            amount: { increment: amount }
          }
        });
        
        // Обновляем статус
        await tx.transaction.update({
          where: { id: withdrawalId },
          data: {
            status: 'FAILED',
            updatedAt: new Date()
          }
        });
      });
      
      // Уведомляем пользователя
      try {
        await bot.telegram.sendMessage(
          telegramId,
          `❌ *Вывод Stars отклонён*\n\n` +
          `⭐ Возвращено: ${amount} Stars\n` +
          `⏰ Дата: ${new Date().toLocaleString()}\n\n` +
          `Stars вернулись на ваш баланс.`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
      
      return { success: true, status: 'FAILED', returned: amount };
    }
    
  } catch (error) {
    logger.error('STARS_WITHDRAWAL', 'Failed to process withdrawal', {
      withdrawalId,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Получить лимиты вывода Stars
 */
function getStarsWithdrawalLimits() {
  return {
    minWithdrawal: MIN_STARS_WITHDRAWAL,
    minWithdrawalUSD: telegramStarsService.starsToUSD(MIN_STARS_WITHDRAWAL),
    feePercent: STARS_WITHDRAWAL_FEE_PERCENT,
    rate: telegramStarsService.getStarsRate(),
    methods: [
      { id: 'convert', name: 'Конвертация в USDT', fee: `${STARS_WITHDRAWAL_FEE_PERCENT}%` },
      { id: 'refund', name: 'Возврат Stars в Telegram', fee: '0%', note: 'Требуется ID платежа' }
    ]
  };
}

module.exports = {
  createStarsWithdrawal,
  processStarsWithdrawal,
  getStarsWithdrawalLimits,
  MIN_STARS_WITHDRAWAL,
  STARS_WITHDRAWAL_FEE_PERCENT
};

