/**
 * ⭐ Сервис для работы с Telegram Stars (XTR)
 * 
 * Telegram Stars — внутренняя валюта Telegram для оплаты контента и сервисов.
 * 1 Star ≈ $0.02 (50 звёзд = $1)
 * 
 * API: https://core.telegram.org/bots/api#payments
 * 
 * ВАЖНО: Для работы со Stars нужен бот с включенными платежами
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');

// Курс Stars к USD (приблизительный, официальный курс Telegram ~$0.02/star)
const STARS_TO_USD_RATE = 0.02;

// Минимальная сумма пополнения в Stars
const MIN_STARS_DEPOSIT = 50; // = $1

// Максимальная сумма пополнения в Stars (ограничение Telegram)
const MAX_STARS_DEPOSIT = 10000; // = $200

/**
 * Получить курс Stars к USD
 */
function getStarsRate() {
  return STARS_TO_USD_RATE;
}

/**
 * Конвертировать Stars в USD
 * @param {number} stars - Количество звёзд
 * @returns {number} Сумма в USD
 */
function starsToUSD(stars) {
  return stars * STARS_TO_USD_RATE;
}

/**
 * Конвертировать USD в Stars
 * @param {number} usd - Сумма в USD
 * @returns {number} Количество звёзд
 */
function usdToStars(usd) {
  return Math.ceil(usd / STARS_TO_USD_RATE);
}

/**
 * Создать payload для инвойса Stars
 * @param {number} userId - ID пользователя
 * @param {number} amount - Количество Stars
 * @param {boolean} withBonus - С бонусом
 * @returns {string} JSON payload
 */
function createInvoicePayload(userId, amount, withBonus = false) {
  return JSON.stringify({
    type: 'deposit',
    userId: userId,
    amount: amount,
    withBonus: withBonus,
    timestamp: Date.now()
  });
}

/**
 * Распарсить payload инвойса
 * @param {string} payload - JSON payload
 * @returns {Object|null} Данные платежа
 */
function parseInvoicePayload(payload) {
  try {
    return JSON.parse(payload);
  } catch (error) {
    logger.error('TELEGRAM_STARS', 'Failed to parse invoice payload', {
      payload,
      error: error.message
    });
    return null;
  }
}

/**
 * Создать pending deposit для Stars платежа
 * @param {number} userId - ID пользователя
 * @param {number} starsAmount - Количество Stars
 * @param {boolean} withBonus - С бонусом
 * @returns {Promise<Object>} Pending deposit
 */
async function createPendingDeposit(userId, starsAmount, withBonus = false) {
  try {
    const invoiceId = `STARS-${userId}-${Date.now()}`;
    
    const pendingDeposit = await prisma.pendingDeposit.create({
      data: {
        userId: userId,
        invoiceId: invoiceId,
        amount: starsAmount,
        asset: 'XTR',
        network: 'TELEGRAM',
        status: 'pending',
        withBonus: withBonus,
        createdAt: new Date()
      }
    });
    
    logger.info('TELEGRAM_STARS', 'Created pending deposit for Stars', {
      userId,
      invoiceId,
      starsAmount,
      withBonus
    });
    
    return {
      invoiceId: pendingDeposit.invoiceId,
      amount: starsAmount,
      amountUSD: starsToUSD(starsAmount),
      withBonus
    };
  } catch (error) {
    logger.error('TELEGRAM_STARS', 'Failed to create pending deposit', {
      userId,
      starsAmount,
      error: error.message
    });
    throw error;
  }
}

/**
 * Обработать успешный платёж Stars
 * @param {Object} payment - Данные платежа от Telegram
 * @returns {Promise<Object>} Результат обработки
 */
async function processStarsPayment(payment) {
  const { userId, amount, invoiceId } = payment;
  
  logger.info('TELEGRAM_STARS', 'Processing Stars payment', {
    userId,
    amount,
    invoiceId
  });
  
  try {
    // Ищем pending deposit
    const pendingDeposit = await prisma.pendingDeposit.findFirst({
      where: {
        OR: [
          { invoiceId: invoiceId },
          {
            userId: userId,
            asset: 'XTR',
            status: 'pending',
            amount: amount
          }
        ]
      }
    });
    
    if (!pendingDeposit) {
      logger.warn('TELEGRAM_STARS', 'Pending deposit not found, creating new one', {
        userId,
        amount
      });
      
      // Создаём новый pending deposit если не найден
      await prisma.pendingDeposit.create({
        data: {
          userId: userId,
          invoiceId: invoiceId || `STARS-${userId}-${Date.now()}`,
          amount: amount,
          asset: 'XTR',
          network: 'TELEGRAM',
          status: 'pending',
          withBonus: false,
          createdAt: new Date()
        }
      });
    }
    
    // Получаем или создаём токен XTR
    let token = await prisma.cryptoToken.findFirst({
      where: {
        symbol: 'XTR',
        network: 'TELEGRAM'
      }
    });
    
    if (!token) {
      token = await prisma.cryptoToken.create({
        data: {
          symbol: 'XTR',
          name: 'Telegram Stars',
          network: 'TELEGRAM',
          decimals: 0
        }
      });
      logger.info('TELEGRAM_STARS', 'Created XTR token', { tokenId: token.id });
    }
    
    // Выполняем транзакцию зачисления
    const result = await prisma.$transaction(async (tx) => {
      // Обновляем статус pending deposit
      const depositId = pendingDeposit?.invoiceId || invoiceId;
      
      await tx.pendingDeposit.updateMany({
        where: {
          invoiceId: depositId,
          status: 'pending'
        },
        data: {
          status: 'processing'
        }
      });
      
      // Создаём транзакцию
      const transaction = await tx.transaction.create({
        data: {
          userId: userId,
          tokenId: token.id,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: amount,
          txHash: invoiceId || `stars_${Date.now()}`,
          createdAt: new Date()
        }
      });
      
      // Зачисляем на баланс
      const balance = await tx.balance.upsert({
        where: {
          userId_tokenId_type: {
            userId: userId,
            tokenId: token.id,
            type: 'MAIN'
          }
        },
        create: {
          userId: userId,
          tokenId: token.id,
          type: 'MAIN',
          amount: amount
        },
        update: {
          amount: {
            increment: amount
          }
        }
      });
      
      // Обновляем статус на completed
      await tx.pendingDeposit.updateMany({
        where: {
          invoiceId: depositId
        },
        data: {
          status: 'completed'
        }
      });
      
      return {
        transactionId: transaction.id,
        balance: parseFloat(balance.amount.toString())
      };
    });
    
    logger.info('TELEGRAM_STARS', 'Stars payment processed successfully', {
      userId,
      amount,
      transactionId: result.transactionId,
      newBalance: result.balance
    });
    
    // Обрабатываем бонус если был выбран
    if (pendingDeposit?.withBonus) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { referredById: true }
        });
        
        if (user?.referredById) {
          const referralService = require('./ReferralService');
          await referralService.grantDepositBonus(
            userId,
            starsToUSD(amount), // Конвертируем в USD для расчёта бонуса
            token.id,
            user.referredById
          );
          logger.info('TELEGRAM_STARS', 'Bonus granted for Stars deposit', {
            userId,
            bonusAmount: starsToUSD(amount)
          });
        }
      } catch (bonusError) {
        logger.error('TELEGRAM_STARS', 'Failed to grant bonus', {
          error: bonusError.message
        });
        // Не прерываем основную транзакцию
      }
    }
    
    return {
      success: true,
      transactionId: result.transactionId,
      balance: result.balance,
      amountStars: amount,
      amountUSD: starsToUSD(amount)
    };
    
  } catch (error) {
    logger.error('TELEGRAM_STARS', 'Failed to process Stars payment', {
      userId,
      amount,
      error: error.message,
      stack: error.stack
    });
    
    // Обновляем статус на failed
    if (invoiceId) {
      await prisma.pendingDeposit.updateMany({
        where: { invoiceId },
        data: { status: 'failed' }
      }).catch(e => {
        logger.warn('TELEGRAM_STARS', 'Failed to mark deposit as failed', {
          error: e.message
        });
      });
    }
    
    throw error;
  }
}

/**
 * Получить баланс Stars пользователя
 * @param {number} userId - ID пользователя
 * @returns {Promise<number>} Баланс в Stars
 */
async function getUserStarsBalance(userId) {
  try {
    const token = await prisma.cryptoToken.findFirst({
      where: {
        symbol: 'XTR',
        network: 'TELEGRAM'
      }
    });
    
    if (!token) return 0;
    
    const balance = await prisma.balance.findFirst({
      where: {
        userId: userId,
        tokenId: token.id,
        type: 'MAIN'
      }
    });
    
    return balance ? parseFloat(balance.amount.toString()) : 0;
  } catch (error) {
    logger.error('TELEGRAM_STARS', 'Failed to get user Stars balance', {
      userId,
      error: error.message
    });
    return 0;
  }
}

/**
 * Создать инвойс для Telegram Stars
 * Этот метод возвращает параметры для sendInvoice в боте
 * 
 * @param {number} userId - ID пользователя
 * @param {number} starsAmount - Количество Stars
 * @param {boolean} withBonus - С бонусом
 * @returns {Object} Параметры инвойса
 */
function createStarsInvoiceParams(userId, starsAmount, withBonus = false) {
  if (starsAmount < MIN_STARS_DEPOSIT) {
    throw new Error(`Минимальная сумма: ${MIN_STARS_DEPOSIT} Stars ($${starsToUSD(MIN_STARS_DEPOSIT)})`);
  }
  
  if (starsAmount > MAX_STARS_DEPOSIT) {
    throw new Error(`Максимальная сумма: ${MAX_STARS_DEPOSIT} Stars ($${starsToUSD(MAX_STARS_DEPOSIT)})`);
  }
  
  const usdAmount = starsToUSD(starsAmount);
  
  const description = withBonus 
    ? `Пополнение ${starsAmount} ⭐ Stars ($${usdAmount.toFixed(2)}) + БОНУС +100%`
    : `Пополнение ${starsAmount} ⭐ Stars ($${usdAmount.toFixed(2)})`;
  
  return {
    title: '⭐ Пополнение баланса Stars',
    description: description,
    payload: createInvoicePayload(userId, starsAmount, withBonus),
    currency: 'XTR', // Telegram Stars
    prices: [
      {
        label: `${starsAmount} Stars`,
        amount: starsAmount // В Stars amount = количество звёзд
      }
    ],
    // Важно для Mini Apps
    provider_token: '', // Пустой для Stars
    start_parameter: `deposit_${starsAmount}`,
    max_tip_amount: 0,
    suggested_tip_amounts: [],
    photo_url: null,
    photo_size: 0,
    photo_width: 0,
    photo_height: 0,
    need_name: false,
    need_phone_number: false,
    need_email: false,
    need_shipping_address: false,
    send_phone_number_to_provider: false,
    send_email_to_provider: false,
    is_flexible: false
  };
}

/**
 * Валидация пре-checkout запроса
 * @param {Object} preCheckoutQuery - Данные от Telegram
 * @returns {Object} Результат валидации
 */
function validatePreCheckout(preCheckoutQuery) {
  try {
    const payload = parseInvoicePayload(preCheckoutQuery.invoice_payload);
    
    if (!payload) {
      return {
        valid: false,
        error: 'Invalid invoice payload'
      };
    }
    
    if (payload.type !== 'deposit') {
      return {
        valid: false,
        error: 'Invalid payment type'
      };
    }
    
    // Проверяем что сумма совпадает
    if (preCheckoutQuery.total_amount !== payload.amount) {
      return {
        valid: false,
        error: 'Amount mismatch'
      };
    }
    
    return {
      valid: true,
      payload: payload
    };
    
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Лимиты для Stars
 */
function getStarsLimits() {
  return {
    minDeposit: MIN_STARS_DEPOSIT,
    maxDeposit: MAX_STARS_DEPOSIT,
    minDepositUSD: starsToUSD(MIN_STARS_DEPOSIT),
    maxDepositUSD: starsToUSD(MAX_STARS_DEPOSIT),
    rate: STARS_TO_USD_RATE
  };
}

module.exports = {
  getStarsRate,
  starsToUSD,
  usdToStars,
  createInvoicePayload,
  parseInvoicePayload,
  createPendingDeposit,
  processStarsPayment,
  getUserStarsBalance,
  createStarsInvoiceParams,
  validatePreCheckout,
  getStarsLimits,
  MIN_STARS_DEPOSIT,
  MAX_STARS_DEPOSIT,
  STARS_TO_USD_RATE
};










