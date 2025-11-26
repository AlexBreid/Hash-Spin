const express = require('express');
const router = express.Router();
const tatumService = require('../services/tatumService');

router.post('/create-address', async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const userId = req.user.userId;

    // Создаем адрес в Tatum
    const addressData = await tatumService.createDepositAddress(userId);

    // Сохраняем в БД
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        tokenId: 2, // MATIC
        type: 'DEPOSIT',
        status: 'PENDING',
        amount: parseFloat(amount),
        walletAddress: addressData.address,
      },
    });

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        address: addressData.address,
        amount,
        currency,
        qrData: `matic:${addressData.address}?amount=${amount}`,
        networkInfo: {
          network: 'POLYGON',
          chainId: 80002,
          isTestnet: true,
          blockExplorer: 'https://www.oklink.com/amoy',
          testnetFaucet: 'https://faucet.polygon.technology/',
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/status/:transactionId', async (req, res) => {
  // Проверяем статус платежа
  const transaction = await prisma.transaction.findUnique({
    where: { id: parseInt(req.params.transactionId) },
  });

  res.json({
    success: true,
    data: {
      status: transaction.status,
      amount: transaction.amount,
    },
  });
});

module.exports = router;