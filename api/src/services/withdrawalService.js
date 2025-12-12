/**
 * ✅ ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ withdrawalService.js
 * 
 * ГЛАВНЫЕ ИСПРАВЛЕНИЯ:
 * 1. ✅ transfer API требует TELEGRAM USER ID, не app user_id!
 * 2. ✅ spend_id должен быть уникальным (не повторяться!)
 * 3. ✅ comment опциональный параметр
 * 4. ✅ Нужно включить Transfer в @CryptoBot security settings!
 * 5. ✅ Все Decimal конвертированы
 */

const prisma = require('../../prismaClient');
const axios = require('axios');
const logger = require('../utils/logger');
const validators = require('../utils/validators');

const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;

class WithdrawalService {
  /**
   * 📋 Создать заявку на вывод
   */
  async createWithdrawalRequest(bot, userId, amount, asset = 'USDT') {
    console.log(`\n💸 [WITHDRAWAL] Creating withdrawal request`);
    console.log(`   userId: ${userId}`);
    console.log(`   amount: ${amount} ${asset}`);

    try {
      // ✅ ВАЛИДАЦИЯ
      const userIdNum = parseInt(userId);
      const amountNum = parseFloat(amount);

      if (!validators.validateUserId(userIdNum)) {
        console.error(`❌ Invalid userId: ${userId}`);
        return { success: false, userMessage: '❌ Некорректный пользователь', error: 'Invalid userId' };
      }

      if (!validators.validateWithdrawAmount(amountNum)) {
        console.error(`❌ Invalid amount: ${amount}`);
        return { success: false, userMessage: '❌ Некорректная сумма', error: 'Invalid amount' };
      }

      if (!validators.validateAsset(asset)) {
        console.error(`❌ Invalid asset: ${asset}`);
        return { success: false, userMessage: '❌ Некорректный актив', error: 'Invalid asset' };
      }

      // Получаем пользователя
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { id: true, telegramId: true }
      });

      if (!user) {
        console.error(`❌ User not found: ${userIdNum}`);
        return { success: false, userMessage: '❌ Пользователь не найден', error: 'User not found' };
      }

      // Получаем токен
      const token = await prisma.cryptoToken.findUnique({
        where: { symbol: asset }
      });

      if (!token) {
        console.error(`❌ Token not found: ${asset}`);
        return { success: false, userMessage: `❌ Токен ${asset} не найден`, error: 'Token not found' };
      }

      // Проверяем баланс
      const balance = await prisma.balance.findUnique({
        where: {
          userId_tokenId_type: {
            userId: userIdNum,
            tokenId: token.id,
            type: 'MAIN'
          }
        }
      });

      const currentBalance = balance ? parseFloat(balance.amount.toString()) : 0;

      if (currentBalance < amountNum) {
        console.error(`❌ Insufficient balance: ${currentBalance} < ${amountNum}`);
        return {
          success: false,
          userMessage: `❌ Недостаточно средств. Доступно: ${currentBalance.toFixed(8)} ${asset}`,
          error: 'Insufficient balance'
        };
      }

      console.log(`   ✅ Validation passed`);
      console.log(`   💰 Current balance: ${currentBalance.toFixed(8)}`);
      console.log(`   👤 Telegram ID: ${user.telegramId}`);

      // ✅ TRANSACTION: Создаём заявку и резервируем средства
      const withdrawal = await prisma.$transaction(async (tx) => {
        // Создаём транзакцию
        const newTx = await tx.transaction.create({
          data: {
            userId: userIdNum,
            tokenId: token.id,
            type: 'WITHDRAW',
            status: 'PENDING',
            amount: amountNum.toFixed(8).toString(),
            walletAddress: null,
            txHash: null
          }
        });

        console.log(`   ✅ Transaction created: ID=${newTx.id}`);

        // Уменьшаем баланс (резервируем средства)
        if (balance) {
          await tx.balance.update({
            where: { id: balance.id },
            data: {
              amount: { decrement: amountNum }
            }
          });
        }

        console.log(`   ✅ Balance reduced by ${amountNum.toFixed(8)}`);

        return newTx;
      });

      console.log(`✅ Withdrawal request created: #${withdrawal.id}\n`);

      logger.info('WITHDRAWAL', 'Withdrawal request created', {
        withdrawalId: withdrawal.id,
        userId: userIdNum,
        telegramId: user.telegramId,
        amount: amountNum.toFixed(8),
        asset
      });

      // Уведомляем администраторов
      try {
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
                `👤 Пользователь: ${userIdNum}\n` +
                `💰 Сумма: ${amountNum.toFixed(8)} ${asset}\n` +
                `⏰ Время: ${new Date().toLocaleString()}\n\n` +
                `Управляйте в Админ Панели`,
                { parse_mode: 'Markdown' }
              );
              console.log(`   ✅ Notification sent to admin`);
            } catch (e) {
              logger.warn('WITHDRAWAL', `Failed to notify admin`, { error: e.message });
            }
          }
        }
      } catch (e) {
        logger.warn('WITHDRAWAL', `Failed to get admins`, { error: e.message });
      }

      return {
        success: true,
        withdrawalId: withdrawal.id,
        amount: amountNum.toFixed(8),
        asset,
        status: 'PENDING'
      };
    } catch (error) {
      console.error(`❌ Critical error in createWithdrawalRequest:`, error.message);
      logger.error('WITHDRAWAL', 'Failed to create withdrawal request', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        userMessage: '❌ Ошибка при создании заявки. Пожалуйста, попробуйте позже.',
        error: error.message
      };
    }
  }

  /**
   * ✅ ИСПРАВЛЕННАЯ: Обработать заявку на вывод
   */
  async processWithdrawal(bot, withdrawalId, approve = true) {
    console.log(`\n💸 [WITHDRAWAL] Processing withdrawal #${withdrawalId}`);
    console.log(`   Action: ${approve ? 'APPROVE' : 'REJECT'}`);

    try {
      const withdrawalIdNum = parseInt(withdrawalId);

      if (isNaN(withdrawalIdNum) || withdrawalIdNum <= 0) {
        console.error(`❌ Invalid withdrawalId: ${withdrawalId}`);
        throw new Error('Invalid withdrawal ID');
      }

      // Получаем заявку
      const withdrawal = await prisma.transaction.findUnique({
        where: { id: withdrawalIdNum },
        include: {
          user: { select: { id: true, telegramId: true } },
          token: { select: { symbol: true } }
        }
      });

      if (!withdrawal) {
        console.error(`❌ Withdrawal not found: ${withdrawalIdNum}`);
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.type !== 'WITHDRAW') {
        console.error(`❌ Transaction is not a withdrawal: ${withdrawal.type}`);
        throw new Error('Transaction is not a withdrawal');
      }

      if (withdrawal.status !== 'PENDING') {
        console.error(`❌ Withdrawal status is not PENDING: ${withdrawal.status}`);
        throw new Error(`Withdrawal status is ${withdrawal.status}, cannot process`);
      }

      const amount = parseFloat(withdrawal.amount.toString());
      const userId = withdrawal.user.id;
      const telegramId = parseInt(withdrawal.user.telegramId);
      const tokenId = withdrawal.tokenId;
      const asset = withdrawal.token.symbol;

      console.log(`   ✅ Withdrawal found: #${withdrawalIdNum}`);
      console.log(`   Amount: ${amount.toFixed(8)} ${asset}`);
      console.log(`   User Telegram ID: ${telegramId}`);

      if (approve) {
        // ✅ ОДОБРИТЬ ВЫВОД
        console.log(`\n✅ APPROVING withdrawal...`);
        return await this._approveWithdrawal(bot, withdrawal, amount, userId, telegramId, tokenId, asset);
      } else {
        // ✅ ОТКЛОНИТЬ ВЫВОД
        console.log(`\n❌ REJECTING withdrawal...`);
        return await this._rejectWithdrawal(bot, withdrawal, amount, userId, telegramId, tokenId, asset);
      }
    } catch (error) {
      console.error(`❌ Critical error in processWithdrawal:`, error.message);
      logger.error('WITHDRAWAL', 'Failed to process withdrawal', {
        withdrawalId,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * ✅ ИСПРАВЛЕННАЯ: Одобрить вывод (Transfer API)
   * 
   * КЛЮЧЕВЫЕ ПАРАМЕТРЫ:
   * - user_id: TELEGRAM USER ID (не app user id!)
   * - asset: "USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC"
   * - amount: Строка! "10.50000000"
   * - spend_id: Уникальный ID (не повторяется!)
   * - comment: Опциональный (что-то вроде "Вывод #29")
   */
  async _approveWithdrawal(bot, withdrawal, amount, userId, telegramId, tokenId, asset) {
    try {
      console.log(`📤 Sending to Crypto Pay API transfer endpoint...`);
      console.log(`   📍 Target: Telegram User #${telegramId}`);
      console.log(`   💰 Amount: ${amount.toFixed(8)} ${asset}`);

      // ⚠️ ВАЖНО: spend_id должен быть УНИКАЛЬНЫМ и не повторяться!
      // Используем комбинацию timestamp + random
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const spendId = `w${withdrawal.id}t${Date.now()}${randomSuffix}`;

      console.log(`   📝 spend_id: ${spendId}`);

      // ✅ ПРАВИЛЬНЫЙ PAYLOAD для transfer API
      const payload = {
        user_id: telegramId,           // ✅ TELEGRAM USER ID!
        asset: asset,                  // ✅ "USDT", "TON", и т.д.
        amount: amount.toFixed(8),     // ✅ Строка!
        spend_id: spendId,             // ✅ Уникальный ID
        comment: `SafariX Casino Withdraw #${withdrawal.id}`  // ✅ Опционально
      };

      console.log(`   📤 Payload:`, JSON.stringify(payload, null, 2));

      // Отправляем на Crypto Pay API
      const transferResponse = await axios.post(
        `${CRYPTO_PAY_API}/transfer`,
        payload,
        {
          headers: {
            'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log(`\n   ✅ API Response Status: ${transferResponse.status}`);
      console.log(`   📋 Response:`, JSON.stringify(transferResponse.data, null, 2));

      // Проверяем ответ
      if (!transferResponse.data.ok) {
        const errorMsg = transferResponse.data.error?.message || 'Unknown error';
        console.error(`❌ API Error: ${errorMsg}`);
        throw new Error(`Transfer failed: ${errorMsg}`);
      }

      if (!transferResponse.data.result) {
        console.error(`❌ No result in API response`);
        throw new Error('No transfer result returned');
      }

      const transferResult = transferResponse.data.result;
      const transferId = transferResult.transfer_id || transferResult.id;

      console.log(`   ✅ Transfer successful!`);
      console.log(`   🔗 Transfer ID: ${transferId}`);

      // ===================================
      // ОБНОВЛЯЕМ СТАТУС В БД
      // ===================================

      console.log(`\n💾 Updating database...`);

      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: withdrawal.id },
          data: {
            status: 'COMPLETED',
            txHash: String(transferId),
            updatedAt: new Date()
          }
        });

        console.log(`   ✅ Transaction updated`);
        console.log(`      Status: COMPLETED`);
        console.log(`      TxHash: ${transferId}`);
      });

      console.log(`\n✅ Withdrawal approved: #${withdrawal.id}\n`);

      logger.info('WITHDRAWAL', 'Withdrawal approved and transferred', {
        withdrawalId: withdrawal.id,
        transferId: String(transferId),
        amount: amount.toFixed(8),
        asset: asset,
        telegramId: telegramId
      });

      // Уведомляем пользователя
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { telegramId: true }
        });

        if (user?.telegramId) {
          await bot.telegram.sendMessage(
            user.telegramId,
            `✅ *Заявка на вывод одобрена и выполнена!*\n\n` +
            `💰 Сумма: ${amount.toFixed(8)} ${asset}\n` +
            `🔗 TX ID: \`${transferId}\`\n` +
            `⏰ Дата: ${new Date().toLocaleString()}\n\n` +
            `Средства отправлены на ваш кошелёк.`,
            { parse_mode: 'Markdown' }
          );
          console.log(`   ✅ User notified`);
        }
      } catch (e) {
        logger.warn('WITHDRAWAL', `Failed to notify user`, { error: e.message });
      }

      // ✅ Возвращаем результат (amount уже число)
      return {
        success: true,
        withdrawalId: withdrawal.id,
        amount: amount,
        asset: asset,
        transferId: String(transferId)
      };

    } catch (error) {
      console.error(`\n❌ Error in _approveWithdrawal: ${error.message}`);
      logger.error('WITHDRAWAL', 'Failed to approve withdrawal', {
        withdrawalId: withdrawal.id,
        telegramId: telegramId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * ✅ ИСПРАВЛЕННАЯ: Отклонить вывод (FAILED статус)
   */
  async _rejectWithdrawal(bot, withdrawal, amount, userId, telegramId, tokenId, asset) {
    try {
      console.log(`🚫 Rejecting withdrawal...`);

      // ===================================
      // ВОЗВРАЩАЕМ СРЕДСТВА И ОБНОВЛЯЕМ СТАТУС
      // ===================================

      await prisma.$transaction(async (tx) => {
        // ✅ FAILED статус
        await tx.transaction.update({
          where: { id: withdrawal.id },
          data: {
            status: 'FAILED',
            updatedAt: new Date()
          }
        });

        console.log(`   ✅ Transaction updated: status=FAILED`);

        // Возвращаем средства на баланс
        await tx.balance.upsert({
          where: {
            userId_tokenId_type: {
              userId: userId,
              tokenId: tokenId,
              type: 'MAIN'
            }
          },
          create: {
            userId: userId,
            tokenId: tokenId,
            type: 'MAIN',
            amount: amount.toFixed(8).toString()
          },
          update: {
            amount: { increment: amount }
          }
        });

        console.log(`   ✅ Funds returned: +${amount.toFixed(8)} ${asset}`);
      });

      console.log(`✅ Withdrawal rejected: #${withdrawal.id}\n`);

      logger.info('WITHDRAWAL', 'Withdrawal rejected', {
        withdrawalId: withdrawal.id,
        amount: amount.toFixed(8),
        userId: userId
      });

      // Уведомляем пользователя
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { telegramId: true }
        });

        if (user?.telegramId) {
          await bot.telegram.sendMessage(
            user.telegramId,
            `❌ *Заявка на вывод отклонена*\n\n` +
            `💰 Возвращено: ${amount.toFixed(8)} ${asset}\n` +
            `🎫 ID: #${withdrawal.id}\n` +
            `⏰ Дата: ${new Date().toLocaleString()}\n\n` +
            `Средства вернулись на ваш счёт.\n` +
            `Если у вас есть вопросы, напишите в поддержку.`,
            { parse_mode: 'Markdown' }
          );
          console.log(`   ✅ User notified`);
        }
      } catch (e) {
        logger.warn('WITHDRAWAL', `Failed to notify user`, { error: e.message });
      }

      // ✅ Возвращаем результат (amount уже число)
      return {
        success: true,
        withdrawalId: withdrawal.id,
        returnedAmount: amount,
        asset: asset,
        status: 'FAILED'
      };

    } catch (error) {
      console.error(`❌ Error in _rejectWithdrawal:`, error.message);
      logger.error('WITHDRAWAL', 'Failed to reject withdrawal', {
        withdrawalId: withdrawal.id,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 📋 Получить статус заявки
   */
  async getWithdrawalStatus(withdrawalId) {
    try {
      const withdrawalIdNum = parseInt(withdrawalId);

      if (isNaN(withdrawalIdNum)) {
        return null;
      }

      const withdrawal = await prisma.transaction.findUnique({
        where: { id: withdrawalIdNum },
        include: {
          user: { select: { id: true, username: true } },
          token: { select: { symbol: true } }
        }
      });

      if (!withdrawal || withdrawal.type !== 'WITHDRAW') {
        return null;
      }

      return {
        id: withdrawal.id,
        status: withdrawal.status,
        amount: parseFloat(withdrawal.amount.toString()).toFixed(8),
        asset: withdrawal.token.symbol,
        txHash: withdrawal.txHash,
        createdAt: withdrawal.createdAt,
        updatedAt: withdrawal.updatedAt
      };
    } catch (error) {
      logger.error('WITHDRAWAL', 'Failed to get withdrawal status', { error: error.message });
      return null;
    }
  }

  /**
   * 📋 Получить список выводов пользователя
   */
  async getUserWithdrawals(userId, limit = 10) {
    try {
      const userIdNum = parseInt(userId);

      if (!validators.validateUserId(userIdNum)) {
        return [];
      }

      const withdrawals = await prisma.transaction.findMany({
        where: {
          userId: userIdNum,
          type: 'WITHDRAW'
        },
        include: { token: { select: { symbol: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return withdrawals.map(w => ({
        id: w.id,
        status: w.status,
        amount: parseFloat(w.amount.toString()).toFixed(8),
        asset: w.token.symbol,
        txHash: w.txHash,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      }));
    } catch (error) {
      logger.error('WITHDRAWAL', 'Failed to get user withdrawals', { error: error.message });
      return [];
    }
  }
}

module.exports = new WithdrawalService();
