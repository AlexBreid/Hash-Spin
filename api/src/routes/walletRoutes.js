const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const tatumService = require('../services/tatumService');

/**
 * Получить баланс пользователя
 * GET /api/v1/wallet/balance
 */
router.get('/api/v1/wallet/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const balances = await prisma.balance.findMany({
      where: { userId },
      include: {
        token: {
          select: {
            symbol: true,
            name: true,
            decimals: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: balances.map((b) => ({
        tokenId: b.tokenId,
        symbol: b.token.symbol,
        amount: parseFloat(b.amount.toString()),
        type: b.type,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance',
    });
  }
});

/**
 * ⭐ НОВЫЙ ENDPOINT: Получить все доступные токены
 * GET /api/v1/wallet/tokens
 */
router.get('/api/v1/wallet/tokens', async (req, res) => {
  try {
    console.log('📋 Запрос списка доступных токенов');

    const tokens = await prisma.cryptoToken.findMany({
      select: {
        id: true,
        symbol: true,
        name: true,
        network: true,
        decimals: true,
      },
      orderBy: {
        symbol: 'asc',
      },
    });

    if (tokens.length === 0) {
      console.warn('⚠️ Токены не найдены в БД');
      return res.json({
        success: true,
        data: [],
        message: 'Нет доступных токенов',
      });
    }

    console.log(`✅ Найдено ${tokens.length} токенов`);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error('❌ Ошибка получения токенов:', error.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения списка токенов',
      error: error.message,
    });
  }
});

/**
 * ⭐ НОВЫЙ ENDPOINT: Создать адрес пополнения через Tatum (TRON/TRC20)
 * POST /api/v1/wallet/deposit/create-address
 */
router.post('/api/v1/wallet/deposit/create-address', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, currency } = req.body;

    console.log('📍 Получены данные:', { amount, currency, userId });

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Некорректная сумма',
      });
    }

    const currencyStr = String(currency).toUpperCase().trim();

    if (!['USDT', 'TRON'].includes(currencyStr)) {
      return res.status(400).json({
        success: false,
        message: `Неподдерживаемая валюта: ${currencyStr}. Поддерживается только USDT (TRC20)`,
      });
    }

    console.log(`📍 Создание TRON адреса пополнения для пользователя ${userId}...`);

    const addressData = await tatumService.createDepositAddress(userId);
    console.log(`✅ TRON адрес создан: ${addressData.address}`);

    const token = await prisma.cryptoToken.findFirst({
      where: {
        symbol: 'USDT',
        network: 'TRC-20',
      },
    });

    if (!token) {
      console.error('❌ USDT TRC20 токен не найден в БД');
      return res.status(404).json({
        success: false,
        message: 'USDT токен TRC20 не найден в системе',
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        tokenId: token.id,
        type: 'DEPOSIT',
        status: 'PENDING',
        amount: parseFloat(amount),
        walletAddress: addressData.address,
        txHash: null,
      },
    });

    console.log(`✅ Платеж создан: ID ${transaction.id}`);

    const networkInfo = tatumService.getNetworkInfo();

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        address: addressData.address,
        amount: amount,
        currency: 'USDT',
        network: 'TRON',
        contractAddress: addressData.contractAddress,
        qrData: `tron:${addressData.address}?amount=${amount}`,
        networkInfo: {
          network: 'TRON',
          currency: 'USDT (TRC20)',
          chainId: networkInfo.tronNetwork,
          isTestnet: networkInfo.isTestnet,
          blockExplorer: networkInfo.blockExplorer,
          testnetFaucet: networkInfo.testnetFaucet,
          usdtContract: networkInfo.usdtContract,
          decimals: networkInfo.decimals,
        },
      },
    });
  } catch (error) {
    console.error('❌ Ошибка создания адреса:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Не удалось создать адрес пополнения',
    });
  }
});

/**
 * ⭐ НОВЫЙ ENDPOINT: Проверить статус платежа
 * GET /api/v1/wallet/deposit/status/:transactionId
 */
router.get('/api/v1/wallet/deposit/status/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;

    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(transactionId) },
      include: {
        token: {
          select: { symbol: true },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Платеж не найден',
      });
    }

    if (transaction.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен',
      });
    }

    if (transaction.status === 'COMPLETED') {
      return res.json({
        success: true,
        data: {
          status: 'COMPLETED',
          amount: parseFloat(transaction.amount.toString()),
          currency: transaction.token.symbol,
          txHash: transaction.txHash,
          completedAt: transaction.updatedAt,
        },
      });
    }

    try {
      const balanceData = await tatumService.getAddressBalance(transaction.walletAddress);

      res.json({
        success: true,
        data: {
          status: transaction.status,
          balance: balanceData.balance,
          unconfirmedBalance: balanceData.unconfirmedBalance,
          address: transaction.walletAddress,
          amount: parseFloat(transaction.amount.toString()),
          currency: transaction.token.symbol,
        },
      });
    } catch (tatumError) {
      console.error('❌ Ошибка Tatum:', tatumError.message);
      res.json({
        success: true,
        data: {
          status: transaction.status,
          amount: parseFloat(transaction.amount.toString()),
          currency: transaction.token.symbol,
        },
      });
    }
  } catch (error) {
    console.error('❌ Ошибка проверки статуса:', error.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки статуса платежа',
    });
  }
});

/**
 * 🎁 ОБНОВЛЕННЫЙ WEBHOOK: Автоматическое пополнение + начисление реферальных бонусов
 * POST /api/v1/wallet/webhook/deposit
 */
router.post('/api/v1/wallet/webhook/deposit', async (req, res) => {
  try {
    const { address, value, txId, type } = req.body;

    console.log(`🔔 Вебхук получен: ${value} на ${address}`);

    // 1️⃣ Находим транзакцию по адресу
    const transaction = await prisma.transaction.findFirst({
      where: {
        walletAddress: address,
        status: 'PENDING',
        type: 'DEPOSIT',
      },
    });

    if (!transaction) {
      console.log('⚠️ Транзакция не найдена');
      return res.status(404).json({ success: false });
    }

    // 2️⃣ Проверяем статус в Tatum
    try {
      const txStatus = await tatumService.getTransactionStatus(txId);

      if (txStatus.status !== 'SUCCESS') {
        console.log('⏳ Платеж еще в обработке');
        return res.json({ success: true, message: 'Pending' });
      }
    } catch (tatumError) {
      console.error('⚠️ Не удалось проверить статус в Tatum:', tatumError.message);
    }

    // 3️⃣ Обновляем статус платежа
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        txHash: txId,
      },
    });

    console.log(`✅ Платеж подтвержден: ${txId}`);

    // 4️⃣ Пополняем баланс пользователя
    let balance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: {
          userId: transaction.userId,
          tokenId: transaction.tokenId,
          type: 'MAIN',
        },
      },
    });

    if (!balance) {
      balance = await prisma.balance.create({
        data: {
          userId: transaction.userId,
          tokenId: transaction.tokenId,
          type: 'MAIN',
          amount: parseFloat(value),
        },
      });
    } else {
      balance = await prisma.balance.update({
        where: { id: balance.id },
        data: {
          amount: {
            increment: parseFloat(value),
          },
        },
      });
    }

    const token = await prisma.cryptoToken.findUnique({
      where: { id: transaction.tokenId },
    });

    console.log(`💰 Баланс пополнен: ${value} ${token?.symbol} для пользователя ${transaction.userId}`);

    // 5️⃣ 🎁 НОВОЕ: Начисляем бонус рефереру если он есть
    try {
      const user = await prisma.user.findUnique({
        where: { id: transaction.userId },
        select: {
          referredById: true,
          referrer: {
            select: { id: true, username: true },
          },
        },
      });

      if (user?.referrer) {
        const bonusPercentage = 10;
        const bonusAmount = (parseFloat(value) * bonusPercentage) / 100;

        console.log(`🎁 Начисляю бонус рефереру: ${bonusAmount} ${token?.symbol}`);

        // Получаем или создаем баланс реферера
        let referrerBalance = await prisma.balance.findUnique({
          where: {
            userId_tokenId_type: {
              userId: user.referrer.id,
              tokenId: transaction.tokenId,
              type: 'MAIN',
            },
          },
        });

        if (!referrerBalance) {
          referrerBalance = await prisma.balance.create({
            data: {
              userId: user.referrer.id,
              tokenId: transaction.tokenId,
              type: 'MAIN',
              amount: bonusAmount,
            },
          });
        } else {
          referrerBalance = await prisma.balance.update({
            where: { id: referrerBalance.id },
            data: {
              amount: {
                increment: bonusAmount,
              },
            },
          });
        }

        // Записываем транзакцию реферального вознаграждения
        await prisma.referralTransaction.create({
          data: {
            referrerId: user.referrer.id,
            refereeId: transaction.userId,
            tokenId: transaction.tokenId,
            eventType: 'DEPOSIT_BONUS',
            amount: bonusAmount,
            sourceEntityId: transaction.id,
            sourceEntityType: 'Transaction',
          },
        });

        console.log(`✅ Бонус ${bonusAmount} ${token?.symbol} начислен рефереру ${user.referrer.username}`);
      } else {
        console.log(`ℹ️ Пользователь ${transaction.userId} не имеет реферера`);
      }
    } catch (referralError) {
      console.error('⚠️ Ошибка при начислении реферального бонуса:', referralError.message);
    }

    res.json({
      success: true,
      message: 'Balance topped up',
    });
  } catch (error) {
    console.error('❌ Ошибка вебхука:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Пополнить баланс (СТАРЫЙ ENDPOINT - НЕ ТРОГАЕМ)
 * POST /api/v1/wallet/deposit
 */
router.post('/api/v1/wallet/deposit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tokenId, amount } = req.body;

    if (!tokenId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokenId or amount',
      });
    }

    const token = await prisma.cryptoToken.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found',
      });
    }

    let balance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: {
          userId,
          tokenId,
          type: 'MAIN',
        },
      },
    });

    if (!balance) {
      balance = await prisma.balance.create({
        data: {
          userId,
          tokenId,
          type: 'MAIN',
          amount,
        },
      });
    } else {
      balance = await prisma.balance.update({
        where: { id: balance.id },
        data: {
          amount: {
            increment: amount,
          },
        },
      });
    }

    await prisma.transaction.create({
      data: {
        userId,
        tokenId,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amount,
        walletAddress: req.body.walletAddress || null,
      },
    });

    console.log(`✅ User ${userId} deposited ${amount} ${token.symbol}`);

    res.json({
      success: true,
      data: {
        newBalance: parseFloat(balance.amount.toString()),
        token: token.symbol,
      },
    });
  } catch (error) {
    console.error('❌ Error processing deposit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process deposit',
    });
  }
});

/**
 * Вывести средства
 * POST /api/v1/wallet/withdraw
 */
router.post('/api/v1/wallet/withdraw', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tokenId, amount, walletAddress } = req.body;

    if (!tokenId || !amount || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const balance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: {
          userId,
          tokenId,
          type: 'MAIN',
        },
      },
    });

    if (!balance || balance.amount < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
    }

    const newBalance = await prisma.balance.update({
      where: { id: balance.id },
      data: {
        amount: {
          decrement: amount,
        },
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        tokenId,
        type: 'WITHDRAW',
        status: 'PENDING',
        amount,
        walletAddress,
      },
    });

    console.log(`✅ User ${userId} requested withdrawal of ${amount}`);

    res.json({
      success: true,
      data: {
        newBalance: parseFloat(newBalance.amount.toString()),
        status: 'PENDING',
        message: 'Withdrawal request submitted',
      },
    });
  } catch (error) {
    console.error('❌ Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal',
    });
  }
});

/**
 * История транзакций
 * GET /api/v1/wallet/history
 */
router.get('/api/v1/wallet/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        include: {
          token: {
            select: {
              symbol: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: { userId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          amount: parseFloat(t.amount.toString()),
          token: t.token.symbol,
          date: t.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
    });
  }
});

module.exports = router;