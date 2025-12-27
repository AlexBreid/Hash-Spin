const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const cryptoCloudService = require('../services/cryptoCloudService');
const referralService = require('../services/ReferralService');
const { authenticateToken } = require('../middleware/authMiddleware');

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
    
    // Логируем детали ошибки
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
    
    // Получаем лимиты бонусов
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

    // Получаем актуальный статус из CryptoCloud
    const invoice = await cryptoCloudService.getInvoice(invoiceId);

    res.json({
      success: true,
      data: {
        invoiceId: pendingDeposit.invoiceId,
        status: invoice?.status || pendingDeposit.status,
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
 */
router.post('/api/v1/deposit/cryptocloud/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-api-signature'] || req.headers['signature'];
    const webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log('🪝 [CRYPTOCLOUD WEBHOOK] Received:', {
      invoiceId: webhookData.invoice_id,
      status: webhookData.status,
      signature: signature ? 'present' : 'missing'
    });

    // Обрабатываем webhook
    const result = await cryptoCloudService.handleWebhook(webhookData, signature);

    // Всегда возвращаем 200 OK
    res.status(200).json({ 
      success: true, 
      processed: result.processed 
    });

  } catch (error) {
    console.error('❌ [CRYPTOCLOUD WEBHOOK] Error:', error.message);
    // Всегда возвращаем 200 OK, чтобы CryptoCloud не повторял запрос
    res.status(200).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;