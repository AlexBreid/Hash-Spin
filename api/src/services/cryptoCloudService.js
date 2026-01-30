/**
 * CryptoCloud Service
 * Сервис для работы с CryptoCloud API v2
 */

const axios = require('axios');
const crypto = require('crypto');
const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const referralService = require('./ReferralService');
const { convertCryptoToUSD, getCurrencyRate } = require('./currencySyncService');

// Конфигурация CryptoCloud
const CRYPTO_CLOUD_API_URL = 'https://api.cryptocloud.plus/v2';
const CRYPTO_CLOUD_API_KEY = process.env.CRYPTO_CLOUD_API_KEY;
const CRYPTO_CLOUD_WITHDRAW_API_KEY = process.env.CRYPTO_CLOUD_WITHDRAW_API_KEY;
const CRYPTO_CLOUD_SHOP_ID = process.env.CRYPTO_CLOUD_SHOP_ID;
const CRYPTO_CLOUD_SECRET = process.env.CRYPTO_CLOUD_SECRET;

class CryptoCloudService {
  constructor() {
    // Создаем axios instance для депозитов
    this.api = axios.create({
      baseURL: CRYPTO_CLOUD_API_URL,
      timeout: 30000,
      headers: {
        'Authorization': `Token ${CRYPTO_CLOUD_API_KEY}`,  // ВАЖНО: Token, не Bearer!
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Создаем отдельный axios instance для выводов (с другим API ключом)
    this.withdrawApi = axios.create({
      baseURL: CRYPTO_CLOUD_API_URL,
      timeout: 30000,
      headers: {
        'Authorization': `Token ${CRYPTO_CLOUD_WITHDRAW_API_KEY || CRYPTO_CLOUD_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (CRYPTO_CLOUD_WITHDRAW_API_KEY) {
      logger.info('CRYPTOCLOUD', 'Withdraw API key configured separately');
    }
  }

  /**
   * Маппинг валют для CryptoCloud API
   * CryptoCloud использует специфичные идентификаторы валют
   */
  getCryptoCloudCurrency(symbol, network) {
    const mapping = {
      // USDT на разных сетях
      'USDT_TRC-20': 'USDT_TRC20',
      'USDT_ERC-20': 'USDT_ERC20', 
      'USDT_BEP-20': 'USDT_BSC',
      'USDT_SOL': 'USDT_SOL',
      'USDT_TON': 'USDT_TON',
      'USDT_ARB': 'USDT_ARBITRUM',
      'USDT_OP': 'USDT_OPTIMISM',
      // USDC
      'USDC_ERC-20': 'USDC_ERC20',
      'USDC_BEP-20': 'USDC_BSC',
      'USDC_SOL': 'USDC_SOL',
      'USDC_ARB': 'USDC_ARBITRUM',
      'USDC_OP': 'USDC_OPTIMISM',
      'USDC_BASE': 'USDC_BASE',
      // Основные криптовалюты
      'BTC_BTC': 'BTC',
      'ETH_ERC-20': 'ETH',
      'ETH_ARB': 'ETH_ARBITRUM',
      'ETH_OP': 'ETH_OPTIMISM',
      'BNB_BEP-20': 'BNB_BSC',
      'LTC_LTC': 'LTC',
      'TRX_TRC-20': 'TRX',
      'TON_TON': 'TON',
      'SOL_SOL': 'SOL',
      'SHIB_ERC-20': 'SHIB',
    };
    
    const key = `${symbol.toUpperCase()}_${network}`;
    return mapping[key] || symbol.toUpperCase();
  }

  /**
   * Создать счет на оплату
   * CryptoCloud API требует сумму в фиатной валюте (USD)
   * Конвертируем сумму криптовалюты → USD для создания инвойса
   * 
   * @param {number} amount - Сумма в КРИПТОВАЛЮТЕ (5 BNB)
   * @param {number} userId - ID пользователя
   * @param {boolean} withBonus - Использовать ли бонус
   * @param {string} fiatCurrency - Фиатная валюта (USD)
   * @param {string} cryptoCurrency - Криптовалюта (USDT, BNB, BTC и т.д.)
   * @param {string} network - Сеть криптовалюты (TRC-20, BEP-20 и т.д.)
   * @returns {Promise<Object>} Данные счета
   */
  async createInvoice(amount, userId, withBonus = false, fiatCurrency = 'USD', cryptoCurrency = 'USDT', network = 'TRC-20') {
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

      // ✅ Конвертируем сумму криптовалюты в USD с АКТУАЛЬНЫМ курсом
      // CryptoCloud API требует фиатную валюту!
      const currencySyncService = require('./currencySyncService');
      const currentRate = await currencySyncService.getCurrencyRateAsync(cryptoCurrency);
      const amountInUSD = amountNum * currentRate;
      
      logger.info('CRYPTOCLOUD', 'Converting to USD with LIVE rate', {
        originalAmount: amountNum,
        cryptoCurrency,
        network,
        liveRate: currentRate,
        amountInUSD: amountInUSD.toFixed(2)
      });

      // ✅ Формируем данные для CryptoCloud
      // currency ДОЛЖНА быть фиатной (USD, EUR, etc.)
      const invoiceData = {
        shop_id: CRYPTO_CLOUD_SHOP_ID,
        amount: amountInUSD.toFixed(2),  // Сумма в USD
        currency: 'USD',  // Фиатная валюта
        order_id: orderId
      };

      logger.info('CRYPTOCLOUD', 'Creating invoice', { 
        userId: userIdNum, 
        originalAmount: amountNum,
        cryptoCurrency,
        network,
        amountInUSD: amountInUSD.toFixed(2),
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

      // Определяем tokenId для сохранения
      let token = null;
      if (cryptoCurrency && cryptoCurrency.includes('_')) {
        // Если передан формат "USDT_TRC20"
        const [symbol, network] = cryptoCurrency.split('_');
        token = await prisma.cryptoToken.findFirst({
          where: {
            symbol: symbol.toUpperCase(),
            network: network || 'ERC-20'
          }
        });
      } else {
        // Ищем по символу
        token = await prisma.cryptoToken.findFirst({
          where: { symbol: cryptoCurrency?.toUpperCase() || 'USDT' }
        });
      }

      // Сохраняем информацию о депозите в БД
      // Используем переданную криптовалюту и сеть
      await prisma.pendingDeposit.create({
        data: {
          userId: userIdNum,
          invoiceId: invoice.uuid,  // CryptoCloud v2 использует uuid
          amount: amountNum,
          asset: cryptoCurrency,  // Сохраняем выбранную криптовалюту
          network: network || token?.network || 'TRC-20',  // Сохраняем переданную сеть
          status: 'pending',
          withBonus: withBonus
        }
      });

      logger.info('CRYPTOCLOUD', 'Invoice created', { 
        invoiceId: invoice.uuid, 
        userId: userIdNum,
        originalAmount: amountNum,
        amountInUSD: amountInUSD.toFixed(2),
        cryptoCurrency,
        network,
        payUrl: invoice.link
      });

      // ✅ Возвращаем данные
      // Пользователь выберет криптовалюту на странице CryptoCloud
      return {
        invoiceId: invoice.uuid,
        status: invoice.status || 'created',
        payUrl: invoice.link,  // Ссылка на страницу оплаты CryptoCloud
        orderId: orderId,
        amount: amountNum,  // Оригинальная сумма в крипте
        amountUSD: parseFloat(amountInUSD.toFixed(2)),  // Сумма в USD
        currency: cryptoCurrency,  // Выбранная криптовалюта
        network: network,
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
   * Создать статический кошелёк для конкретной криптовалюты
   * Пользователь сможет оплатить ТОЛЬКО этой криптовалютой!
   * 
   * @param {number} userId - ID пользователя
   * @param {string} cryptoCurrency - Криптовалюта (BTC, ETH, USDT и т.д.)
   * @param {string} network - Сеть (TRC-20, ERC-20, BTC и т.д.)
   * @returns {Promise<Object>} Данные кошелька с адресом
   */
  async createStaticWallet(userId, cryptoCurrency, network) {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        throw new Error('Invalid userId');
      }

      // Получаем код валюты для CryptoCloud
      const cryptoCloudCurrency = this.getCryptoCloudCurrency(cryptoCurrency, network);
      
      // Уникальный идентификатор для этого пользователя и валюты
      const identify = `user_${userIdNum}_${cryptoCurrency}_${network}`.replace(/[^a-zA-Z0-9_]/g, '_');

      logger.info('CRYPTOCLOUD', 'Creating static wallet', {
        userId: userIdNum,
        cryptoCurrency,
        network,
        cryptoCloudCurrency,
        identify
      });

      const response = await this.api.post('/invoice/static/create', {
        shop_id: CRYPTO_CLOUD_SHOP_ID,
        currency: cryptoCloudCurrency,  // Криптовалюта напрямую!
        identify: identify
      });

      if (!response.data || response.data.status === 'error') {
        const errorMsg = response.data?.result?.message || 
                        response.data?.result?.currency ||
                        JSON.stringify(response.data?.result) || 
                        'Error from CryptoCloud';
        throw new Error(errorMsg);
      }

      const wallet = response.data.result;

      logger.info('CRYPTOCLOUD', 'Static wallet created', {
        userId: userIdNum,
        currency: cryptoCurrency,
        address: wallet.address,
        uuid: wallet.uuid
      });

      return {
        uuid: wallet.uuid,
        address: wallet.address,
        currency: cryptoCurrency,
        network: network,
        cryptoCloudCurrency: cryptoCloudCurrency,
        identify: identify
      };

    } catch (error) {
      if (error.response) {
        logger.error('CRYPTOCLOUD', 'Static wallet error', {
          status: error.response.status,
          data: error.response.data,
          userId,
          cryptoCurrency
        });
        }
      throw error;
    }
  }

  /**
   * Создать депозит через СТАТИЧЕСКИЙ КОШЕЛЁК (с fallback на обычный инвойс)
   * Статический кошелёк гарантирует оплату только выбранной криптой.
   * В тестовом режиме CryptoCloud - используется обычный инвойс.
   */
  async createStaticWalletInvoice(amount, userId, withBonus = false, cryptoCurrency = 'USDT', network = 'TRC-20') {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid amount');
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      throw new Error('Invalid userId');
    }

    const cryptoCloudCurrency = this.getCryptoCloudCurrency(cryptoCurrency, network);
    const identify = `user_${userIdNum}_${cryptoCloudCurrency}`;

    // Конвертируем в USD
    const currencySyncService = require('./currencySyncService');
    const currentRate = await currencySyncService.getCurrencyRateAsync(cryptoCurrency);
    const amountInUSD = amountNum * currentRate;

    logger.info('CRYPTOCLOUD', 'Creating deposit', {
      userId: userIdNum,
      amount: amountNum,
      cryptoCurrency,
      network,
      amountInUSD: amountInUSD.toFixed(2)
    });

    // ===== ПОПЫТКА 1: Статический кошелёк (только для боевого режима) =====
    try {
      const response = await this.api.post('/invoice/static/create', {
        shop_id: CRYPTO_CLOUD_SHOP_ID,
        currency: cryptoCloudCurrency,
        identify: identify
      });

      if (response.data && response.data.status !== 'error') {
        const wallet = response.data.result;

        logger.info('CRYPTOCLOUD', 'Static wallet created', {
          uuid: wallet.uuid,
          address: wallet.address
        });

        // Сохраняем pending deposit
        await prisma.pendingDeposit.create({
          data: {
            userId: userIdNum,
            invoiceId: wallet.uuid,
            amount: amountNum,
            asset: cryptoCurrency,
            network: network,
            status: 'pending',
            withBonus: withBonus
          }
        });

        // ✅ Статический кошелёк - встроенный виджет
        return {
          invoiceId: wallet.uuid,
          status: 'awaiting_payment',
          payUrl: null,
          orderId: `STATIC-${userIdNum}-${Date.now()}`,
          amount: amountNum,
          amountUSD: parseFloat(amountInUSD.toFixed(2)),
          currency: cryptoCurrency,
          network: network,
          address: wallet.address,
          staticWallet: true,
          warning: `Отправляйте ТОЛЬКО ${cryptoCurrency} (${network}) на этот адрес!`
        };
      }
    } catch (staticError) {
      // Статические кошельки не работают (тестовый режим)
      logger.warn('CRYPTOCLOUD', 'Static wallet not available, using regular invoice', {
        error: staticError.response?.data?.result || staticError.message
      });
    }

    // ===== FALLBACK: Обычный инвойс (для тестового режима) =====
    logger.info('CRYPTOCLOUD', 'Using regular invoice (test mode fallback)');

    const orderId = `DEPOSIT-${userIdNum}-${Date.now()}`;
    
    const invoiceData = {
      shop_id: CRYPTO_CLOUD_SHOP_ID,
      amount: amountInUSD.toFixed(2),
      currency: 'USD',
      order_id: orderId
    };

    const response = await this.api.post('/invoice/create', invoiceData);

    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.result?.message || 'Invoice creation failed');
    }

    const invoice = response.data.result;

    // Сохраняем pending deposit
    await prisma.pendingDeposit.create({
      data: {
        userId: userIdNum,
        invoiceId: invoice.uuid,
        amount: amountNum,
        asset: cryptoCurrency,
        network: network,
        status: 'pending',
        withBonus: withBonus
      }
    });

    logger.info('CRYPTOCLOUD', 'Regular invoice created', {
      invoiceId: invoice.uuid,
      payUrl: invoice.link
    });

    // ⚠️ Обычный инвойс - редирект на CryptoCloud
    return {
      invoiceId: invoice.uuid,
      status: invoice.status || 'created',
      payUrl: invoice.link,
      orderId: orderId,
      amount: amountNum,
      amountUSD: parseFloat(amountInUSD.toFixed(2)),
      currency: cryptoCurrency,
      network: network,
      address: null,
      staticWallet: false,
      warning: null,
      testMode: true  // Флаг тестового режима
    };
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
      const rawInvoiceId = webhookData.invoice_id || webhookData.uuid;
      if (!rawInvoiceId) {
        throw new Error('Missing invoice_id/uuid');
      }

      // Пробуем найти депозит по разным форматам ID
      // CryptoCloud присылает "E9PPO4KK", а в БД хранится "INV-E9PPO4KK"
      const possibleIds = [
        rawInvoiceId,                          // E9PPO4KK
        `INV-${rawInvoiceId}`,                 // INV-E9PPO4KK
        rawInvoiceId.replace('INV-', ''),      // На случай если уже с префиксом
      ];

      let pendingDeposit = null;
      let foundInvoiceId = null;

      for (const id of possibleIds) {
        pendingDeposit = await prisma.pendingDeposit.findUnique({
          where: { invoiceId: id }
        });
        if (pendingDeposit) {
          foundInvoiceId = id;
          logger.info('CRYPTOCLOUD', 'Found deposit with invoiceId', { 
            searchedId: rawInvoiceId, 
            foundId: id 
          });
          break;
        }
      }

      // Если не нашли по invoiceId, пробуем по order_id
      if (!pendingDeposit && webhookData.order_id) {
        // order_id формат: "DEPOSIT-{userId}-{timestamp}"
        const orderParts = webhookData.order_id.split('-');
        if (orderParts.length >= 3 && orderParts[0] === 'DEPOSIT') {
          const orderUserId = parseInt(orderParts[1]);
          const orderTimestamp = parseInt(orderParts[2]);
          
          // Ищем pending deposit для этого пользователя с близким временем создания
          const deposits = await prisma.pendingDeposit.findMany({
            where: {
              userId: orderUserId,
              status: 'pending'
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          });

          // Находим депозит с подходящей суммой
          const webhookAmount = parseFloat(webhookData.amount_crypto) || 
                               parseFloat(webhookData.invoice_info?.amount_usd) ||
                               parseFloat(webhookData.invoice_info?.amount);
          
          for (const dep of deposits) {
            // Сравниваем суммы (с небольшой погрешностью для комиссий)
            const depAmount = parseFloat(dep.amount);
            if (Math.abs(depAmount - webhookAmount) < 0.01 || 
                dep.invoiceId.includes(rawInvoiceId) ||
                rawInvoiceId.includes(dep.invoiceId.replace('INV-', ''))) {
              pendingDeposit = dep;
              foundInvoiceId = dep.invoiceId;
              logger.info('CRYPTOCLOUD', 'Found deposit by order_id match', { 
                orderId: webhookData.order_id,
                foundId: foundInvoiceId
              });
              break;
            }
          }
        }
      }

      if (!pendingDeposit) {
        logger.warn('CRYPTOCLOUD', 'Pending deposit not found', { 
          rawInvoiceId,
          triedIds: possibleIds,
          orderId: webhookData.order_id
        });
        return { processed: false, reason: 'Deposit not found' };
      }

      // Проверяем статус
      if (pendingDeposit.status !== 'pending') {
        logger.info('CRYPTOCLOUD', 'Deposit already processed', { 
          invoiceId: foundInvoiceId, 
          status: pendingDeposit.status 
        });
        return { processed: false, reason: 'Already processed' };
      }

      // Проверяем статус оплаты
      const invoiceStatus = webhookData.status;
      if (invoiceStatus !== 'success' && invoiceStatus !== 'paid') {
        logger.info('CRYPTOCLOUD', 'Invoice not paid', { invoiceId: foundInvoiceId, status: invoiceStatus });
        return { processed: false, reason: 'Not paid' };
      }

      // Обрабатываем депозит
      const result = await this.processDeposit(
        pendingDeposit.userId,
        foundInvoiceId,  // Используем ID из базы
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

      // Получаем pendingDeposit для информации о валюте и сети
      const pendingDeposit = await prisma.pendingDeposit.findUnique({
        where: { invoiceId }
      });

      // Получаем или создаем токен
      let token = null;
      
      // Используем network из pendingDeposit, если есть
      if (pendingDeposit && pendingDeposit.network) {
        token = await prisma.cryptoToken.findFirst({
          where: {
            symbol: assetStr,
            network: pendingDeposit.network
          }
        });
      }
      
      // Если не нашли, пробуем найти USDT TRC-20 как наиболее популярный вариант
      if (!token && assetStr === 'USDT') {
        token = await prisma.cryptoToken.findFirst({ 
          where: { 
            symbol: assetStr,
            network: 'TRC-20'
          } 
        });
      }
      
      // Если не нашли, ищем любой токен с таким symbol
      if (!token) {
        token = await prisma.cryptoToken.findFirst({ 
          where: { symbol: assetStr } 
        });
      }

      // Если все еще не нашли, создаем новый токен
      if (!token) {
        const defaultNetwork = pendingDeposit?.network || (assetStr === 'USDT' ? 'TRC-20' : 'ERC-20');
        token = await prisma.cryptoToken.create({
          data: { 
            symbol: assetStr, 
            name: assetStr, 
            network: defaultNetwork,
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

      // Если выбран бонус, начисляем его для любой криптовалюты
      if (withBonus) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userIdNum },
            select: { referredById: true }
          });

          if (user?.referredById) {
            logger.info('CRYPTOCLOUD', 'Granting bonus', { userId: userIdNum, asset: assetStr });
            
            const bonusInfo = await referralService.grantDepositBonus(
              userIdNum,
              amountNum,
              token.id,
              user.referredById
            );

            if (bonusInfo) {
              logger.info('CRYPTOCLOUD', 'Bonus granted', { 
                userId: userIdNum, 
                bonusAmount: bonusInfo.bonusAmount,
                asset: assetStr
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
   * Вывод средств через CryptoCloud API
   * Документация: https://docs.cryptocloud.plus/ru/api-reference-v2/withdrawals
   * 
   * @param {string} currencyCode - Код валюты (BTC, USDT_TRC20 и т.д.)
   * @param {string} toAddress - Адрес получателя
   * @param {number} amount - Сумма
   * @returns {Promise<Object>} Результат
   */
  async withdraw(currencyCode, toAddress, amount) {
    try {
      logger.info('CRYPTOCLOUD', 'Creating withdrawal', {
        currencyCode,
        toAddress: toAddress.substring(0, 10) + '...',
        amount
      });

      // Используем отдельный API для выводов
      const response = await this.withdrawApi.post('/invoice/api/out/create', {
        currency_code: currencyCode,
        to_address: toAddress,
        amount: parseFloat(amount).toString()
      });

      logger.info('CRYPTOCLOUD', 'Withdrawal response', {
        status: response.data?.status,
        result: response.data?.result
      });

      if (response.data?.status === 'success' || response.data?.result === 'success') {
        return {
          success: true,
          data: response.data.data || response.data,
          txId: response.data.data?.id || response.data.id
        };
      }

      throw new Error(response.data?.message || response.data?.error || 'Withdrawal failed');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      logger.error('CRYPTOCLOUD', 'Error withdrawing', { 
        error: errorMessage,
        status: error.response?.status,
        currencyCode,
        toAddress: toAddress.substring(0, 10) + '...',
        amount 
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Получить статус вывода
   * @param {string} withdrawalId - ID вывода
   * @returns {Promise<Object>} Статус вывода
   */
  async getWithdrawalStatus(withdrawalId) {
    try {
      const response = await this.withdrawApi.get(`/invoice/api/out/info/${withdrawalId}`);
      return response.data;
    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error getting withdrawal status', {
        error: error.message,
        withdrawalId
      });
      throw error;
    }
  }

  /**
   * Получить историю выводов
   * @param {number} limit - Лимит записей
   * @param {number} offset - Смещение
   * @returns {Promise<Object>} История выводов
   */
  async getWithdrawalHistory(limit = 100, offset = 0) {
    try {
      const response = await this.withdrawApi.get('/invoice/api/out/list', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error getting withdrawal history', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Получить баланс для выводов
   * @returns {Promise<Object>} Балансы
   */
  async getWithdrawBalance() {
    try {
      const response = await this.withdrawApi.get('/invoice/api/out/balance');
      return response.data;
    } catch (error) {
      logger.error('CRYPTOCLOUD', 'Error getting withdraw balance', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new CryptoCloudService();

