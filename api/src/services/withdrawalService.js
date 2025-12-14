/**
 * ✅ ИСПРАВЛЕННЫЙ withdrawalService.js
 * 
 * КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ:
 * ⭐ Экранируем спецсимволы в usernames для Markdown
 * Используем escapeMarkdownV2() для безопасного отправления сообщений
 */

const prisma = require('../../prismaClient');
const axios = require('axios');
const logger = require('../utils/logger');
const validators = require('../utils/validators');

const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;

/**
 * ⭐ Экранировать спецсимволы для Markdown v2
 * Спецсимволы: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
function escapeMarkdownV2(text) {
  if (!text) return '';
  return String(text)
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * ⭐ Экранировать спецсимволы для Markdown (не v2)
 * Спецсимволы: * _ ` [
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/[*_`[]/g, '\\$&');
}

class WithdrawalService {
  /**
   * 📋 Создать заявку на вывод
   * ✅ ПРОВЕРКА: если есть активный бонус - вывод блокирован!
   * ✅ УЛУЧШЕНИЕ: Отправляем админам имя пользователя
   * ⭐ ИСПРАВЛЕНИЕ: Экранируем username для Markdown
   */
  async createWithdrawalRequest(bot, userId, amount, asset = 'USDT') {
    console.log(`\n💸 [WITHDRAWAL] Creating withdrawal request`);
    console.log(`   userId: ${userId}`);
    console.log(`   amount: ${amount} ${asset}`);

    try {
      const userIdNum = parseInt(userId);
      const amountNum = parseFloat(amount);

      if (!validators.validateUserId(userIdNum)) {
        console.error(`❌ Invalid userId: ${userId}`);
        return { 
          success: false, 
          userMessage: '❌ Некорректный пользователь', 
          error: 'Invalid userId' 
        };
      }

      if (!validators.validateWithdrawAmount(amountNum)) {
        console.error(`❌ Invalid amount: ${amount}`);
        return { 
          success: false, 
          userMessage: '❌ Некорректная сумма', 
          error: 'Invalid amount' 
        };
      }

      if (!validators.validateAsset(asset)) {
        console.error(`❌ Invalid asset: ${asset}`);
        return { 
          success: false, 
          userMessage: '❌ Некорректный актив', 
          error: 'Invalid asset' 
        };
      }

      // ⭐ Загружаем пользователя с именем
      console.log(`   🔍 Loading user data...`);
      
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { 
          id: true, 
          telegramId: true,
          username: true,
          firstName: true
        }
      });

      if (!user) {
        console.error(`❌ User not found: ${userIdNum}`);
        return { 
          success: false, 
          userMessage: '❌ Пользователь не найден', 
          error: 'User not found' 
        };
      }

      console.log(`   ✅ User found: ${user.username || user.firstName || `#${user.id}`}`);

      const token = await prisma.cryptoToken.findUnique({
        where: { symbol: asset }
      });

      if (!token) {
        console.error(`❌ Token not found: ${asset}`);
        return { 
          success: false, 
          userMessage: `❌ Токен ${asset} не найден`, 
          error: 'Token not found' 
        };
      }

      // ✅ Проверяем есть ли активный бонус
      console.log(`\n🎁 [WITHDRAWAL] Checking for active bonus...`);
      
      const activeBonus = await prisma.userBonus.findFirst({
        where: {
          userId: userIdNum,
          tokenId: token.id,
          isActive: true,
          isCompleted: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (activeBonus) {
        const wagered = parseFloat(activeBonus.wageredAmount.toString());
        const required = parseFloat(activeBonus.requiredWager.toString());
        const remaining = Math.max(required - wagered, 0);

        console.error(`❌ [WITHDRAWAL] User has active bonus!`);
        console.error(`   Wagered: ${wagered.toFixed(8)} / ${required.toFixed(8)}`);
        console.error(`   Remaining: ${remaining.toFixed(8)}`);

        return {
          success: false,
          userMessage: 
            `❌ *Вывод заблокирован*\n\n` +
            `🎁 У вас активен бонус!\n` +
            `⚡ Осталось отыграть: ${remaining.toFixed(8)} USDT\n\n` +
            `💡 После завершения отыгрыша сможете выводить деньги.`,
          error: 'Active bonus exists',
          bonus: {
            wagered: wagered.toFixed(8),
            required: required.toFixed(8),
            remaining: remaining.toFixed(8)
          }
        };
      }

      console.log(`✅ [WITHDRAWAL] No active bonus found, proceeding...`);

      // Получаем MAIN баланс (не BONUS!)
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

      console.log(`   💰 MAIN Balance: ${currentBalance.toFixed(8)}`);

      if (currentBalance < amountNum) {
        console.error(`❌ Insufficient MAIN balance: ${currentBalance} < ${amountNum}`);
        return {
          success: false,
          userMessage: `❌ Недостаточно средств на счёте. Доступно: ${currentBalance.toFixed(8)} ${asset}`,
          error: 'Insufficient balance'
        };
      }

      console.log(`   ✅ Validation passed`);

      // Создаём заявку на вывод
      const withdrawal = await prisma.$transaction(async (tx) => {
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

        // ✅ Списываем с MAIN баланса!
        if (balance) {
          await tx.balance.update({
            where: { id: balance.id },
            data: {
              amount: { decrement: amountNum }
            }
          });

          console.log(`   ✅ MAIN balance reduced by ${amountNum.toFixed(8)}`);
        }

        return newTx;
      });

      console.log(`✅ Withdrawal request created: #${withdrawal.id}\n`);

      logger.info('WITHDRAWAL', 'Withdrawal request created', {
        withdrawalId: withdrawal.id,
        userId: userIdNum,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        amount: amountNum.toFixed(8),
        asset
      });

      // ⭐ Уведомляем админов С ЭКРАНИРОВАННЫМ ИМЕНЕМ
      try {
        // Формируем отображаемое имя
        const userDisplayName = user.username 
          ? `@${user.username}`
          : user.firstName 
            ? user.firstName 
            : `User #${user.id}`;

        // ⭐ ЭКРАНИРУЕМ для Markdown
        const escapedUserName = escapeMarkdown(userDisplayName);

        const admins = await prisma.user.findMany({
          where: { isAdmin: true },
          select: { telegramId: true }
        });

        console.log(`\n📤 Notifying ${admins.length} admin(s)...`);
        console.log(`   User: ${userDisplayName} (escaped: ${escapedUserName})`);

        for (const admin of admins) {
          if (admin.telegramId) {
            try {
              await bot.telegram.sendMessage(
                admin.telegramId,
                `💸 НОВАЯ ЗАЯВКА НА ВЫВОД\n\n` +
                `🎫 ID: #${withdrawal.id}\n` +
                `👤 Пользователь: ${escapedUserName}\n` +
                `💰 Сумма: ${amountNum.toFixed(8)} ${asset}\n` +
                `⏰ Время: ${new Date().toLocaleString()}\n\n` +
                `Управляйте в Админ Панели`,
                { parse_mode: 'Markdown' }
              );
              console.log(`   ✅ Notified admin ${admin.telegramId}`);
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
   * ✅ Обработать заявку на вывод
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
        console.log(`\n✅ APPROVING withdrawal...`);
        return await this._approveWithdrawal(bot, withdrawal, amount, userId, telegramId, tokenId, asset);
      } else {
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
   * ✅ Одобрить вывод
   */
  async _approveWithdrawal(bot, withdrawal, amount, userId, telegramId, tokenId, asset) {
    try {
      console.log(`📤 Sending to Crypto Pay API transfer endpoint...`);
      console.log(`   📍 Target: Telegram User #${telegramId}`);
      console.log(`   💰 Amount: ${amount.toFixed(8)} ${asset}`);

      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const spendId = `w${withdrawal.id}t${Date.now()}${randomSuffix}`;

      console.log(`   📝 spend_id: ${spendId}`);

      const payload = {
        user_id: telegramId,
        asset: asset,
        amount: amount.toFixed(8),
        spend_id: spendId
      };

      console.log(`   📤 Payload:`, JSON.stringify(payload, null, 2));

      console.log(`\n📡 Отправляем запрос на ${CRYPTO_PAY_API}/transfer`);

      let transferResponse;
      try {
        transferResponse = await axios.post(
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

        console.log(`\n✅ API Response Status: ${transferResponse.status}`);
        console.log(`📋 Full Response:`, JSON.stringify(transferResponse.data, null, 2));

      } catch (axiosError) {
        console.error(`\n❌ AXIOS ERROR:`);
        console.error(`   Status: ${axiosError.response?.status}`);
        console.error(`   Status Text: ${axiosError.response?.statusText}`);
        console.error(`   Response Data:`, JSON.stringify(axiosError.response?.data, null, 2));
        console.error(`   Error Message: ${axiosError.message}`);

        logger.error('WITHDRAWAL', 'Crypto Pay API Error', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          message: axiosError.message
        });

        throw axiosError;
      }

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

      console.log(`\n✅ Transfer successful!`);
      console.log(`   🔗 Transfer ID: ${transferId}`);

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

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { telegramId: true }
        });

        if (user?.telegramId) {
          await bot.telegram.sendMessage(
            user.telegramId,
            `✅ *Заявка на вывод одобрена и выполнена\\!*\n\n` +
            `💰 Сумма: ${amount.toFixed(8)} ${asset}\n` +
            `🔗 TX ID: \`${transferId}\`\n` +
            `⏰ Дата: ${new Date().toLocaleString()}\n\n` +
            `Средства отправлены на ваш кошелёк\\.`,
            { parse_mode: 'MarkdownV2' }
          );
          console.log(`   ✅ User notified`);
        }
      } catch (e) {
        logger.warn('WITHDRAWAL', `Failed to notify user`, { error: e.message });
      }

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
   * ✅ Отклонить вывод (возвращаем деньги)
   */
  async _rejectWithdrawal(bot, withdrawal, amount, userId, telegramId, tokenId, asset) {
    try {
      console.log(`🚫 Rejecting withdrawal...`);

      await prisma.$transaction(async (tx) => {
        // Обновляем статус заявки
        await tx.transaction.update({
          where: { id: withdrawal.id },
          data: {
            status: 'FAILED',
            updatedAt: new Date()
          }
        });

        console.log(`   ✅ Transaction updated: status=FAILED`);

        // Возвращаем деньги на MAIN баланс
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
            `Средства вернулись на ваш счёт\\.`,
            { parse_mode: 'Markdown' }
          );
          console.log(`   ✅ User notified`);
        }
      } catch (e) {
        logger.warn('WITHDRAWAL', `Failed to notify user`, { error: e.message });
      }

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