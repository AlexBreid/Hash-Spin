const express = require('express');
const router = express.Router();
const cryptoCloudService = require('../services/cryptoCloudService');
const logger = require('../utils/logger');

/**
 * POST /callback
 * Callback от CryptoCloud для обработки платежей
 * Этот endpoint используется для перенаправления после оплаты
 */
router.post('/callback', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-api-signature'] || req.headers['signature'];
    const webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    logger.info('CRYPTOCLOUD', 'Callback received', {
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
    logger.error('CRYPTOCLOUD', 'Callback error', { error: error.message });
    // Всегда возвращаем 200 OK, чтобы CryptoCloud не повторял запрос
    res.status(200).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

