const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const cryptoCloudService = require('../services/cryptoCloudService');
const referralService = require('../services/ReferralService');
const currencySyncService = require('../services/currencySyncService');
const walletService = require('../services/walletService');
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
        warning: invoice.warning || null  // Предупреждение
      }
    });

  } catch (error) {
    console.error('❌ Error creating deposit:', error);
    console.error('❌ Error stack:', error.stack);
    
    if (error.response) {
      console.error('❌ Error response:', error.response.data);
      console.error('❌ Error status:', error.response.status);
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
    console.error('❌ Error checking bonus:', error);
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
          console.log('💰 [DEPOSIT] Auto-processing paid invoice:', invoiceId);
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
      console.log('⚠️ Could not fetch invoice status from CryptoCloud:', err.message);
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
    console.error('❌ Error checking deposit status:', error);
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
    console.log('═══════════════════════════════════════════════');
    console.log('🪝 [CRYPTOCLOUD WEBHOOK] Incoming request');
    console.log('═══════════════════════════════════════════════');
    console.log('🪝 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🪝 Body:', JSON.stringify(req.body, null, 2));
    console.log('🪝 Body type:', typeof req.body);
    console.log('═══════════════════════════════════════════════');

    let webhookData = req.body;

    // Если body пустой, пробуем распарсить raw
    if (!webhookData || Object.keys(webhookData).length === 0) {
      console.log('🪝 [WEBHOOK] Body is empty, checking raw body...');
      
      if (typeof req.body === 'string') {
        try {
          webhookData = JSON.parse(req.body);
          console.log('🪝 [WEBHOOK] Parsed from string:', webhookData);
        } catch (e) {
          console.log('🪝 [WEBHOOK] Failed to parse string body');
        }
      }
    }

    // Всё ещё пустой?
    if (!webhookData || Object.keys(webhookData).length === 0) {
      console.log('❌ [WEBHOOK] No data received!');
      return res.status(200).json({ 
        success: false, 
        message: 'Empty webhook data' 
      });
    }

    // Логируем ключевые поля
    console.log('🪝 [WEBHOOK] Processing payment:');
    console.log('   invoice_id:', webhookData.invoice_id);
    console.log('   uuid:', webhookData.uuid);
    console.log('   status:', webhookData.status);
    console.log('   order_id:', webhookData.order_id);
    console.log('   amount_crypto:', webhookData.amount_crypto);
    console.log('   currency:', webhookData.currency);

    // Обрабатываем webhook
    const result = await cryptoCloudService.handleWebhook(webhookData);

    console.log('✅ [WEBHOOK] Processing result:', result);
    console.log('═══════════════════════════════════════════════');

    // Всегда возвращаем 200 OK
    res.status(200).json({ 
      success: true, 
      processed: result.processed,
      message: result.reason || 'OK'
    });

  } catch (error) {
    console.error('═══════════════════════════════════════════════');
    console.error('❌ [WEBHOOK] Error:', error.message);
    console.error('❌ [WEBHOOK] Stack:', error.stack);
    console.error('═══════════════════════════════════════════════');
    
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
  console.log('🪝 [WEBHOOK] GET request received (health check)');
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

    console.log('🧪 [TEST WEBHOOK] Simulating:', fakeWebhookData);

    const result = await cryptoCloudService.handleWebhook(fakeWebhookData);

    res.json({
      success: true,
      message: 'Test webhook processed',
      result
    });

  } catch (error) {
    console.error('❌ Test webhook error:', error);
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
    console.error('❌ Error fetching deposit history:', error);
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
    console.error('❌ Error fetching currencies:', error);
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
    console.error('❌ Error fetching deposit limits:', error);
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
    console.error('❌ Error creating static wallet:', error);
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
    
    res.json({
      success: true,
      data: {
        rates,
        updatedAt: new Date().toISOString(),
        cacheTTL: 300 // 5 минут
      }
    });
  } catch (error) {
    console.error('❌ Error fetching rates:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка при получении курсов'
    });
  }
});

module.exports = router;
