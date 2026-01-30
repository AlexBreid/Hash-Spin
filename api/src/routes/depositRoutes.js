const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const cryptoCloudService = require('../services/cryptoCloudService');
const referralService = require('../services/ReferralService');
const currencySyncService = require('../services/currencySyncService');
const walletService = require('../services/walletService');
const telegramStarsService = require('../services/telegramStarsService');
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

/**
 * POST /api/v1/deposit/create
 * Создать депозит через CryptoCloud или CryptoBot
 */
router.post('/api/v1/deposit/create', authenticateToken, async (req, res) => {
  try {
    const { amount, withBonus, currency, tokenId, method = 'cryptocloud' } = req.body;
    const userId = req.user.userId;

    // Валидация суммы
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Некорректная сумма' 
      });
    }

    // Определяем валюту
    let selectedToken = null;
    if (tokenId) {
      selectedToken = await prisma.cryptoToken.findUnique({
        where: { id: parseInt(tokenId) }
      });
    } else if (currency) {
      // Если передан currency (например, "USDT_TRC20"), парсим его
      const [symbol, network] = currency.split('_');
      selectedToken = await currencySyncService.getCurrencyBySymbolAndNetwork(symbol, network || 'ERC-20');
    }

    // Если токен не найден, используем USDT по умолчанию
    if (!selectedToken) {
      selectedToken = await prisma.cryptoToken.findFirst({
        where: {
          symbol: 'USDT',
          network: 'TRC-20'
        }
      });
    }

    if (!selectedToken) {
      return res.status(400).json({
        success: false,
        message: 'Валюта не найдена. Пожалуйста, выберите валюту из списка.'
      });
    }

    // ✅ Проверяем минимальную сумму депозита для выбранной валюты
    const minDeposit = currencySyncService.getMinDepositForCurrency(selectedToken.symbol);
    if (amountNum < minDeposit) {
      return res.status(400).json({
        success: false,
        message: `Минимальная сумма пополнения: ${minDeposit} ${selectedToken.symbol} (≈$10)`
      });
    }

    // Проверяем доступность бонуса
    let canUseBonus = false;
    if (withBonus) {
      const bonusAvailability = await referralService.checkBonusAvailability(userId);
      canUseBonus = bonusAvailability.canUseBonus;
      
      if (!canUseBonus) {
        return res.status(400).json({
          success: false,
          message: bonusAvailability.reason === 'No referrer' 
            ? 'Бонус доступен только для пользователей с рефералом' 
            : 'Бонус недоступен'
        });
      }
    }

    // ⭐ Специальная обработка для Telegram Stars (XTR)
    if (selectedToken.symbol === 'XTR' || selectedToken.network === 'TELEGRAM') {
      // Stars доступны только через Telegram бота
      // Создаём pending deposit и возвращаем инструкции для оплаты через бота
      const pendingDeposit = await telegramStarsService.createPendingDeposit(
        userId,
        amountNum,
        canUseBonus
      );
      
      const starsLimits = telegramStarsService.getStarsLimits();
      
      return res.json({
        success: true,
        data: {
          invoiceId: pendingDeposit.invoiceId,
          payUrl: null, // Stars оплачиваются через бота
          amount: pendingDeposit.amount,
          amountUSD: pendingDeposit.amountUSD,
          currency: 'XTR',
          network: 'TELEGRAM',
          tokenId: selectedToken.id,
          withBonus: canUseBonus,
          orderId: pendingDeposit.invoiceId,
          // Специальные данные для Stars
          isStars: true,
          starsAmount: Math.round(amountNum),
          telegramPayment: true,
          message: `Оплатите ${Math.round(amountNum)} ⭐ Stars через Telegram бота`,
          minStars: starsLimits.minDeposit,
          maxStars: starsLimits.maxDeposit
        }
      });
    }

    // Создаем счет в зависимости от метода
    let invoice;
    if (method === 'cryptobot') {
      // Для Crypto Bot нужна интеграция через Telegram бота
      return res.status(400).json({
        success: false,
        message: 'Crypto Bot доступен только через Telegram бота'
      });
    } else {
      // CryptoCloud - используем СТАТИЧЕСКИЙ КОШЕЛЁК
      // Это единственный способ гарантировать оплату ТОЛЬКО выбранной криптой
      invoice = await cryptoCloudService.createStaticWalletInvoice(
        amountNum, 
        userId, 
        canUseBonus,
        selectedToken.symbol, // Криптовалюта (BTC, ETH, USDT и т.д.)
        selectedToken.network // Сеть (TRC-20, ERC-20, BTC и т.д.)
      );
    }

    res.json({
      success: true,
      data: {
        invoiceId: invoice.invoiceId,
        payUrl: invoice.payUrl,
        amount: invoice.amount,  // Сумма в крипте
        amountUSD: invoice.amountUSD,  // Сумма в USD
        currency: selectedToken.symbol,
        network: selectedToken.network,
        tokenId: selectedToken.id,
        withBonus: canUseBonus,
        orderId: invoice.orderId,
        // ✅ Данные для встроенного виджета (статический кошелёк)
        address: invoice.address || null,  // Адрес для оплаты
        staticWallet: invoice.staticWallet || false,  // Флаг статического кошелька
        warning: invoice.warning || null,  // Предупреждение
        isStars: false
      }
    });

  } catch (error) {
    if (error.response) {
      }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Ошибка при создании депозита',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/v1/deposit/check-bonus
 * Проверить доступность бонуса
 */
router.get('/api/v1/deposit/check-bonus', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const bonusAvailability = await referralService.checkBonusAvailability(userId);
    
    const limits = referralService.getLimits();

    res.json({
      success: true,
      data: {
        canUseBonus: bonusAvailability.canUseBonus,
        reason: bonusAvailability.reason,
        limits: {
          minDeposit: limits.minDeposit,
          maxBonus: limits.maxBonus,
          depositBonusPercent: limits.depositBonusPercent,
          wageringMultiplier: limits.wageringMultiplier,
          maxPayoutMultiplier: limits.maxPayoutMultiplier,
          bonusExpiryDays: limits.bonusExpiryDays
        }
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Ошибка при проверке бонуса' 
    });
  }
});

/**
 * GET /api/v1/deposit/status/:invoiceId
 * Проверить статус депозита
 */
router.get('/api/v1/deposit/status/:invoiceId', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user.userId;

    // Проверяем депозит в БД
    const pendingDeposit = await prisma.pendingDeposit.findUnique({
      where: { invoiceId }
    });

    if (!pendingDeposit || pendingDeposit.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Депозит не найден'
      });
    }

    // Если статус уже completed — возвращаем сразу
    if (pendingDeposit.status === 'completed') {
      return res.json({
        success: true,
        data: {
          invoiceId: pendingDeposit.invoiceId,
          status: 'success',
          amount: pendingDeposit.amount,
          asset: pendingDeposit.asset,
          withBonus: pendingDeposit.withBonus,
          createdAt: pendingDeposit.createdAt
        }
      });
    }

    // Получаем актуальный статус из CryptoCloud
    let invoiceStatus = pendingDeposit.status;
    try {
      const invoice = await cryptoCloudService.getInvoice(invoiceId);
      if (invoice?.status) {
        invoiceStatus = invoice.status;
        
        // Если статус paid/success — обрабатываем депозит
        if ((invoiceStatus === 'paid' || invoiceStatus === 'success') && pendingDeposit.status === 'pending') {
          await cryptoCloudService.processDeposit(
            pendingDeposit.userId,
            invoiceId,
            pendingDeposit.amount,
            pendingDeposit.asset,
            pendingDeposit.withBonus
          );
          invoiceStatus = 'success';
        }
      }
    } catch (err) {
      // Игнорируем ошибки API, используем статус из БД
      }

    res.json({
      success: true,
      data: {
        invoiceId: pendingDeposit.invoiceId,
        status: invoiceStatus,
        amount: pendingDeposit.amount,
        asset: pendingDeposit.asset,
        withBonus: pendingDeposit.withBonus,
        createdAt: pendingDeposit.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Ошибка при проверке статуса' 
    });
  }
});

/**
 * POST /api/v1/deposit/cryptocloud/webhook
 * Webhook от CryptoCloud для обработки платежей
 * 
 * CryptoCloud отправляет POST с данными:
 * {
 *   "status": "success",
 *   "invoice_id": "XXXXX",
 *   "amount_crypto": 0.001,
 *   "currency": "BTC",
 *   "order_id": "DEPOSIT-1-123456789",
 *   "token": "jwt_token_here"
 * }
 */
router.post('/api/v1/deposit/cryptocloud/webhook', async (req, res) => {
  try {
    let webhookData = req.body;

    // Если body пустой, пробуем распарсить raw
    if (!webhookData || Object.keys(webhookData).length === 0) {
      if (typeof req.body === 'string') {
        try {
          webhookData = JSON.parse(req.body);
          } catch (e) {
          }
      }
    }

    // Всё ещё пустой?
    if (!webhookData || Object.keys(webhookData).length === 0) {
      return res.status(200).json({ 
        success: false, 
        message: 'Empty webhook data' 
      });
    }

    // Логируем ключевые поля
    // Обрабатываем webhook
    const result = await cryptoCloudService.handleWebhook(webhookData);

    // Всегда возвращаем 200 OK
    res.status(200).json({ 
      success: true, 
      processed: result.processed,
      message: result.reason || 'OK'
    });

  } catch (error) {
    // Всегда возвращаем 200 OK чтобы CryptoCloud не повторял
    res.status(200).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * GET /api/v1/deposit/cryptocloud/webhook
 * Тестовый endpoint для проверки доступности webhook
 */
router.get('/api/v1/deposit/cryptocloud/webhook', (req, res) => {
  res.json({ 
    success: true, 
    message: 'CryptoCloud webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/v1/deposit/test-webhook
 * Тестовый endpoint для симуляции webhook (только в dev режиме)
 */
router.post('/api/v1/deposit/test-webhook', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Not allowed in production' });
  }

  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ success: false, message: 'invoiceId required' });
    }

    // Получаем pending deposit
    const pendingDeposit = await prisma.pendingDeposit.findUnique({
      where: { invoiceId }
    });

    if (!pendingDeposit) {
      return res.status(404).json({ success: false, message: 'Deposit not found' });
    }

    // Симулируем успешный webhook
    const fakeWebhookData = {
      status: 'success',
      invoice_id: invoiceId,
      uuid: invoiceId,
      order_id: `DEPOSIT-${pendingDeposit.userId}-${Date.now()}`,
      amount_crypto: pendingDeposit.amount,
      currency: 'USDT'
    };

    const result = await cryptoCloudService.handleWebhook(fakeWebhookData);

    res.json({
      success: true,
      message: 'Test webhook processed',
      result
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * GET /api/v1/deposit/history
 * История депозитов пользователя
 */
router.get('/api/v1/deposit/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const deposits = await prisma.pendingDeposit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.pendingDeposit.count({
      where: { userId }
    });

    res.json({
      success: true,
      data: {
        deposits: deposits.map(d => ({
          invoiceId: d.invoiceId,
          amount: d.amount,
          asset: d.asset,
          status: d.status,
          withBonus: d.withBonus,
          createdAt: d.createdAt
        })),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Ошибка при получении истории' 
    });
  }
});

/**
 * GET /api/v1/deposit/currencies
 * Получить список УНИКАЛЬНЫХ валют для депозита (один USDT, один USDC и т.д.)
 * Сети для пополнения доступны через /api/v1/wallet/deposit-networks/:symbol
 */
router.get('/api/v1/deposit/currencies', authenticateToken, async (req, res) => {
  try {
    // ✅ Используем getBaseTokens() для получения уникальных валют
    const currencies = await currencySyncService.getBaseTokens();
    
    // ✅ Добавляем минимальный депозит для каждой валюты
    const currenciesWithLimits = currencies.map(c => ({
      ...c,
      minDeposit: currencySyncService.getMinDepositForCurrency(c.symbol),
      minDepositUSD: 10
    }));
    
    res.json({
      success: true,
      data: currenciesWithLimits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка при получении списка валют'
    });
  }
});

/**
 * GET /api/v1/deposit/limits
 * Получить минимальные лимиты депозита для всех валют
 */
router.get('/api/v1/deposit/limits', authenticateToken, async (req, res) => {
  try {
    const limits = currencySyncService.getAllDepositLimits();
    
    res.json({
      success: true,
      data: {
        baseMinDepositUSD: 10,
        limits
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка при получении лимитов'
    });
  }
});

/**
 * POST /api/v1/deposit/static-wallet
 * Создать статический кошелёк для конкретной криптовалюты
 * Пользователь сможет пополнять ТОЛЬКО этой криптой на этот адрес
 */
router.post('/api/v1/deposit/static-wallet', authenticateToken, async (req, res) => {
  try {
    const { currency, network } = req.body;
    const userId = req.user.userId;

    if (!currency) {
      return res.status(400).json({
        success: false,
        message: 'Укажите криптовалюту (currency)'
      });
    }

    // Создаём статический кошелёк
    const wallet = await cryptoCloudService.createStaticWallet(
      userId,
      currency,
      network || 'ERC-20'
    );

    res.json({
      success: true,
      data: {
        address: wallet.address,
        currency: wallet.currency,
        network: wallet.network,
        uuid: wallet.uuid,
        message: `Отправляйте только ${wallet.currency} на этот адрес. Другие валюты будут потеряны!`
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка создания кошелька'
    });
  }
});

/**
 * GET /api/v1/deposit/rates
 * Получить актуальные курсы валют (обновляются каждые 5 минут)
 */
router.get('/api/v1/deposit/rates', authenticateToken, async (req, res) => {
  try {
    // Получаем актуальные курсы (обновляет кэш если устарел)
    const rates = await currencySyncService.fetchLiveRates();
    
    // Добавляем курс Stars
    rates['XTR'] = telegramStarsService.getStarsRate();
    
    res.json({
      success: true,
      data: {
        rates,
        updatedAt: new Date().toISOString(),
        cacheTTL: 300 // 5 минут
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка при получении курсов'
    });
  }
});

/**
 * ⭐ GET /api/v1/deposit/stars/limits
 * Получить лимиты для Telegram Stars
 */
router.get('/api/v1/deposit/stars/limits', authenticateToken, async (req, res) => {
  try {
    const limits = telegramStarsService.getStarsLimits();
    
    res.json({
      success: true,
      data: limits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка при получении лимитов Stars'
    });
  }
});

/**
 * ⭐ POST /api/v1/deposit/stars/create
 * Создать депозит в Telegram Stars
 * Возвращает данные для создания инвойса в Telegram боте
 */
router.post('/api/v1/deposit/stars/create', authenticateToken, async (req, res) => {
  try {
    const { starsAmount, withBonus } = req.body;
    const userId = req.user.userId;
    
    const amount = parseInt(starsAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Некорректное количество Stars'
      });
    }
    
    const limits = telegramStarsService.getStarsLimits();
    
    if (amount < limits.minDeposit) {
      return res.status(400).json({
        success: false,
        message: `Минимальная сумма: ${limits.minDeposit} Stars ($${limits.minDepositUSD.toFixed(2)})`
      });
    }
    
    if (amount > limits.maxDeposit) {
      return res.status(400).json({
        success: false,
        message: `Максимальная сумма: ${limits.maxDeposit} Stars ($${limits.maxDepositUSD.toFixed(2)})`
      });
    }
    
    // Проверяем бонус
    let canUseBonus = false;
    if (withBonus) {
      const bonusAvailability = await referralService.checkBonusAvailability(userId);
      canUseBonus = bonusAvailability.canUseBonus;
    }
    
    // Создаём pending deposit
    const pendingDeposit = await telegramStarsService.createPendingDeposit(
      userId,
      amount,
      canUseBonus
    );
    
    // Получаем параметры для инвойса
    const invoiceParams = telegramStarsService.createStarsInvoiceParams(
      userId,
      amount,
      canUseBonus
    );
    
    res.json({
      success: true,
      data: {
        invoiceId: pendingDeposit.invoiceId,
        starsAmount: amount,
        amountUSD: pendingDeposit.amountUSD,
        withBonus: canUseBonus,
        invoiceParams: invoiceParams,
        message: `Оплатите ${amount} ⭐ Stars через Telegram бота`
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка создания депозита Stars'
    });
  }
});

/**
 * ⭐ POST /api/v1/deposit/stars/invoice
 * Создать инвойс Stars для оплаты через Telegram WebApp
 * Возвращает invoice_link для openInvoice()
 */
router.post('/api/v1/deposit/stars/invoice', authenticateToken, async (req, res) => {
  try {
    const { starsAmount, withBonus } = req.body;
    const userId = req.user.userId;
    
    const amount = parseInt(starsAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Некорректное количество Stars'
      });
    }
    
    const limits = telegramStarsService.getStarsLimits();
    
    if (amount < limits.minDeposit) {
      return res.status(400).json({
        success: false,
        message: `Минимальная сумма: ${limits.minDeposit} Stars`
      });
    }
    
    if (amount > limits.maxDeposit) {
      return res.status(400).json({
        success: false,
        message: `Максимальная сумма: ${limits.maxDeposit} Stars`
      });
    }
    
    // Создаём pending deposit
    const pendingDeposit = await telegramStarsService.createPendingDeposit(
      userId,
      amount,
      withBonus || false
    );
    
    // Получаем пользователя для telegramId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true }
    });
    
    if (!user?.telegramId) {
      return res.status(400).json({
        success: false,
        message: 'Telegram аккаунт не привязан'
      });
    }
    
    // Создаём инвойс через бота
    const { botInstance } = require('../bots/telegramBot');
    
    logger.info('STARS', 'Creating invoice', { userId, amount, botAvailable: !!botInstance });
    
    if (!botInstance) {
      logger.error('STARS', 'Bot instance not available');
      return res.status(500).json({
        success: false,
        message: 'Telegram бот недоступен'
      });
    }
    
    // Создаём параметры инвойса
    const invoiceParams = telegramStarsService.createStarsInvoiceParams(
      userId,
      amount,
      withBonus || false
    );
    
    logger.info('STARS', 'Invoice params created', { 
      title: invoiceParams.title,
      currency: 'XTR',
      amount: invoiceParams.prices[0].amount
    });
    
    // Создаём инвойс и получаем ссылку
    const invoiceLink = await botInstance.telegram.createInvoiceLink({
      title: invoiceParams.title,
      description: invoiceParams.description,
      payload: invoiceParams.payload,
      provider_token: '', // Пустой для Stars
      currency: 'XTR',
      prices: invoiceParams.prices
    });
    
    logger.info('STARS', 'Invoice link created successfully', {
      userId,
      amount,
      invoiceId: pendingDeposit.invoiceId,
      invoiceLinkLength: invoiceLink?.length || 0
    });
    
    console.log('⭐ STARS Invoice Link:', invoiceLink);
    
    res.json({
      success: true,
      data: {
        invoiceLink: invoiceLink,
        invoiceId: pendingDeposit.invoiceId,
        starsAmount: amount,
        amountUSD: telegramStarsService.starsToUSD(amount),
        withBonus: withBonus || false
      }
    });
    
  } catch (error) {
    logger.error('STARS', 'Failed to create invoice', { 
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    console.error('⭐ STARS Error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка создания инвойса Stars',
      error: error.code || 'UNKNOWN'
    });
  }
});

/**
 * ⭐ POST /api/v1/deposit/stars/process
 * Обработать успешный платёж Stars (вызывается из Telegram бота)
 * Внутренний endpoint, не должен вызываться напрямую пользователями
 */
router.post('/api/v1/deposit/stars/process', async (req, res) => {
  try {
    // Проверяем секретный ключ для внутренних вызовов
    const internalKey = req.headers['x-internal-key'];
    if (internalKey !== process.env.INTERNAL_API_KEY && process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }
    
    const { userId, amount, invoiceId, telegramPaymentId } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, amount'
      });
    }
    
    const result = await telegramStarsService.processStarsPayment({
      userId: parseInt(userId),
      amount: parseInt(amount),
      invoiceId: invoiceId || `stars_${Date.now()}`,
      telegramPaymentId
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка обработки платежа Stars'
    });
  }
});

/**
 * ⭐ GET /api/v1/deposit/stars/balance
 * Получить баланс Stars пользователя
 */
router.get('/api/v1/deposit/stars/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const balance = await telegramStarsService.getUserStarsBalance(userId);
    
    res.json({
      success: true,
      data: {
        balance: balance,
        balanceUSD: telegramStarsService.starsToUSD(balance)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка получения баланса Stars'
    });
  }
});

/**
 * ⭐ GET /api/v1/deposit/stars/test
 * Тестовый эндпоинт для проверки создания Stars инвойса
 */
router.get('/api/v1/deposit/stars/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Получаем инстанс бота
    const { botInstance } = require('../bots/telegramBot');
    
    if (!botInstance) {
      return res.status(500).json({
        success: false,
        message: 'Telegram бот недоступен',
        error: 'BOT_NOT_AVAILABLE'
      });
    }
    
    // Пробуем создать тестовый инвойс
    const testInvoice = await botInstance.telegram.createInvoiceLink({
      title: '⭐ Тест Stars',
      description: 'Тестовый инвойс для проверки Stars',
      payload: JSON.stringify({ type: 'test', userId, timestamp: Date.now() }),
      provider_token: '', // Пустой для Stars!
      currency: 'XTR',
      prices: [{ label: '50 Stars', amount: 50 }]
    });
    
    res.json({
      success: true,
      message: 'Stars инвойс создан успешно!',
      data: {
        invoiceLink: testInvoice,
        note: 'Откройте эту ссылку в Telegram для оплаты'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка создания Stars инвойса',
      error: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

module.exports = router;


