/**
 * 💎 CryptoPayService - Пополнение через Telegram Wallet (@CryptoBot)
 * 
 * API: https://help.crypt.bot/crypto-pay-api
 * Base URL: https://pay.crypt.bot/api/
 * 
 * Поддерживаемые валюты: USDT, TON, BTC, ETH, LTC, BNB, TRX, USDC
 */

const axios = require('axios');
const crypto = require('crypto');
const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const referralService = require('./ReferralService');
const { convertCryptoToUSD } = require('./currencySyncService');

const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;

// Валюты, поддерживаемые Crypto Pay для инвойсов
const SUPPORTED_ASSETS = ['USDT', 'TON', 'BTC', 'ETH', 'LTC', 'BNB', 'TRX', 'USDC'];

class CryptoPayService {
  constructor() {
    this.api = axios.create({
      baseURL: CRYPTO_PAY_API,
      timeout: 30000,
      headers: {
        'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    logger.info('CRYPTO_PAY', 'Service initialized', {
      hasToken: !!CRYPTO_PAY_TOKEN,
      supportedAssets: SUPPORTED_ASSETS,
    });
  }

  /**
   * Проверить доступность сервиса
   */
  isAvailable() {
    return !!CRYPTO_PAY_TOKEN;
  }

  /**
   * Получить список поддерживаемых валют
   */
  getSupportedAssets() {
    return SUPPORTED_ASSETS;
  }

  /**
   * Проверить, поддерживается ли валюта
   */
  isAssetSupported(symbol) {
    return SUPPORTED_ASSETS.includes(symbol.toUpperCase());
  }

  /**
   * Получить информацию о приложении / балансы
   */
  async getMe() {
    try {
      const response = await this.api.get('/getMe');
      return response.data?.result || null;
    } catch (error) {
      logger.error('CRYPTO_PAY', 'getMe failed', { error: error.message });
      return null;
    }
  }

  /**
   * Создать инвойс для пополнения через Telegram Wallet
   * 
   * @param {number} userId - ID пользователя в БД
   * @param {number} amount - Сумма в крипте
   * @param {string} asset - Валюта (USDT, TON, BTC, etc.)
   * @param {boolean} withBonus - С бонусом
   * @param {string|null} promoCode - Промокод
   * @returns {Object} Данные инвойса
   */
  async createInvoice(userId, amount, asset, withBonus = false, promoCode = null) {
    const upperAsset = asset.toUpperCase();

    if (!this.isAssetSupported(upperAsset)) {
      throw new Error(`Валюта ${asset} не поддерживается для оплаты через Telegram Wallet`);
    }

    if (!CRYPTO_PAY_TOKEN) {
      throw new Error('Crypto Pay не настроен');
    }

    // Генерируем уникальный payload для отслеживания
    const invoiceId = `WPAY-${userId}-${Date.now()}`;
    const payload = JSON.stringify({
      invoiceId,
      userId,
      amount,
      asset: upperAsset,
      withBonus,
      promoCode: promoCode || null,
    });

    logger.info('CRYPTO_PAY', 'Creating invoice', {
      userId,
      amount,
      asset: upperAsset,
      withBonus,
      promoCode: !!promoCode,
    });

    try {
      // Создаём инвойс через Crypto Pay API
      const response = await this.api.post('/createInvoice', {
        currency_type: 'crypto',
        asset: upperAsset,
        amount: String(amount),
        description: `Пополнение баланса: ${amount} ${upperAsset}`,
        paid_btn_name: 'callback',
        paid_btn_url: process.env.FRONTEND_URL || 'https://t.me',
        payload: payload,
        allow_comments: false,
        allow_anonymous: true,
        expires_in: 3600, // 1 час
      });

      if (!response.data?.ok) {
        throw new Error(response.data?.error?.message || 'Failed to create Crypto Pay invoice');
      }

      const invoice = response.data.result;

      // Сохраняем в PendingDeposit
      await prisma.pendingDeposit.create({
        data: {
          userId,
          invoiceId: invoiceId,
          amount: parseFloat(amount),
          asset: upperAsset,
          network: 'CRYPTO_PAY',
          status: 'pending',
          withBonus,
          promoCode: promoCode || null,
          createdAt: new Date(),
        },
      });

      // Рассчитываем примерную сумму в USD
      let amountUSD = parseFloat(amount);
      try {
        amountUSD = await convertCryptoToUSD(upperAsset, parseFloat(amount));
      } catch (e) {
        // fallback
      }

      logger.info('CRYPTO_PAY', 'Invoice created successfully', {
        userId,
        invoiceId,
        cryptoPayInvoiceId: invoice.invoice_id,
        payUrl: invoice.pay_url,
        asset: upperAsset,
        amount,
      });

      return {
        invoiceId,
        cryptoPayInvoiceId: invoice.invoice_id,
        hash: invoice.hash,
        payUrl: invoice.pay_url,
        botInvoiceUrl: invoice.bot_invoice_url,
        miniAppInvoiceUrl: invoice.mini_app_invoice_url,
        webAppInvoiceUrl: invoice.web_app_invoice_url,
        amount: parseFloat(amount),
        amountUSD,
        asset: upperAsset,
        status: invoice.status,
        expirationDate: invoice.expiration_date,
        withBonus,
        promoCode: promoCode || null,
      };
    } catch (error) {
      logger.error('CRYPTO_PAY', 'Failed to create invoice', {
        userId,
        amount,
        asset: upperAsset,
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(error.response?.data?.error?.message || error.message || 'Ошибка создания платежа');
    }
  }

  /**
   * Обработать webhook от Crypto Pay
   * 
   * @param {Object} body - Тело запроса
   * @param {string} signature - Подпись из заголовка crypto-pay-api-signature
   * @returns {Object} Результат обработки
   */
  async handleWebhook(body, signature) {
    // Верификация подписи
    if (!this.verifyWebhookSignature(body, signature)) {
      logger.warn('CRYPTO_PAY', 'Invalid webhook signature');
      return { processed: false, reason: 'Invalid signature' };
    }

    const updateType = body.update_type;
    const payload = body.payload;

    logger.info('CRYPTO_PAY', 'Webhook received', {
      updateType,
      invoiceId: payload?.invoice_id,
      status: payload?.status,
      asset: payload?.asset,
      amount: payload?.amount,
    });

    if (updateType !== 'invoice_paid') {
      return { processed: false, reason: `Unsupported update type: ${updateType}` };
    }

    // Обрабатываем оплаченный инвойс
    return await this.processPayment(payload);
  }

  /**
   * Верифицировать подпись webhook
   */
  verifyWebhookSignature(body, signature) {
    if (!signature || !CRYPTO_PAY_TOKEN) return false;

    try {
      const secret = crypto.createHash('sha256').update(CRYPTO_PAY_TOKEN).digest();
      const checkString = JSON.stringify(body);
      const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
      return hmac === signature;
    } catch (error) {
      logger.error('CRYPTO_PAY', 'Signature verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Обработать успешный платёж
   */
  async processPayment(invoiceData) {
    try {
      // Парсим payload
      let payloadData;
      try {
        payloadData = JSON.parse(invoiceData.payload);
      } catch {
        logger.error('CRYPTO_PAY', 'Failed to parse invoice payload', { payload: invoiceData.payload });
        return { processed: false, reason: 'Invalid payload' };
      }

      const { invoiceId, userId, asset, withBonus, promoCode } = payloadData;
      const amount = parseFloat(invoiceData.amount);

      logger.info('CRYPTO_PAY', 'Processing payment', {
        invoiceId,
        userId,
        amount,
        asset,
        withBonus,
        promoCode: !!promoCode,
      });

      // Проверяем, не обработан ли уже
      const pendingDeposit = await prisma.pendingDeposit.findUnique({
        where: { invoiceId },
      });

      if (!pendingDeposit) {
        logger.warn('CRYPTO_PAY', 'Pending deposit not found', { invoiceId });
        return { processed: false, reason: 'Deposit not found' };
      }

      if (pendingDeposit.status === 'completed') {
        logger.info('CRYPTO_PAY', 'Deposit already completed', { invoiceId });
        return { processed: false, reason: 'Already completed' };
      }

      // Получаем токен из БД
      const token = await prisma.cryptoToken.findFirst({
        where: { symbol: asset.toUpperCase() },
      });

      if (!token) {
        logger.error('CRYPTO_PAY', 'Token not found', { asset });
        return { processed: false, reason: 'Token not found' };
      }

      // Конвертируем в USD
      let amountUSD = amount;
      try {
        amountUSD = await convertCryptoToUSD(asset, amount);
      } catch (e) {
        logger.warn('CRYPTO_PAY', 'Failed to convert to USD', { error: e.message });
      }

      // Выполняем транзакцию зачисления
      const result = await prisma.$transaction(async (tx) => {
        // Обновляем статус
        await tx.pendingDeposit.update({
          where: { invoiceId },
          data: { status: 'completed' },
        });

        // Создаём транзакцию
        const transaction = await tx.transaction.create({
          data: {
            userId,
            tokenId: token.id,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            amount,
            txHash: `cpay_${invoiceData.invoice_id}_${invoiceData.hash}`,
            createdAt: new Date(),
          },
        });

        // Зачисляем на баланс
        const balance = await tx.balance.upsert({
          where: {
            userId_tokenId_type: {
              userId,
              tokenId: token.id,
              type: 'MAIN',
            },
          },
          create: {
            userId,
            tokenId: token.id,
            type: 'MAIN',
            amount,
          },
          update: {
            amount: { increment: amount },
          },
        });

        return {
          transactionId: transaction.id,
          balance: parseFloat(balance.amount.toString()),
        };
      });

      logger.info('CRYPTO_PAY', 'Payment processed successfully', {
        userId,
        invoiceId,
        amount,
        asset,
        transactionId: result.transactionId,
        newBalance: result.balance,
      });

      // Обрабатываем промокод-бонус
      if (promoCode) {
        try {
          await this._applyPromoBonus(userId, amountUSD, token.id, promoCode);
        } catch (e) {
          logger.error('CRYPTO_PAY', 'Failed to apply promo bonus', { error: e.message });
        }
      } else if (withBonus) {
        // Реферальный бонус
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { referredById: true },
          });
          if (user?.referredById) {
            await referralService.grantDepositBonus(userId, amountUSD, token.id, user.referredById);
          }
        } catch (e) {
          logger.error('CRYPTO_PAY', 'Failed to apply referral bonus', { error: e.message });
        }
      }

      // Уведомляем пользователя через бота
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { telegramId: true },
        });
        if (user?.telegramId) {
          const { botInstance } = require('../bots/telegramBot');
          if (botInstance) {
            await botInstance.telegram.sendMessage(
              user.telegramId,
              `✅ Пополнение успешно!\n\n` +
              `💰 Сумма: ${amount} ${asset}\n` +
              `💵 (~$${amountUSD.toFixed(2)})\n` +
              `📱 Метод: Telegram Wallet\n\n` +
              `Баланс обновлён!`
            );
          }
        }
      } catch (e) {
        logger.warn('CRYPTO_PAY', 'Failed to notify user', { error: e.message });
      }

      return { processed: true, transactionId: result.transactionId };
    } catch (error) {
      logger.error('CRYPTO_PAY', 'Failed to process payment', {
        error: error.message,
        stack: error.stack,
      });
      return { processed: false, reason: error.message };
    }
  }

  /**
   * Применить промо-бонус
   */
  async _applyPromoBonus(userId, amountUSD, tokenId, promoCode) {
    const code = promoCode.toUpperCase().trim();
    const promo = await prisma.bonusTemplate.findUnique({ where: { code } });
    if (!promo || !promo.isActive) return;
    if (promo.isFreebet) return; // Фрибеты не применяются при депозите

    const bonusAmount = amountUSD * (promo.percentage / 100);
    const wager = bonusAmount * (promo.wagerMultiplier || 1);

    await prisma.$transaction(async (tx) => {
      // Создаём UserBonus
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

      // Зачисляем бонус на бонусный баланс
      const token = await tx.cryptoToken.findFirst({ where: { symbol: 'USDT' } });
      if (token) {
        await tx.balance.upsert({
          where: {
            userId_tokenId_type: { userId, tokenId: token.id, type: 'BONUS' },
          },
          create: {
            userId,
            tokenId: token.id,
            type: 'BONUS',
            amount: bonusAmount,
          },
          update: {
            amount: { increment: bonusAmount },
          },
        });
      }

      // Записываем использование промо
      await tx.promoUsage.create({
        data: { userId, bonusId: promo.id },
      });

      // Увеличиваем счётчик использований
      await tx.bonusTemplate.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      });
    });

    logger.info('CRYPTO_PAY', 'Promo bonus applied', {
      userId,
      promoCode: code,
      bonusAmount,
      wager,
    });
  }

  /**
   * Получить статус инвойса
   */
  async getInvoiceStatus(cryptoPayInvoiceId) {
    try {
      const response = await this.api.post('/getInvoices', {
        invoice_ids: String(cryptoPayInvoiceId),
      });
      if (response.data?.ok && response.data.result?.items?.length > 0) {
        return response.data.result.items[0];
      }
      return null;
    } catch (error) {
      logger.error('CRYPTO_PAY', 'Failed to get invoice status', { error: error.message });
      return null;
    }
  }
}

module.exports = new CryptoPayService();



