const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const cryptoCloudService = require('../services/cryptoCloudService');
const referralService = require('../services/ReferralService');
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

/**
 * POST /api/v1/deposit/create
 * Создать депозит через CryptoCloud
 */
router.post('/api/v1/deposit/create', authenticateToken, async (req, res) => {
  try {
    const { amount, withBonus } = req.body;
    const userId = req.user.userId;

    // Валидация суммы
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Некорректная сумма' 
      });
    }

    // Минимальная сумма депозита
    if (amountNum < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Минимальная сумма депозита: 1 USD' 
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

    // Создаем счет в CryptoCloud
    const invoice = await cryptoCloudService.createInvoice(amountNum, userId, canUseBonus);

    res.json({
      success: true,
      data: {
        invoiceId: invoice.invoiceId,
        payUrl: invoice.payUrl,
        amount: invoice.amount,
        currency: invoice.currency,
        withBonus: canUseBonus,
        orderId: invoice.orderId
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

module.exports = router;
