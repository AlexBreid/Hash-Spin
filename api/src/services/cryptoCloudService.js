/**
 * CryptoCloud Service
 * Сервис для работы с CryptoCloud API v2
 */

const axios = require('axios');
const crypto = require('crypto');
const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const referralService = require('./ReferralService');

// Конфигурация CryptoCloud
const CRYPTO_CLOUD_API_URL = 'https://api.cryptocloud.plus/v2';
const CRYPTO_CLOUD_API_KEY = process.env.CRYPTO_CLOUD_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1dWlkIjoiT0RNNE5UTT0iLCJ0eXBlIjoicHJvamVjdCIsInYiOiI0YmNmNGYxMmNhNzMyNGVjMzYyNWMwZjM1YjgxZTAyN2NkZThhNGE0MTRlMzUzMWIwYzE0NjI1MWMwOWM1MTVmIiwiZXhwIjo4ODE2Njc4MzM5N30.DvyMDzdRWNEgm8GtEOMaWT5njtiw6nAiUpUO_S6P0jo';
const CRYPTO_CLOUD_SHOP_ID = process.env.CRYPTO_CLOUD_SHOP_ID || '6cIUewIuaGohxks5';
const CRYPTO_CLOUD_SECRET = process.env.CRYPTO_CLOUD_SECRET || 'hyVRuoPkQIThAaRiqN784I4Dqhz3gg8Bnl3g';

class CryptoCloudService {
  constructor() {
    // Создаем axios instance с базовыми настройками
    this.api = axios.create({
      baseURL: CRYPTO_CLOUD_API_URL,
      timeout: 30000,
      headers: {
        'Authorization': `Token ${CRYPTO_CLOUD_API_KEY}`,  // ВАЖНО: Token, не Bearer!
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Создать счет на оплату
   * @param {number} amount - Сумма в USD (или другой фиатной валюте)
   * @param {number} userId - ID пользователя
   * @param {boolean} withBonus - Использовать ли бонус
   * @param {string} fiatCurrency - Фиатная валюта (по умолчанию USD)
   * @returns {Promise<Object>} Данные счета
   */
  async createInvoice(amount, userId, withBonus = false, fiatCurrency = 'USD') {
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount');
      }

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        throw new Error('Invalid userId');
      }

      // Создаем уникальный ID заказа
      const orderId = `DEPOSIT-${userIdNum}-${Date.now()}`;

      // Формируем данные для создания счета (API v2)
      // ВАЖНО: currency - это ФИАТНАЯ валюта (USD, EUR, RUB и т.д.)
      // Пользователь сам выбирает крипту на странице оплаты
      const invoiceData = {
        shop_id: CRYPTO_CLOUD_SHOP_ID,
        amount: amountNum,  // Сумма как число, не строка
        currency: fiatCurrency.toUpperCase(),  // USD, EUR, RUB и т.д.
        order_id: orderId
      };

      logger.info('CRYPTOCLOUD', 'Creating invoice', { 
        userId: userIdNum, 
        amount: amountNum, 
        currency: fiatCurrency,
        withBonus,
        orderId
      });

      // Отправляем запрос
      const response = await this.api.post('/invoice/create', invoiceData);

      logger.info('CRYPTOCLOUD', 'Response received', {
        status: response.status,
        data: response.data
      });

      if (!response.data) {
        throw new Error('Empty response from CryptoCloud');
      }

      if (response.data.status === 'error') {
        const errorMsg = response.data.result?.message || 
                        response.data.result?.currency ||
                        JSON.stringify(response.data.result) || 
                        'Error from CryptoCloud';
        throw new Error(errorMsg);
      }

      const invoice = response.data.result;

      if (!invoice?.uuid) {
        logger.error('CRYPTOCLOUD', 'Invalid response structure', { data: response.data });
        throw new Error('Invalid response from CryptoCloud: missing uuid');
      }

      // Сохраняем информацию о депозите в БД
      // Сохраняем как USDT т.к. это наш внутренний токен
      await prisma.pendingDeposit.create({
        data: {
          userId: userIdNum,
          invoiceId: invoice.uuid,  // CryptoCloud v2 использует uuid
          amount: amountNum,
          asset: 'USDT',  // Внутренняя валюта казино
          status: 'pending',
          withBonus: withBonus
        }
      });

      logger.info('CRYPTOCLOUD', 'Invoice created', { 
        invoiceId: invoice.uuid, 
        userId: userIdNum,
        amount: amountNum,
        payUrl: invoice.link
      });

      return {
        invoiceId: invoice.uuid,
        status: invoice.status || 'created',
        payUrl: invoice.link,  // v2 использует link, не pay_url
        orderId: orderId,
        amount: amountNum,
        currency: 'USDT'  // Для клиента показываем как USDT
      };

    } catch (error) {
      // Детальное логирование ошибки
      if (error.response) {
        logger.error('CRYPTOCLOUD', 'API Error', { 
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          userId,
          amount 
        });
        
        // Выводим детали ошибки
        console.error('❌ CryptoCloud API Error:', JSON.stringify(error.response.data, null, 2));
      } else {
        logger.error('CRYPTOCLOUD', 'Error creating invoice', { 
          error: error.message,
          userId,
          amount 
        });
      }
      throw error;
    }
  }

  /**
   * Получить информацию о счете
   * @param {string} invoiceId - UUID счета
   * @returns {Promise<Object>} Информация о счете
   */
  async getInvoice(invoiceId) {
    try {
      const response = await this.api.post('/invoice/info', {
        uuids: [invoiceId]
      });

      if (!response.data?.result?.length) {
        return null;
      }

      return response.data.result[0];

    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error getting invoice', { 
        error: error.message,
        invoiceId 
      });
      return null;
    }
  }

  /**
   * Отменить счет
   * @param {string} invoiceId - UUID счета
   * @returns {Promise<boolean>} Успех операции
   */
  async cancelInvoice(invoiceId) {
    try {
      const response = await this.api.post('/invoice/cancel', {
        uuid: invoiceId
      });

      return response.data?.status === 'success';
    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error canceling invoice', { 
        error: error.message,
        invoiceId 
      });
      return false;
    }
  }

  /**
   * Проверить подпись webhook (JWT token)
   * @param {string} token - JWT токен из postback
   * @returns {boolean} Валидность токена
   */
  verifyWebhookToken(token) {
    try {
      // CryptoCloud отправляет JWT токен, подписанный секретным ключом проекта
      // Декодируем и проверяем
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Проверяем подпись
      const [header, payload, signature] = parts;
      const signatureCheck = crypto
        .createHmac('sha256', CRYPTO_CLOUD_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

      return signature === signatureCheck;
    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error verifying token', { error: error.message });
      return false;
    }
  }

  /**
   * Обработать webhook от CryptoCloud
   * @param {Object} webhookData - Данные webhook
   * @returns {Promise<Object>} Результат обработки
   */
  async handleWebhook(webhookData) {
    try {
      logger.info('CRYPTOCLOUD', 'Webhook received', webhookData);

      // Проверяем JWT токен если он есть
      if (webhookData.token && !this.verifyWebhookToken(webhookData.token)) {
        logger.warn('CRYPTOCLOUD', 'Invalid webhook token');
        // Продолжаем обработку, но логируем предупреждение
      }

      // CryptoCloud отправляет разные поля в зависимости от версии API
      const invoiceId = webhookData.invoice_id || webhookData.uuid;
      if (!invoiceId) {
        throw new Error('Missing invoice_id/uuid');
      }

      // Получаем информацию о депозите из БД
      const pendingDeposit = await prisma.pendingDeposit.findUnique({
        where: { invoiceId: invoiceId.toString() }
      });

      if (!pendingDeposit) {
        logger.warn('CRYPTOCLOUD', 'Pending deposit not found', { invoiceId });
        return { processed: false, reason: 'Deposit not found' };
      }

      // Проверяем статус
      if (pendingDeposit.status !== 'pending') {
        logger.info('CRYPTOCLOUD', 'Deposit already processed', { 
          invoiceId, 
          status: pendingDeposit.status 
        });
        return { processed: false, reason: 'Already processed' };
      }

      // Проверяем статус оплаты
      const invoiceStatus = webhookData.status;
      if (invoiceStatus !== 'success' && invoiceStatus !== 'paid') {
        logger.info('CRYPTOCLOUD', 'Invoice not paid', { invoiceId, status: invoiceStatus });
        return { processed: false, reason: 'Not paid' };
      }

      // Обрабатываем депозит
      const result = await this.processDeposit(
        pendingDeposit.userId,
        invoiceId,
        pendingDeposit.amount,
        pendingDeposit.asset,
        pendingDeposit.withBonus
      );

      return { processed: true, result };

    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error handling webhook', { 
        error: error.message,
        webhookData 
      });
      throw error;
    }
  }

  /**
   * Обработать депозит
   * @param {number} userId - ID пользователя
   * @param {string} invoiceId - ID счета
   * @param {number} amount - Сумма
   * @param {string} asset - Валюта
   * @param {boolean} withBonus - Использовать ли бонус
   * @returns {Promise<Object>} Результат обработки
   */
  async processDeposit(userId, invoiceId, amount, asset = 'USDT', withBonus = false) {
    try {
      const userIdNum = parseInt(userId);
      const amountNum = parseFloat(amount);
      const assetStr = String(asset).toUpperCase();

      logger.info('CRYPTOCLOUD', 'Processing deposit', { 
        userId: userIdNum, 
        invoiceId, 
        amount: amountNum, 
        asset: assetStr,
        withBonus 
      });

      // Получаем или создаем токен
      let token = await prisma.cryptoToken.findUnique({ 
        where: { symbol: assetStr } 
      });

      if (!token) {
        token = await prisma.cryptoToken.create({
          data: { 
            symbol: assetStr, 
            name: assetStr, 
            decimals: 8 
          }
        });
      }

      // Обрабатываем в транзакции
      const result = await prisma.$transaction(async (tx) => {
        // Проверяем, что депозит еще не обработан
        const freshRecord = await tx.pendingDeposit.findUnique({
          where: { invoiceId }
        });

        if (!freshRecord || freshRecord.status !== 'pending') {
          throw new Error('Deposit already processed or not found');
        }

        // Обновляем статус на processing
        await tx.pendingDeposit.update({
          where: { invoiceId },
          data: { status: 'processing' }
        });

        // Создаем транзакцию
        const transaction = await tx.transaction.create({
          data: {
            userId: userIdNum,
            tokenId: token.id,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            amount: amountNum.toFixed(8),
            txHash: invoiceId,
            createdAt: new Date()
          }
        });

        // Обновляем основной баланс
        await tx.balance.upsert({
          where: { 
            userId_tokenId_type: { 
              userId: userIdNum, 
              tokenId: token.id, 
              type: 'MAIN' 
            } 
          },
          create: { 
            userId: userIdNum, 
            tokenId: token.id, 
            type: 'MAIN', 
            amount: amountNum.toFixed(8) 
          },
          update: { 
            amount: { increment: amountNum } 
          }
        });

        return transaction;
      });

      // Если выбран бонус, начисляем его
      if (withBonus && assetStr === 'USDT') {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userIdNum },
            select: { referredById: true }
          });

          if (user?.referredById) {
            logger.info('CRYPTOCLOUD', 'Granting bonus', { userId: userIdNum });
            
            const bonusInfo = await referralService.grantDepositBonus(
              userIdNum,
              amountNum,
              token.id,
              user.referredById
            );

            if (bonusInfo) {
              logger.info('CRYPTOCLOUD', 'Bonus granted', { 
                userId: userIdNum, 
                bonusAmount: bonusInfo.bonusAmount 
              });
            }
          }
        } catch (bonusError) {
          logger.error('CRYPTOCLOUD', 'Error granting bonus', { 
            error: bonusError.message,
            userId: userIdNum 
          });
        }
      }

      // Обновляем статус депозита на completed
      await prisma.pendingDeposit.update({
        where: { invoiceId },
        data: { status: 'completed' }
      });

      logger.info('CRYPTOCLOUD', 'Deposit processed successfully', { 
        userId: userIdNum, 
        invoiceId, 
        amount: amountNum 
      });

      return {
        success: true,
        transactionId: result.id,
        userId: userIdNum,
        amount: amountNum,
        asset: assetStr,
        withBonus
      };

    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error processing deposit', { 
        error: error.message,
        userId,
        invoiceId 
      });

      // Обновляем статус на failed
      await prisma.pendingDeposit.update({
        where: { invoiceId },
        data: { status: 'failed' }
      }).catch(e => {
        logger.error('CRYPTOCLOUD', 'Error updating deposit status', { error: e.message });
      });

      throw error;
    }
  }

  /**
   * Получить баланс в CryptoCloud
   * @returns {Promise<Object>} Балансы
   */
  async getBalance() {
    try {
      const response = await this.api.post('/merchant/wallet/balance/all');
      return response.data?.result || {};
    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error getting balance', { error: error.message });
      return {};
    }
  }

  /**
   * Создать статический кошелек для пользователя
   * @param {number} userId - ID пользователя
   * @param {string} currency - Криптовалюта (BTC, USDT_TRC20, ETH и т.д.)
   * @returns {Promise<Object>} Данные кошелька
   */
  async createStaticWallet(userId, currency = 'USDT_TRC20') {
    try {
      const response = await this.api.post('/invoice/static/create', {
        shop_id: CRYPTO_CLOUD_SHOP_ID,
        currency: currency,
        identify: `USER-${userId}`
      });

      if (response.data?.status === 'success') {
        return {
          address: response.data.result.address,
          uuid: response.data.result.uuid,
          currency: response.data.result.currency
        };
      }

      throw new Error(response.data?.result?.validation_error || 'Failed to create wallet');
    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error creating static wallet', { 
        error: error.message,
        userId,
        currency 
      });
      throw error;
    }
  }

  /**
   * Вывод средств
   * @param {string} currencyCode - Код валюты (BTC, USDT_TRC20 и т.д.)
   * @param {string} toAddress - Адрес получателя
   * @param {number} amount - Сумма
   * @returns {Promise<Object>} Результат
   */
  async withdraw(currencyCode, toAddress, amount) {
    try {
      const response = await this.api.post('/invoice/api/out/create', {
        currency_code: currencyCode,
        to_address: toAddress,
        amount: amount
      });

      if (response.data?.status === 'success') {
        return response.data.data;
      }

      throw new Error(response.data?.message || 'Withdrawal failed');
    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error withdrawing', { 
        error: error.message,
        currencyCode,
        toAddress,
        amount 
      });
      throw error;
    }
  }
}

module.exports = new CryptoCloudService();
