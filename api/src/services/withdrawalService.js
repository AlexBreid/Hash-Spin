/**
 * ✅ ИСПРАВЛЕННАЯ СИСТЕМА ВЫВОДА СРЕДСТВ
 * Использует Crypto Pay Transfer API вместо ручного ввода адреса
 * КОПИРУЙ В: src/bot/withdrawalService.js
 */

const axios = require('axios');
const prisma = require('../../prismaClient');
const logger = require('../utils/logger');

const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;

/**
 * ✅ Отправить средства пользователю через Crypto Pay Transfer
 */
async function transferToUser(bot, userId, amount, asset = 'USDT', walletAddress = null) {
  console.log(`\n💸 [TRANSFER] Starting transfer to user ${userId}`);
  console.log(`   Amount: ${amount.toFixed(8)} ${asset}`);
  console.log(`   Via: Crypto Pay Transfer API`);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, telegramId: true, username: true }
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // ✅ Генерируем уникальный spend_id для идемпотентности
    const spendId = `withdraw_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`   Telegram ID: ${user.telegramId}`);
    console.log(`   Spend ID: ${spendId}`);

    // ✅ Вызываем transfer API
    const response = await axios.post(
      `${CRYPTO_PAY_API}/transfer`,
      {
        user_id: parseInt(user.telegramId),
        asset: String(asset).toUpperCase(),
        amount: amount.toFixed(8).toString(),
        spend_id: spendId,
        comment: `Withdrawal from SafariX Casino - ${amount.toFixed(8)} ${asset}`
      },
      {
        headers: {
          'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log(`\n📡 [TRANSFER] API Response:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   OK: ${response.data.ok}`);

    if (!response.data.ok) {
      const errorMsg = response.data.error?.message || 'Unknown error';
      console.error(`❌ [TRANSFER] API Error: ${errorMsg}`);
      logger.error('WITHDRAWAL', `Crypto Pay transfer error`, {
        userId,
        amount: amount.toFixed(8),
        error: errorMsg,
        response: response.data
      });
      throw new Error(`Transfer failed: ${errorMsg}`);
    }

    const transfer = response.data.result;
    
    console.log(`✅ [TRANSFER] Transfer successful!`);
    console.log(`   Transfer ID: ${transfer.transfer_id}`);
    console.log(`   Status: ${transfer.status}`);
    console.log(`   Amount: ${transfer.amount} ${transfer.asset}`);

    return {
      success: true,
      transferId: transfer.transfer_id,
      status: transfer.status,
      amount: parseFloat(transfer.amount),
      asset: transfer.asset
    };

  } catch (error) {
    console.error(`❌ [TRANSFER] Error:`, error.message);
    logger.error('WITHDRAWAL', `Transfer error`, {
      userId,
      amount: amount.toFixed(8),
      error: error.message,
      stack: error.stack
    });

    // Определяем тип ошибки для пользователя
    let userMessage = '❌ Ошибка при отправке средств';
    
    if (error.message.includes('User')) {
      userMessage = '❌ Пользователь не найден в системе Crypto Pay';
    } else if (error.message.includes('balance')) {
      userMessage = '❌ Недостаточно средств на счёте платформы';
    } else if (error.message.includes('API')) {
      userMessage = '❌ Ошибка сервиса платежей. Попробуйте позже';
    }

    return {
      success: false,
      error: error.message,
      userMessage
    };
  }
}

/**
 * ✅ Обработать заявку на вывод (из админ панели)
 */
async function processWithdrawal(bot, withdrawalId, approve = true) {
  console.log(`\n💸 [WITHDRAWAL] Processing withdrawal #${withdrawalId} - ${approve ? 'APPROVE' : 'REJECT'}`);

  try {
    const withdrawal = await prisma.transaction.findUnique({
      where: { id: withdrawalId },
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        tokenId: true,
        createdAt: true
      }
    });

    if (!withdrawal) {
      throw new Error(`Withdrawal #${withdrawalId} not found`);
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error(`Withdrawal status is ${withdrawal.status}, expected PENDING`);
    }

    const token = await prisma.cryptoToken.findUnique({
      where: { id: withdrawal.tokenId }
    });

    const amount = parseFloat(withdrawal.amount.toString());

    if (approve) {
      console.log(`✅ Approving withdrawal...`);
      
      // ✅ Отправляем средства через Transfer API
      const transferResult = await transferToUser(bot, withdrawal.userId, amount, token.symbol);

      if (!transferResult.success) {
        // Если transfer не прошёл, откатываем статус и возвращаем ошибку
        console.error(`❌ Transfer failed:`, transferResult.error);
        logger.error('WITHDRAWAL', `Transfer failed for withdrawal ${withdrawalId}`, {
          error: transferResult.error
        });

        throw new Error(`Transfer failed: ${transferResult.error}`);
      }

      // ✅ Обновляем статус в БД
      const updated = await prisma.transaction.update({
        where: { id: withdrawalId },
        data: {
          status: 'COMPLETED',
          txHash: `TRANSFER_${transferResult.transferId}`,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Withdrawal #${withdrawalId} completed`);
      console.log(`   Transfer ID: ${transferResult.transferId}`);
      console.log(`   Status: ${transferResult.status}`);

      // ✅ Уведомляем пользователя
      const user = await prisma.user.findUnique({
        where: { id: withdrawal.userId },
        select: { telegramId: true }
      });

      if (user?.telegramId) {
        try {
          await bot.telegram.sendMessage(
            user.telegramId,
            `✅ *Ваш вывод одобрен и обработан!*\n\n` +
            `💰 Сумма: ${amount.toFixed(8)} ${token.symbol}\n` +
            `🔗 ID передачи: \`${transferResult.transferId}\`\n` +
            `⏰ Время: ${new Date().toLocaleString()}\n\n` +
            `Средства должны поступить в ваш кошелёк в течение нескольких минут.`,
            { parse_mode: 'Markdown' }
          );
          console.log(`   ✅ User notification sent`);
        } catch (e) {
          logger.warn('WITHDRAWAL', `Failed to notify user`, { error: e.message });
        }
      }

      return {
        success: true,
        withdrawalId,
        transferId: transferResult.transferId,
        amount,
        asset: token.symbol
      };

    } else {
      console.log(`❌ Rejecting withdrawal...`);

      // ✅ Отклоняем и возвращаем средства на баланс
      const updated = await prisma.$transaction(async (tx) => {
        // Обновляем статус
        const w = await tx.transaction.update({
          where: { id: withdrawalId },
          data: {
            status: 'REJECTED',
            updatedAt: new Date()
          }
        });

        // Возвращаем средства на баланс
        await tx.balance.update({
          where: {
            userId_tokenId_type: {
              userId: withdrawal.userId,
              tokenId: withdrawal.tokenId,
              type: 'MAIN'
            }
          },
          data: {
            amount: { increment: amount }
          }
        });

        return w;
      });

      console.log(`✅ Withdrawal #${withdrawalId} rejected`);
      console.log(`   Returned to user balance: ${amount.toFixed(8)} ${token.symbol}`);

      // ✅ Уведомляем пользователя
      const user = await prisma.user.findUnique({
        where: { id: withdrawal.userId },
        select: { telegramId: true }
      });

      if (user?.telegramId) {
        try {
          await bot.telegram.sendMessage(
            user.telegramId,
            `❌ *Ваш вывод отклонен*\n\n` +
            `💰 Сумма: ${amount.toFixed(8)} ${token.symbol}\n` +
            `💬 Средства вернулись на ваш счет в полном объёме.\n\n` +
            `Если у вас есть вопросы, свяжитесь с поддержкой через команду /help`,
            { parse_mode: 'Markdown' }
          );
          console.log(`   ✅ User notification sent`);
        } catch (e) {
          logger.warn('WITHDRAWAL', `Failed to notify user`, { error: e.message });
        }
      }

      return {
        success: true,
        withdrawalId,
        status: 'REJECTED',
        returnedAmount: amount,
        asset: token.symbol
      };
    }

  } catch (error) {
    console.error(`❌ [WITHDRAWAL] Error:`, error.message);
    logger.error('WITHDRAWAL', `Failed to process withdrawal ${withdrawalId}`, {
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}

/**
 * ✅ Проверить баланс платформы
 */
async function checkPlatformBalance(asset = 'USDT') {
  console.log(`\n💰 [BALANCE] Checking platform balance for ${asset}...`);

  try {
    const response = await axios.get(`${CRYPTO_PAY_API}/getBalance`, {
      headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN },
      timeout: 5000
    });

    if (!response.data.ok) {
      throw new Error(`API error: ${response.data.error?.message}`);
    }

    const balances = response.data.result?.assets || [];
    const assetBalance = balances.find(b => b.symbol === asset);

    if (assetBalance) {
      console.log(`✅ Platform balance (${asset}): ${assetBalance.amount} ${asset}`);
      return {
        asset,
        amount: parseFloat(assetBalance.amount),
        available: true
      };
    } else {
      console.warn(`⚠️ No balance found for ${asset}`);
      return {
        asset,
        amount: 0,
        available: false
      };
    }

  } catch (error) {
    console.error(`❌ [BALANCE] Error:`, error.message);
    logger.error('WITHDRAWAL', `Failed to check platform balance`, {
      error: error.message
    });

    return {
      asset,
      amount: 0,
      available: false,
      error: error.message
    };
  }
}

/**
 * ✅ Валидировать вывод перед обработкой
 */
async function validateWithdrawal(userId, amount, asset = 'USDT') {
  console.log(`\n✓ Validating withdrawal: User ${userId}, ${amount.toFixed(8)} ${asset}`);

  try {
    // 1. Проверить баланс пользователя
    const userBalance = await prisma.balance.findFirst({
      where: {
        userId,
        token: { symbol: asset },
        type: 'MAIN'
      }
    });

    if (!userBalance) {
      return {
        valid: false,
        error: 'User balance not found'
      };
    }

    const balance = parseFloat(userBalance.amount.toString());
    if (balance < amount) {
      return {
        valid: false,
        error: `Insufficient balance. Has: ${balance.toFixed(8)}, need: ${amount.toFixed(8)}`
      };
    }

    // 2. Проверить минимальную сумму
    if (amount < 1) {
      return {
        valid: false,
        error: 'Minimum withdrawal amount is 1 USDT'
      };
    }

    // 3. Проверить максимальную сумму
    if (amount > 25000) {
      return {
        valid: false,
        error: 'Maximum withdrawal amount is 25000 USDT'
      };
    }

    // 4. Проверить баланс платформы
    const platformBalance = await checkPlatformBalance(asset);
    if (!platformBalance.available) {
      return {
        valid: false,
        error: 'Platform balance not available'
      };
    }

    if (platformBalance.amount < amount) {
      return {
        valid: false,
        error: `Insufficient platform balance. Available: ${platformBalance.amount.toFixed(8)}, need: ${amount.toFixed(8)}`
      };
    }

    console.log(`✅ Validation passed`);
    return {
      valid: true,
      userBalance: balance,
      platformBalance: platformBalance.amount
    };

  } catch (error) {
    console.error(`❌ Validation error:`, error.message);
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * ✅ Создать заявку на вывод (новый подход - БЕЗ ввода адреса!)
 */
async function createWithdrawalRequest(bot, userId, amount, asset = 'USDT') {
  console.log(`\n📝 [WITHDRAWAL REQUEST] Creating withdrawal request`);
  console.log(`   User: ${userId}, Amount: ${amount.toFixed(8)} ${asset}`);

  try {
    // Валидируем вывод
    const validation = await validateWithdrawal(userId, amount, asset);
    
    if (!validation.valid) {
      console.error(`❌ Validation failed:`, validation.error);
      return {
        success: false,
        error: validation.error,
        userMessage: `❌ ${validation.error}`
      };
    }

    // Получаем токен
    const token = await prisma.cryptoToken.findFirst({
      where: { symbol: asset }
    });

    if (!token) {
      throw new Error(`Token ${asset} not found`);
    }

    // Создаём заявку
    const withdrawal = await prisma.$transaction(async (tx) => {
      // Резервируем средства
      const balance = await tx.balance.findUnique({
        where: {
          userId_tokenId_type: {
            userId,
            tokenId: token.id,
            type: 'MAIN'
          }
        }
      });

      if (!balance || parseFloat(balance.amount.toString()) < amount) {
        throw new Error('Balance check failed (race condition?)');
      }

      // Создаём транзакцию
      const tx_ = await tx.transaction.create({
        data: {
          userId,
          tokenId: token.id,
          type: 'WITHDRAW',
          status: 'PENDING',
          amount: amount.toFixed(8).toString(),
          walletAddress: 'CRYPTO_PAY_TRANSFER', // ✅ Указываем что это transfer
          txHash: null,
          createdAt: new Date()
        }
      });

      // Уменьшаем баланс
      await tx.balance.update({
        where: {
          userId_tokenId_type: {
            userId,
            tokenId: token.id,
            type: 'MAIN'
          }
        },
        data: {
          amount: { decrement: amount }
        }
      });

      return tx_;
    });

    console.log(`✅ Withdrawal request created: #${withdrawal.id}`);

    // Уведомляем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true }
    });

    if (user?.telegramId) {
      try {
        await bot.telegram.sendMessage(
          user.telegramId,
          `✅ *Заявка на вывод создана!*\n\n` +
          `💰 Сумма: ${amount.toFixed(8)} ${asset}\n` +
          `🎫 Номер: #${withdrawal.id}\n` +
          `⏳ Статус: На одобрение\n\n` +
          `Администратор рассмотрит вашу заявку в ближайшее время и отправит средства напрямую на ваш кошелёк.`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        logger.warn('WITHDRAWAL', `Failed to notify user`, { error: e.message });
      }
    }

    // Уведомляем админов
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { telegramId: true }
    });

    for (const admin of admins) {
      if (admin.telegramId) {
        try {
          await bot.telegram.sendMessage(
            admin.telegramId,
            `💸 НОВАЯ ЗАЯВКА НА ВЫВОД\n\n` +
            `🎫 ID: #${withdrawal.id}\n` +
            `👤 Пользователь: ${userId}\n` +
            `💰 Сумма: ${amount.toFixed(8)} ${asset}\n` +
            `⏰ Время: ${new Date().toLocaleString()}\n\n` +
            `Команды:\n` +
            `/approve_withdraw ${withdrawal.id}\n` +
            `/reject_withdraw ${withdrawal.id}`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {
          logger.warn('WITHDRAWAL', `Failed to notify admin`, { error: e.message });
        }
      }
    }

    return {
      success: true,
      withdrawalId: withdrawal.id,
      amount,
      asset
    };

  } catch (error) {
    console.error(`❌ Error creating withdrawal:`, error.message);
    logger.error('WITHDRAWAL', `Failed to create withdrawal request`, {
      userId,
      amount: amount.toFixed(8),
      error: error.message
    });

    return {
      success: false,
      error: error.message,
      userMessage: '❌ Ошибка при создании заявки на вывод'
    };
  }
}

module.exports = {
  transferToUser,
  processWithdrawal,
  createWithdrawalRequest,
  checkPlatformBalance,
  validateWithdrawal
};