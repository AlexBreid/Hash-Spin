const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const tatumService = require('../services/tatumService');
const logger = require('../utils/logger');

/**
 * Получить баланс пользователя
 * GET /api/v1/wallet/balance
 */
// УДАЛЕНО: Дублирующий endpoint, используется из balanceRoutes.js
// router.get('/api/v1/wallet/balance', ...) - перенесен в balanceRoutes.js

/**
 * ⭐ ENDPOINT: Получить или создать кошелек пользователя для валюты
 * GET /api/v1/wallet/wallet/:tokenId
 * Как в Stake - каждая валюта имеет свой отдельный кошелек
 */
router.get('/api/v1/wallet/wallet/:tokenId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokenId = parseInt(req.params.tokenId);

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный tokenId'
      });
    }

    const walletService = require('../services/walletService');
    const wallet = await walletService.getOrCreateWallet(userId, tokenId);

    res.json({
      success: true,
      data: {
        id: wallet.id,
        address: wallet.address,
        network: wallet.network,
        token: {
          id: wallet.token.id,
          symbol: wallet.token.symbol,
          name: wallet.token.name,
          network: wallet.token.network
        },
        isActive: wallet.isActive,
        lastUsedAt: wallet.lastUsedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения кошелька',
      error: error.message,
    });
  }
});

/**
 * ⭐ ENDPOINT: Получить все кошельки пользователя
 * GET /api/v1/wallet/wallets
 */
router.get('/api/v1/wallet/wallets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const walletService = require('../services/walletService');
    const wallets = await walletService.getUserWallets(userId);

    res.json({
      success: true,
      data: wallets.map(w => ({
        id: w.id,
        address: w.address,
        network: w.network,
        token: {
          id: w.token.id,
          symbol: w.token.symbol,
          name: w.token.name,
          network: w.token.network
        },
        isActive: w.isActive,
        lastUsedAt: w.lastUsedAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения кошельков',
      error: error.message,
    });
  }
});

/**
 * ⭐ НОВЫЙ ENDPOINT: Получить максимальные ставки для всех валют
 * GET /api/v1/wallet/bet-limits
 */
router.get('/api/v1/wallet/bet-limits', async (req, res) => {
  try {
    const currencySyncService = require('../services/currencySyncService');
    const tokens = await prisma.cryptoToken.findMany({
      orderBy: [
        { symbol: 'asc' },
        { network: 'asc' }
      ]
    });

    const limits = tokens.map(token => ({
      tokenId: token.id,
      symbol: token.symbol,
      network: token.network,
      minBet: currencySyncService.getMinBetForCurrency(token.symbol),
      maxBet: currencySyncService.getMaxBetForCurrency(token.symbol),
      rateUSD: currencySyncService.CURRENCY_RATES[token.symbol] || 1.0
    }));

    res.json({
      success: true,
      data: limits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения лимитов ставок',
      error: error.message,
    });
  }
});

/**
 * ⭐ НОВЫЙ ENDPOINT: Получить базовые токены для балансов
 * GET /api/v1/wallet/tokens
 * 
 * Возвращает ТОЛЬКО базовые токены (USDT, USDC, BTC, etc.)
 * Для пополнения используйте /api/v1/wallet/deposit-options
 */
const tokensCache = {
  data: null,
  timestamp: 0,
  ttl: 5000 // 5 секунд
};

const currencySyncService = require('../services/currencySyncService');

router.get('/api/v1/wallet/tokens', async (req, res) => {
  try {
    // Проверяем кэш
    const now = Date.now();
    if (tokensCache.data && (now - tokensCache.timestamp) < tokensCache.ttl) {
      return res.json({
        success: true,
        data: tokensCache.data,
        cached: true
      });
    }
    
    // Получаем базовые токены для балансов
    const baseTokens = await currencySyncService.getBaseTokens();

    if (baseTokens.length === 0) {
      // Fallback: возвращаем все токены
      const allTokens = await prisma.cryptoToken.findMany({
        select: {
          id: true,
          symbol: true,
          name: true,
          network: true,
          decimals: true,
        },
        orderBy: [{ symbol: 'asc' }],
      });
      
      // Группируем по символу — берём первый токен для каждого символа
      const uniqueTokens = [];
      const seen = new Set();
      for (const token of allTokens) {
        if (!seen.has(token.symbol)) {
          seen.add(token.symbol);
          uniqueTokens.push(token);
        }
      }
      
      tokensCache.data = uniqueTokens;
      tokensCache.timestamp = Date.now();
      
      return res.json({
        success: true,
        data: uniqueTokens,
        cached: false
      });
    }

    // Обновляем кэш
    tokensCache.data = baseTokens;
    tokensCache.timestamp = Date.now();

    res.json({
      success: true,
      data: baseTokens,
      cached: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения списка токенов',
      error: error.message,
    });
  }
});

/**
 * ⭐ НОВЫЙ ENDPOINT: Получить балансы с детализацией по сетям для вывода
 * GET /api/v1/wallet/withdraw-options
 * 
 * Возвращает все балансы пользователя с информацией о токенах и сетях
 */
router.get('/api/v1/wallet/withdraw-options', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Получаем все балансы пользователя с токенами
    const balances = await prisma.balance.findMany({
      where: { 
        userId: userId,
        type: 'MAIN',
        amount: { gt: 0 }
      },
      include: {
        token: {
          select: {
            id: true,
            symbol: true,
            name: true,
            network: true,
            decimals: true
          }
        }
      }
    });
    
    // Группируем по символу валюты
    const grouped = {};
    
    for (const bal of balances) {
      if (!bal.token) continue;
      // Пропускаем XTR (Stars)
      if (bal.token.symbol === 'XTR') continue;
      
      const symbol = bal.token.symbol;
      const amount = parseFloat(bal.amount.toString()) || 0;
      
      if (!grouped[symbol]) {
        grouped[symbol] = {
          symbol: symbol,
          name: bal.token.name,
          totalBalance: 0,
          networks: []
        };
      }
      
      grouped[symbol].totalBalance += amount;
      grouped[symbol].networks.push({
        tokenId: bal.token.id,
        network: bal.token.network,
        balance: amount,
        decimals: bal.token.decimals
      });
    }
    
    // Преобразуем в массив и сортируем по балансу
    const result = Object.values(grouped)
      .filter(t => t.totalBalance > 0)
      .sort((a, b) => b.totalBalance - a.totalBalance);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения опций вывода',
      error: error.message
    });
  }
});

/**
 * ⭐ НОВЫЙ ENDPOINT: Получить сети для пополнения конкретной валюты
 * GET /api/v1/wallet/deposit-networks/:symbol
 * 
 * Возвращает список сетей для пополнения (TRC-20, ERC-20, BEP-20 и т.д.)
 */
router.get('/api/v1/wallet/deposit-networks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Не указан символ валюты'
      });
    }
    
    const networks = currencySyncService.getDepositNetworks(symbol);
    
    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        networks: networks
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения списка сетей',
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

    const addressData = await tatumService.createDepositAddress(userId);
    const token = await prisma.cryptoToken.findFirst({
      where: {
        symbol: 'USDT',
        network: 'TRC-20',
      },
    });

    if (!token) {
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

    // 1️⃣ Находим транзакцию по адресу
    const transaction = await prisma.transaction.findFirst({
      where: {
        walletAddress: address,
        status: 'PENDING',
        type: 'DEPOSIT',
      },
    });

    if (!transaction) {
      return res.status(404).json({ success: false });
    }

    // 2️⃣ Проверяем статус в Tatum
    try {
      const txStatus = await tatumService.getTransactionStatus(txId);

      if (txStatus.status !== 'SUCCESS') {
        return res.json({ success: true, message: 'Pending' });
      }
    } catch (tatumError) {
      }

    // 3️⃣ Обновляем статус платежа
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        txHash: txId,
      },
    });

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

        } else {
        }
    } catch (referralError) {
      }

    res.json({
      success: true,
      message: 'Balance topped up',
    });
  } catch (error) {
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

    res.json({
      success: true,
      data: {
        newBalance: parseFloat(balance.amount.toString()),
        token: token.symbol,
      },
    });
  } catch (error) {
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
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Session invalid: no user in token. Please log in again (this is the login/Bearer token, not the currency).',
      });
    }

    let userExists;
    let balance;
    let token;
    try {
      userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
    } catch (dbErr) {
      logger.error('WITHDRAWAL', 'Database error checking user', { code: dbErr?.code, message: dbErr?.message });
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable. Please try again later.',
      });
    }
    if (!userExists) {
      return res.status(401).json({
        success: false,
        error: 'Session invalid: user not found in database. Please log in again (use Telegram or login page to get a new token).',
      });
    }

    const { tokenId, amount, walletAddress } = req.body;

    if (tokenId == null || amount == null || walletAddress == null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    const tokenIdInt = parseInt(Number(tokenId), 10);
    if (isNaN(tokenIdInt) || tokenIdInt < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokenId',
      });
    }
    // Нормалізація: amount і walletAddress можуть прийти числом/рядком з фронту
    const rawAmount = Number(amount);
    const rawWalletAddress = typeof walletAddress === 'string' ? walletAddress : String(walletAddress || '').trim();

    try {
      balance = await prisma.balance.findUnique({
        where: {
          userId_tokenId_type: {
            userId,
            tokenId: tokenIdInt,
            type: 'MAIN',
          },
        },
      });
      token = await prisma.cryptoToken.findUnique({
        where: { id: tokenIdInt }
      });
    } catch (dbErr) {
      logger.error('WITHDRAWAL', 'Database error loading balance/token', { code: dbErr?.code, message: dbErr?.message });
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable. Please try again later.',
      });
    }

    if (!balance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token not found',
      });
    }

    if (!token.symbol || token.network == null || token.network === '') {
      return res.status(400).json({
        success: false,
        error: 'Token or network not configured for withdrawal',
      });
    }

    // Сравниваем числа (Prisma Decimal может вернуть объект)
    const balanceNum = parseFloat(balance.amount);
    const amountNum = Number.isFinite(rawAmount) ? rawAmount : parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || balanceNum < amountNum) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance or invalid amount',
      });
    }

    // CryptoCloud: мінімум виводу 10 USDT (uncorrected_amount)
    const MIN_CRYPTO_WITHDRAWAL = 10;
    if (amountNum < MIN_CRYPTO_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal amount is ${MIN_CRYPTO_WITHDRAWAL} USDT`,
      });
    }

    // Адресу форматом не валідуємо — чи підходить адреса для цієї валюти/мережі вирішує CryptoCloud при виводі.
    // Тут тільки: порожня перевірка, trim, виправлення подвоєння (якщо фронт відправив адресу двічі).
    let normalizedWalletAddress = rawWalletAddress.trim();
    if (!normalizedWalletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }
    const net = (token.network || '').toUpperCase();
    if (net.includes('TRC') && normalizedWalletAddress.length === 68 && normalizedWalletAddress.slice(0, 34) === normalizedWalletAddress.slice(34)) {
      normalizedWalletAddress = normalizedWalletAddress.slice(0, 34);
    }
    if ((net.includes('ERC') || net.includes('BEP')) && normalizedWalletAddress.length === 84 && normalizedWalletAddress.slice(0, 42) === normalizedWalletAddress.slice(42)) {
      normalizedWalletAddress = normalizedWalletAddress.slice(0, 42);
    }

    // Код валюти для CryptoCloud (має бути типу USDT_TRC20, не лише USDT)
    const cryptoCloudService = require('../services/cryptoCloudService');
    const currencyCode = cryptoCloudService.getCryptoCloudCurrency(token.symbol, token.network);
    if (!currencyCode || currencyCode === (token.symbol || '').toUpperCase()) {
      return res.status(400).json({
        success: false,
        error: `Withdrawal not supported for ${token.symbol} ${token.network}. CryptoCloud code not found.`,
        tokenSymbol: token.symbol,
        tokenNetwork: token.network,
      });
    }
    try {
      const cryptoBalance = await cryptoCloudService.getWithdrawBalance();
      const availableInCryptoCloud = cryptoCloudService.getWithdrawBalanceForCurrency(cryptoBalance, currencyCode);
      logger.info('WITHDRAWAL', 'CryptoCloud balance check (before deduct)', {
        availableInCryptoCloud,
        requestedAmount: amountNum,
        currencyCode
      });
      if (typeof availableInCryptoCloud === 'number' && availableInCryptoCloud < amountNum) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient funds on your CryptoCloud wallet. Please top up the merchant balance in CryptoCloud.',
        });
      }
    } catch (balanceError) {
      logger.warn('WITHDRAWAL', 'Failed to check CryptoCloud balance', { error: balanceError.message });
    }

    // Списываем баланс (Prisma приймає number для Decimal)
    const newBalance = await prisma.balance.update({
      where: { id: balance.id },
      data: {
        amount: {
          decrement: amountNum,
        },
      },
    });

    // Создаем транзакцию в БД (з нормалізованою адресою; amount як number для Decimal)
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        tokenId: tokenIdInt,
        type: 'WITHDRAW',
        status: 'PENDING',
        amount: amountNum,
        walletAddress: normalizedWalletAddress,
      },
    });

    // ✅ ОТПРАВЛЯЕМ ВЫВОД В CRYPTOCLOUD (currencyCode вже є вище)
    try {
      logger.info('WITHDRAWAL', 'Sending withdrawal to CryptoCloud', {
        transactionId: transaction.id,
        userId,
        tokenSymbol: token.symbol,
        tokenNetwork: token.network,
        currencyCode,
        amount,
        amountType: typeof amount,
        walletAddress: normalizedWalletAddress.substring(0, 10) + '...',
        fullWalletAddress: normalizedWalletAddress
      });

      // Сумма вже перевірена зверху (amountNum)
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        throw new Error('Invalid withdrawal amount');
      }

      // Отправляем вывод в CryptoCloud
      let withdrawResult;
      try {
        withdrawResult = await cryptoCloudService.withdraw(
          currencyCode,
          normalizedWalletAddress,
          amountNum
        );
      } catch (withdrawError) {
        // Если ошибка уже обработана в cryptoCloudService, она будет иметь message
        // Но на всякий случай обрабатываем и здесь
        let errorMsg = 'Failed to send withdrawal to CryptoCloud';
        if (withdrawError && typeof withdrawError === 'object') {
          if (withdrawError.message && typeof withdrawError.message === 'string') {
            errorMsg = withdrawError.message;
          } else if (withdrawError.response?.data) {
            const apiError = withdrawError.response.data;
            if (typeof apiError === 'string') {
              errorMsg = apiError;
            } else if (apiError && typeof apiError === 'object') {
              if (apiError.detail) {
                errorMsg = String(apiError.detail);
              } else if (apiError.message) {
                errorMsg = String(apiError.message);
              } else {
                try {
                  errorMsg = JSON.stringify(apiError);
                } catch {
                  errorMsg = 'Unknown API error';
                }
              }
            }
          }
        }
        throw new Error(errorMsg);
      }

      if (withdrawResult && withdrawResult.success) {
        // Обновляем транзакцию с ID вывода из CryptoCloud
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            txHash: withdrawResult.txId || withdrawResult.data?.id || 'pending',
            status: 'PROCESSING' // Меняем статус на PROCESSING, так как отправлено в CryptoCloud
          }
        });

        logger.info('WITHDRAWAL', 'Withdrawal sent to CryptoCloud successfully', {
          transactionId: transaction.id,
          cryptoCloudTxId: withdrawResult.txId
        });

        const newBalanceNum = newBalance?.amount != null
          ? parseFloat(String(newBalance.amount))
          : 0;
        res.json({
          success: true,
          data: {
            newBalance: newBalanceNum,
            status: 'PROCESSING',
            message: 'Withdrawal request submitted and sent to CryptoCloud',
            transactionId: transaction.id
          },
        });
      } else {
        // Если не удалось отправить в CryptoCloud, возвращаем баланс
        await prisma.balance.update({
          where: { id: balance.id },
          data: {
            amount: {
              increment: amountNum,
            },
          },
        });

        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED'
          }
        });

        logger.error('WITHDRAWAL', 'Failed to send withdrawal to CryptoCloud', {
          transactionId: transaction.id,
          error: withdrawResult.error || 'Unknown error'
        });

        return res.status(500).json({
          success: false,
          error: withdrawResult?.error || 'Failed to send withdrawal to CryptoCloud',
          currencyCode,
          tokenSymbol: token?.symbol,
          tokenNetwork: token?.network,
        });
      }
    } catch (cryptoCloudError) {
      // Если ошибка при отправке в CryptoCloud, возвращаем баланс (безопасный откат)
      try {
        await prisma.balance.update({
          where: { id: balance.id },
          data: {
            amount: {
              increment: amountNum,
            },
          },
        });
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED' }
        });
      } catch (rollbackError) {
        logger.error('WITHDRAWAL', 'Rollback failed after CryptoCloud error', {
          transactionId: transaction.id,
          rollbackError: rollbackError?.message,
        });
      }

      // Безопасно извлекаем сообщение об ошибке для логирования
      let logError = 'Unknown error';
      if (cryptoCloudError) {
        if (typeof cryptoCloudError === 'string') {
          logError = cryptoCloudError;
        } else if (cryptoCloudError.message) {
          if (typeof cryptoCloudError.message === 'string') {
            logError = cryptoCloudError.message;
          } else {
            try {
              logError = JSON.stringify(cryptoCloudError.message);
            } catch {
              logError = 'Error object (cannot stringify)';
            }
          }
        } else {
          try {
            logError = JSON.stringify(cryptoCloudError);
          } catch {
            logError = 'Error object (cannot stringify)';
          }
        }
      }

      logger.error('WITHDRAWAL', 'Error sending withdrawal to CryptoCloud', {
        transactionId: transaction.id,
        error: logError,
        errorStack: cryptoCloudError?.stack,
        errorResponse: cryptoCloudError?.response?.data,
        errorType: typeof cryptoCloudError,
        errorMessageType: typeof cryptoCloudError?.message,
        fullError: cryptoCloudError
      });

      // Формируем понятное сообщение об ошибке для пользователя
      let errorMessage = 'Failed to process withdrawal';
      
      // Проверяем разные источники ошибки
      if (cryptoCloudError) {
        // Если это строка
        if (typeof cryptoCloudError === 'string') {
          errorMessage = cryptoCloudError;
        }
        // Если это объект Error с message
        else if (cryptoCloudError.message) {
          if (typeof cryptoCloudError.message === 'string') {
            errorMessage = cryptoCloudError.message;
          } else if (cryptoCloudError.message.detail) {
            errorMessage = String(cryptoCloudError.message.detail);
          } else if (cryptoCloudError.message.message) {
            errorMessage = String(cryptoCloudError.message.message);
          } else {
            try {
              errorMessage = JSON.stringify(cryptoCloudError.message);
            } catch {
              errorMessage = 'Unknown error';
            }
          }
        }
        // Если есть response.data
        else if (cryptoCloudError.response?.data) {
          const apiError = cryptoCloudError.response.data;
          
          if (typeof apiError === 'string') {
            errorMessage = apiError;
          } else if (apiError && typeof apiError === 'object') {
            // Проверяем разные поля в объекте
            if (apiError.detail) {
              errorMessage = String(apiError.detail);
            } else if (apiError.message) {
              errorMessage = String(apiError.message);
            } else if (apiError.error) {
              errorMessage = String(apiError.error);
            } else {
              // Преобразуем весь объект в JSON
              try {
                errorMessage = JSON.stringify(apiError);
              } catch (e) {
                errorMessage = 'Unknown API error';
              }
            }
          }
        }
        // Если это просто объект
        else if (typeof cryptoCloudError === 'object') {
          try {
            errorMessage = JSON.stringify(cryptoCloudError);
          } catch (e) {
            errorMessage = 'Unknown error';
          }
        }
      }
      
      // Финальная проверка - убеждаемся, что errorMessage - это строка
      if (typeof errorMessage !== 'string') {
        try {
          errorMessage = JSON.stringify(errorMessage);
        } catch {
          errorMessage = 'Failed to process withdrawal: Unknown error';
        }
      }

      // Финальная проверка - убеждаемся, что errorMessage - это строка
      let finalErrorMessage = 'Failed to process withdrawal';
      
      if (errorMessage && typeof errorMessage === 'string') {
        finalErrorMessage = errorMessage;
      } else if (errorMessage) {
        // Если это не строка, пробуем преобразовать
        try {
          if (typeof errorMessage === 'object') {
            // Пробуем извлечь понятное сообщение из объекта
            if (errorMessage.detail) {
              finalErrorMessage = String(errorMessage.detail);
            } else if (errorMessage.message) {
              finalErrorMessage = String(errorMessage.message);
            } else if (errorMessage.error) {
              finalErrorMessage = String(errorMessage.error);
            } else {
              finalErrorMessage = JSON.stringify(errorMessage);
            }
          } else {
            finalErrorMessage = String(errorMessage);
          }
        } catch (e) {
          finalErrorMessage = 'Failed to process withdrawal: Unknown error';
        }
      }

      // Финальная гарантия - всегда строка; не отдаём "[object Object]"
      finalErrorMessage = String(finalErrorMessage);
      if (finalErrorMessage === '[object Object]' && cryptoCloudError?.response?.data?.result?.error) {
        const err = cryptoCloudError.response.data.result.error;
        if (err?.code === 'uncorrected_amount') {
          finalErrorMessage = `Minimum withdrawal amount is ${err.value_min != null ? err.value_min : 10} USDT`;
        } else {
          finalErrorMessage = err?.message || err?.code || 'Withdrawal failed';
        }
      }

      logger.error('WITHDRAWAL', 'Final error message', {
        errorMessage: finalErrorMessage,
        errorMessageType: typeof finalErrorMessage,
        originalErrorType: typeof errorMessage,
        errorMessageLength: finalErrorMessage.length,
        errorMessagePreview: finalErrorMessage.substring(0, 200)
      });

      // Якщо помилка про недостатні кошти в CryptoCloud — одне зрозуміле повідомлення
      const isInsufficientFunds = /insufficient|недостаточно|not enough|balance|баланс|low balance/i.test(finalErrorMessage);
      if (isInsufficientFunds) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient funds on your CryptoCloud wallet. Please top up the merchant balance in CryptoCloud.',
        });
      }
      // Інші помилки валідації/від провайдера — 400
      const isValidationError = /minimum|uncorrected_amount|invalid address|network|адрес|сеть|сумма/i.test(finalErrorMessage);
      const statusCode = isValidationError ? 400 : 500;
      let clientError = String(finalErrorMessage);
      if (isValidationError && /uncorrected_amount/i.test(finalErrorMessage) && amountNum >= 10) {
        clientError = 'CryptoCloud rejected the amount (uncorrected_amount). Check amount format and limits in CryptoCloud docs, or contact their support.';
      }
      const payload = {
        success: false,
        error: clientError,
        currencyCode: currencyCode || undefined,
        tokenSymbol: token?.symbol,
        tokenNetwork: token?.network,
      };
      if (cryptoCloudError?.cryptoCloudError) {
        payload.cryptoCloudError = cryptoCloudError.cryptoCloudError;
      }
      return res.status(statusCode).json(payload);
    }
  } catch (error) {
    if (res.headersSent) return;

    const msg = (error?.message || String(error)) || '';
    const msgLower = msg.toLowerCase();

    // Prisma/БД: таймаут, недоступність — не показувати технічне повідомлення, віддати 503
    const isPrismaOrDbError = (error?.code && String(error.code).startsWith('P')) ||
      (error?.constructor?.name && /Prisma|P1001|P2024/i.test(error.constructor.name));
    if (isPrismaOrDbError) {
      logger.error('WITHDRAWAL', 'Database error during withdraw', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack,
      });
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable. Please try again later.',
      });
    }

    // Користувача за цим токеном не знайдено в БД (наприклад Prisma/ORM повідомлення)
    const isUserNotFound =
      /user.*not found|user not found/i.test(msgLower) ||
      (msgLower.includes('пользователь') && msgLower.includes('не найден')) ||
      /токену не найден|данному токену|соответствующий.*токену/i.test(msgLower);
    if (isUserNotFound) {
      return res.status(401).json({
        success: false,
        error: 'Session invalid: user not found in database. Please log in again (Telegram or login page).',
      });
    }

    logger.error('WITHDRAWAL', 'Unhandled error in withdraw', {
      error: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process withdrawal',
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
              network: true,
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
          currency: t.token.symbol,
          network: t.token.network,
          txHash: t.txHash,
          walletAddress: t.walletAddress,
          createdAt: t.createdAt ? t.createdAt.toISOString() : null,
          rejectReason: t.rejectReason,
          approvedAt: t.approvedAt ? t.approvedAt.toISOString() : null,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ⭐ TELEGRAM STARS WITHDRAWAL ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

const starsWithdrawalService = require('../services/starsWithdrawalService');

/**
 * ⭐ GET /api/v1/wallet/withdraw/stars/limits
 * Получить лимиты вывода Stars
 */
router.get('/api/v1/wallet/withdraw/stars/limits', authenticateToken, async (req, res) => {
  try {
    const limits = starsWithdrawalService.getStarsWithdrawalLimits();
    
    res.json({
      success: true,
      data: limits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка получения лимитов'
    });
  }
});

/**
 * ⭐ POST /api/v1/wallet/withdraw/stars
 * Создать заявку на вывод Stars
 */
router.post('/api/v1/wallet/withdraw/stars', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { starsAmount, method = 'convert' } = req.body;
    
    if (!starsAmount) {
      return res.status(400).json({
        success: false,
        error: 'Укажите количество Stars'
      });
    }
    
    const result = await starsWithdrawalService.createStarsWithdrawal(
      userId,
      starsAmount,
      method
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка создания заявки'
    });
  }
});

/**
 * ⭐ GET /api/v1/wallet/withdraw/methods
 * Получить доступные методы вывода
 */
router.get('/api/v1/wallet/withdraw/methods', authenticateToken, async (req, res) => {
  try {
    const starsLimits = starsWithdrawalService.getStarsWithdrawalLimits();
    
    res.json({
      success: true,
      data: {
        methods: [
          {
            id: 'crypto',
            name: 'Криптовалюта',
            description: 'Вывод на внешний кошелёк',
            minAmount: 10,
            fee: '2.5%',
            processingTime: '1-24 часа',
            currencies: ['USDT', 'BTC', 'ETH', 'TRX', 'TON']
          },
          {
            id: 'stars',
            name: 'Telegram Stars',
            description: 'Конвертация Stars в USDT',
            minAmount: starsLimits.minWithdrawal,
            minAmountUSD: starsLimits.minWithdrawalUSD,
            fee: `${starsLimits.feePercent}%`,
            processingTime: '1-24 часа',
            rate: starsLimits.rate
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📋 GET /api/v1/wallet/withdrawals
 * Получить список заявок на вывод пользователя
 */
router.get('/api/v1/wallet/withdrawals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;
    
    const withdrawals = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'WITHDRAW'
      },
      include: {
        token: { select: { symbol: true, name: true, network: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    res.json({
      success: true,
      data: withdrawals.map(w => ({
        id: w.id,
        amount: parseFloat(w.amount.toString()),
        currency: w.token.symbol,
        network: w.token.network,
        status: w.status,
        txHash: w.txHash,
        walletAddress: w.walletAddress,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка получения списка выводов'
    });
  }
});

module.exports = router;

