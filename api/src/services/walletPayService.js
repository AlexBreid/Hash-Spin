/**
 * 💳 Wallet Pay Service — Оплата через ОФИЦИАЛЬНЫЙ кошелёк Telegram (@wallet)
 * 
 * API: https://pay.wallet.tg/wpay/store-api/v1/
 * Docs: https://docs.wallet.tg/pay/
 * 
 * Для получения ключа: https://pay.wallet.tg/ → создайте магазин
 * ENV: WALLET_PAY_STORE_API_KEY
 * 
 * Поддерживаемые валюты: TON, USDT, BTC (и другие, доступные в @wallet)
 */

const axios = require('axios');
const crypto = require('crypto');
const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const referralService = require('./ReferralService');
const { convertCryptoToUSD } = require('./currencySyncService');

const WALLET_PAY_API = 'https://pay.wallet.tg/wpay/store-api/v1';
const WALLET_PAY_API_KEY = process.env.WALLET_PAY_STORE_API_KEY;

// Валюты, которые поддерживает Wallet Pay (TON-based)
const SUPPORTED_CURRENCIES = ['TON', 'USDT', 'BTC'];

class WalletPayService {
  constructor() {
    this.api = axios.create({
      baseURL: WALLET_PAY_API,
      timeout: 30000,
      headers: {
        'Wpay-Store-Api-Key': WALLET_PAY_API_KEY || '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    logger.info('WALLET_PAY', 'Service initialized', {
      hasKey: !!WALLET_PAY_API_KEY,
      supportedCurrencies: SUPPORTED_CURRENCIES,
    });
  }

  /**
   * Сервис доступен, если задан ключ
   */
  isAvailable() {
    return !!WALLET_PAY_API_KEY;
  }

  /**
   * Список поддерживаемых валют
   */
  getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }

  /**
   * Поддерживается ли валюта
   */
  isCurrencySupported(symbol) {
    return SUPPORTED_CURRENCIES.includes(symbol.toUpperCase());
  }

  /**
   * Создать заказ (ордер) для пополнения через Telegram Wallet
   *
   * @param {number} userId        — ID пользователя в БД
   * @param {number} amount        — сумма в крипте
   * @param {string} asset         — валюта (TON, USDT, BTC)
   * @param {boolean} withBonus    — начислять бонус
   * @param {string|null} promoCode — промокод (если есть)
   * @param {string|null} telegramUserId — Telegram ID пользователя (для customerTelegramUserId)
   * @returns {Object} данные ордера
   */
  async createOrder(userId, amount, asset, withBonus = false, promoCode = null, telegramUserId = null) {
    const upper = asset.toUpperCase();

    if (!this.isCurrencySupported(upper)) {
      throw new Error(`${asset} не поддерживается в Telegram Wallet. Доступны: ${SUPPORTED_CURRENCIES.join(', ')}`);
    }
    if (!WALLET_PAY_API_KEY) {
      throw new Error('Wallet Pay не настроен (нет WALLET_PAY_STORE_API_KEY)');
    }

    const externalId = `WPAY-${userId}-${Date.now()}`;
    const frontendUrl = process.env.FRONTEND_URL || 'https://t.me';

    const customData = JSON.stringify({
      externalId,
      userId,
      amount,
      asset: upper,
      withBonus,
      promoCode: promoCode || null,
    });

    logger.info('WALLET_PAY', 'Creating order', { userId, amount, asset: upper, withBonus, promoCode: !!promoCode });

    try {
      const body = {
        amount: {
          currencyCode: upper,
          amount: String(amount),
        },
        description: `Пополнение баланса: ${amount} ${upper}`,
        returnUrl: `${frontendUrl}?deposit=success`,
        failReturnUrl: `${frontendUrl}?deposit=fail`,
        customData,
        externalId,
        timeoutSeconds: 10800, // 3 часа
      };

      // Если знаем Telegram ID — передаём для лучшего UX
      if (telegramUserId) {
        body.customerTelegramUserId = parseInt(telegramUserId, 10);
      }

      const response = await this.api.post('/order', body);

      if (response.data?.status !== 'SUCCESS') {
        throw new Error(response.data?.message || 'Wallet Pay: ошибка создания заказа');
      }

      const order = response.data.data;

      // Сохраняем pending deposit
      await prisma.pendingDeposit.create({
        data: {
          userId,
          invoiceId: externalId,
          amount: parseFloat(amount),
          asset: upper,
          network: 'WALLET_PAY',
          status: 'pending',
          withBonus,
          promoCode: promoCode || null,
          createdAt: new Date(),
        },
      });

      // Рассчитываем USD
      let amountUSD = parseFloat(amount);
      try { amountUSD = await convertCryptoToUSD(upper, parseFloat(amount)); } catch (_) { /* fallback */ }

      logger.info('WALLET_PAY', 'Order created', {
        userId,
        externalId,
        orderId: order.id,
        payLink: order.payLink,
        directPayLink: order.directPayLink,
      });

      return {
        invoiceId: externalId,
        walletOrderId: order.id,
        orderNumber: order.number,
        payLink: order.payLink,
        directPayLink: order.directPayLink,
        amount: parseFloat(amount),
        amountUSD,
        asset: upper,
        status: order.status,
        expiresAt: order.expirationDateTime,
        withBonus,
        promoCode: promoCode || null,
      };
    } catch (error) {
      logger.error('WALLET_PAY', 'Failed to create order', {
        userId, amount, asset: upper,
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(
        error.response?.data?.message || error.message || 'Ошибка создания заказа в Telegram Wallet'
      );
    }
  }

  // ═══════════════════════════════════════════════
  // WEBHOOK
  // ═══════════════════════════════════════════════

  /**
   * Обработать webhook от Wallet Pay
   *
   * Wallet Pay присылает:
   * - Header  Walletpay-Timestamp
   * - Header  Walletpay-Signature  (base64 HMAC-SHA-256)
   * - Body    JSON с полями type, eventId, payload
   *
   * type === "ORDER_PAID" → ордер оплачен
   */
  async handleWebhook(body, timestamp, signature, method = 'POST', uri = '/') {
    // Верификация подписи
    if (!this.verifySignature(body, timestamp, signature, method, uri)) {
      logger.warn('WALLET_PAY', 'Invalid webhook signature');
      return { processed: false, reason: 'Invalid signature' };
    }

    const eventType = body.type;

    logger.info('WALLET_PAY', 'Webhook received', {
      type: eventType,
      eventId: body.eventId,
      orderId: body.payload?.id,
    });

    if (eventType === 'ORDER_PAID') {
      return await this._processPayment(body.payload);
    }

    // ORDER_FAILED и другие
    if (eventType === 'ORDER_FAILED') {
      return await this._handleFailed(body.payload);
    }

    return { processed: false, reason: `Unknown event type: ${eventType}` };
  }

  /**
   * Верификация подписи webhook
   *
   * signature = base64( HMAC-SHA-256( key, "{method}.{uri}.{timestamp}.{base64Body}" ) )
   */
  verifySignature(body, timestamp, signature, method = 'POST', uri = '/') {
    if (!signature || !timestamp || !WALLET_PAY_API_KEY) return false;
    try {
      const bodyBase64 = Buffer.from(JSON.stringify(body)).toString('base64');
      const message = `${method}.${uri}.${timestamp}.${bodyBase64}`;
      const hmac = crypto
        .createHmac('sha256', WALLET_PAY_API_KEY)
        .update(message)
        .digest('base64');
      return hmac === signature;
    } catch (e) {
      logger.error('WALLET_PAY', 'Signature verification error', { error: e.message });
      return false;
    }
  }

  /**
   * Обработка успешной оплаты
   */
  async _processPayment(payload) {
    try {
      const externalId = payload.externalId;
      let customData;
      try { customData = JSON.parse(payload.customData); } catch { customData = {}; }

      const { userId, asset, withBonus, promoCode } = customData;
      // Берём реальную оплаченную сумму
      const paidAmount = parseFloat(
        payload.selectedPaymentOption?.amountNet?.amount
        || payload.orderAmount?.amount
        || customData.amount
      );
      const paidCurrency = (
        payload.selectedPaymentOption?.amountNet?.currencyCode
        || payload.orderAmount?.currencyCode
        || asset
      ).toUpperCase();

      logger.info('WALLET_PAY', 'Processing payment', {
        externalId, userId, paidAmount, paidCurrency, withBonus, promoCode: !!promoCode,
      });

      // Проверяем pending deposit
      const pending = await prisma.pendingDeposit.findUnique({ where: { invoiceId: externalId } });
      if (!pending) {
        logger.warn('WALLET_PAY', 'Pending deposit not found', { externalId });
        return { processed: false, reason: 'Deposit not found' };
      }
      if (pending.status === 'completed') {
        return { processed: false, reason: 'Already completed' };
      }

      // Находим токен
      const token = await prisma.cryptoToken.findFirst({ where: { symbol: paidCurrency } });
      if (!token) {
        logger.error('WALLET_PAY', 'Token not found', { paidCurrency });
        return { processed: false, reason: 'Token not found' };
      }

      let amountUSD = paidAmount;
      try { amountUSD = await convertCryptoToUSD(paidCurrency, paidAmount); } catch (_) { /* fallback */ }

      // Транзакция зачисления
      const result = await prisma.$transaction(async (tx) => {
        await tx.pendingDeposit.update({
          where: { invoiceId: externalId },
          data: { status: 'completed' },
        });

        const transaction = await tx.transaction.create({
          data: {
            userId,
            tokenId: token.id,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            amount: paidAmount,
            txHash: `wpay_${payload.id}_${payload.number || ''}`,
            createdAt: new Date(),
          },
        });

        const balance = await tx.balance.upsert({
          where: { userId_tokenId_type: { userId, tokenId: token.id, type: 'MAIN' } },
          create: { userId, tokenId: token.id, type: 'MAIN', amount: paidAmount },
          update: { amount: { increment: paidAmount } },
        });

        return { transactionId: transaction.id, balance: parseFloat(balance.amount.toString()) };
      });

      logger.info('WALLET_PAY', 'Payment processed', {
        userId, externalId, paidAmount, paidCurrency,
        transactionId: result.transactionId, newBalance: result.balance,
      });

      // Бонусы
      if (promoCode) {
        try { await this._applyPromoBonus(userId, amountUSD, token.id, promoCode); } catch (e) {
          logger.error('WALLET_PAY', 'Promo bonus error', { error: e.message });
        }
      } else if (withBonus) {
        try {
          const user = await prisma.user.findUnique({ where: { id: userId }, select: { referredById: true } });
          if (user?.referredById) {
            await referralService.grantDepositBonus(userId, amountUSD, token.id, user.referredById);
          }
        } catch (e) {
          logger.error('WALLET_PAY', 'Referral bonus error', { error: e.message });
        }
      }

      // Уведомление пользователю
      try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
        if (user?.telegramId) {
          const { botInstance } = require('../bots/telegramBot');
          if (botInstance) {
            await botInstance.telegram.sendMessage(
              user.telegramId,
              `✅ Пополнение через Telegram Wallet!\n\n` +
              `💰 Сумма: ${paidAmount} ${paidCurrency}\n` +
              `💵 (~$${amountUSD.toFixed(2)})\n\n` +
              `Баланс обновлён!`
            );
          }
        }
      } catch (e) {
        logger.warn('WALLET_PAY', 'Failed to notify user', { error: e.message });
      }

      return { processed: true, transactionId: result.transactionId };
    } catch (error) {
      logger.error('WALLET_PAY', 'Payment processing failed', { error: error.message, stack: error.stack });
      return { processed: false, reason: error.message };
    }
  }

  /**
   * Обработать неудачный платёж
   */
  async _handleFailed(payload) {
    try {
      const externalId = payload.externalId;
      await prisma.pendingDeposit.updateMany({
        where: { invoiceId: externalId, status: 'pending' },
        data: { status: 'failed' },
      });
      logger.info('WALLET_PAY', 'Order marked as failed', { externalId });
      return { processed: true, reason: 'Order failed' };
    } catch (e) {
      return { processed: false, reason: e.message };
    }
  }

  /**
   * Применить промо-бонус (копия из cryptoPayService)
   */
  async _applyPromoBonus(userId, amountUSD, tokenId, promoCode) {
    const code = promoCode.toUpperCase().trim();
    const promo = await prisma.bonusTemplate.findUnique({ where: { code } });
    if (!promo || !promo.isActive) return;
    if (promo.isFreebet) return; // Фрибеты не применяются при депозите

    const bonusAmount = amountUSD * (promo.percentage / 100);
    const wager = bonusAmount * (promo.wagerMultiplier || 1);

    await prisma.$transaction(async (tx) => {
      await tx.userBonus.create({
        data: {
          userId,
          bonusTemplateId: promo.id,
          bonusAmount,
          currency: 'USD',
          wagerRequired: wager,
          wagerProgress: 0,
          isActive: true,
          isCompleted: false,
          activatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const usdtToken = await tx.cryptoToken.findFirst({ where: { symbol: 'USDT' } });
      if (usdtToken) {
        await tx.balance.upsert({
          where: { userId_tokenId_type: { userId, tokenId: usdtToken.id, type: 'BONUS' } },
          create: { userId, tokenId: usdtToken.id, type: 'BONUS', amount: bonusAmount },
          update: { amount: { increment: bonusAmount } },
        });
      }

      await tx.promoUsage.create({ data: { userId, bonusId: promo.id } });
      await tx.bonusTemplate.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
    });

    logger.info('WALLET_PAY', 'Promo bonus applied', { userId, promoCode: code, bonusAmount, wager });
  }

  /**
   * Получить статус заказа
   */
  async getOrderPreview(orderId) {
    try {
      const response = await this.api.get('/order/preview', { params: { id: orderId } });
      return response.data?.data || null;
    } catch (e) {
      logger.error('WALLET_PAY', 'Failed to get order preview', { error: e.message });
      return null;
    }
  }
}

module.exports = new WalletPayService();



