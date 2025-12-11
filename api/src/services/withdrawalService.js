/**
 * ✅ ИСПРАВЛЕННЫЙ withdrawalService.js
 * 
 * ИСПРАВЛЕНИЕ:
 * ❌ БЫЛО: user_id: withdrawal.user.id (ID в БД вроде 1, 2, 3)
 * ✅ ТЕПЕРЬ: user_id: parseInt(withdrawal.user.telegramId) (ID в Telegram 8475177249)
 * 
 * Это причина ошибки 400!
 */

const axios = require('axios');
const prisma = require('../../prismaClient');
const logger = require('../utils/logger');

const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;

const withdrawalService = {
  async createWithdrawalRequest(bot, userId, amount, asset = 'USDT') {
    console.log(`\n💸 [WITHDRAWAL] Creating withdrawal request...`);
    console.log(`   userId: ${userId}, amount: ${amount.toFixed(8)}, asset: ${asset}`);

    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || userIdNum <= 0) {
        throw new Error(`Invalid userId: ${userId}`);
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error(`Invalid amount: ${amount}`);
      }

      const assetStr = String(asset).toUpperCase().trim();
      if (!assetStr || assetStr.length === 0) {
        throw new Error(`Invalid asset: ${asset}`);
      }

      console.log(`   ✅ Parameters validated`);

      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { id: true, telegramId: true, isBlocked: true }
      });

      if (!user) {
        console.error(`   ❌ User not found: ${userIdNum}`);
        return {
          success: false,
          error: 'User not found',
          userMessage: '❌ Пользователь не найден'
        };
      }

      if (user.isBlocked) {
        console.error(`   ❌ User is blocked: ${userIdNum}`);
        return {
          success: false,
          error: 'User is blocked',
          userMessage: '🚫 Ваш аккаунт заблокирован'
        };
      }

      console.log(`   ✅ User found and not blocked: ${user.id}`);

      const token = await prisma.cryptoToken.findUnique({
        where: { symbol: assetStr }
      });

      if (!token) {
        console.error(`   ❌ Token not found: ${assetStr}`);
        return {
          success: false,
          error: `Token not found: ${assetStr}`,
          userMessage: `❌ Токен ${assetStr} не найден`
        };
      }

      console.log(`   ✅ Token found: ${token.symbol}`);

      const userBalance = await prisma.balance.findFirst({
        where: {
          userId: userIdNum,
          tokenId: token.id,
          type: 'MAIN'
        }
      });

      const availableBalance = userBalance ? parseFloat(userBalance.amount.toString()) : 0;
      console.log(`   User balance: ${availableBalance.toFixed(8)} ${assetStr}`);

      if (availableBalance < amountNum) {
        console.error(`   ❌ Insufficient balance: ${availableBalance.toFixed(8)} < ${amountNum.toFixed(8)}`);
        return {
          success: false,
          error: 'Insufficient balance',
          userMessage: `❌ Недостаточно средств\n\nДоступно: ${availableBalance.toFixed(8)} ${assetStr}`
        };
      }

      console.log(`   ✅ Balance check passed`);

      const withdrawal = await prisma.transaction.create({
        data: {
          userId: userIdNum,
          tokenId: token.id,
          type: 'WITHDRAW',
          status: 'PENDING',
          amount: amountNum.toFixed(8),
          txHash: null,
          createdAt: new Date()
        }
      });

      console.log(`   ✅ Withdrawal record created: #${withdrawal.id}`);

      const updatedBalance = await prisma.balance.update({
        where: {
          userId_tokenId_type: {
            userId: userIdNum,
            tokenId: token.id,
            type: 'MAIN'
          }
        },
        data: {
          amount: { decrement: amountNum }
        }
      });

      console.log(`   ✅ Balance reserved: ${updatedBalance.amount}`);

      try {
        if (user.telegramId) {
          await bot.telegram.sendMessage(
            user.telegramId,
            `📋 *Заявка на вывод создана*\n\n` +
            `💰 Сумма: ${amountNum.toFixed(8)} ${assetStr}\n` +
            `🎫 ID: #${withdrawal.id}\n` +
            `⏳ Статус: На рассмотрении\n\n` +
            `Администратор одобрит заявку в течение нескольких минут.`,
            { parse_mode: 'Markdown' }
          );
          console.log(`   ✅ Notification sent to user`);
        }
      } catch (notifyError) {
        console.warn(`   ⚠️ Failed to send notification: ${notifyError.message}`);
      }

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
                `💸 *НОВАЯ ЗАЯВКА НА ВЫВОД*\n\n` +
                `🎫 ID: #${withdrawal.id}\n` +
                `👤 Пользователь: ${user.id}\n` +
                `💰 Сумма: ${amountNum.toFixed(8)} ${assetStr}\n` +
                `⏰ Время: ${new Date().toLocaleString()}\n\n` +
                `*Команды для обработки:*\n` +
                `/approve_withdrawal_${withdrawal.id}\n` +
                `/reject_withdrawal_${withdrawal.id}`,
                { parse_mode: 'Markdown' }
              );
              console.log(`   ✅ Admin notification sent`);
            } catch (adminNotifyError) {
              console.warn(`   ⚠️ Failed to notify admin: ${adminNotifyError.message}`);
            }
          }
        }
      } catch (adminError) {
        console.warn(`   ⚠️ Failed to get admins: ${adminError.message}`);
      }

      console.log(`✅ Withdrawal request created successfully: #${withdrawal.id}\n`);

      return {
        success: true,
        withdrawalId: withdrawal.id,
        amount: amountNum,
        asset: assetStr
      };

    } catch (error) {
      console.error(`❌ Error creating withdrawal:`, error.message);
      console.error(`   Stack:`, error.stack);

      logger.error('WITHDRAWAL', 'Error creating withdrawal request', {
        error: error.message,
        userId,
        amount
      });

      return {
        success: false,
        error: error.message,
        userMessage: '❌ Ошибка при создании заявки на вывод\n\nПопробуйте позже'
      };
    }
  },

  async processWithdrawal(bot, withdrawalId, approve = true) {
    console.log(`\n💸 [WITHDRAWAL] Processing withdrawal #${withdrawalId}...`);
    console.log(`   Action: ${approve ? 'APPROVE' : 'REJECT'}`);

    try {
      const withdrawalIdNum = parseInt(withdrawalId);
      if (isNaN(withdrawalIdNum)) {
        throw new Error(`Invalid withdrawalId: ${withdrawalId}`);
      }

      // ✅ ПОЛУЧАЕМ ЗАЯВКУ
      const withdrawal = await prisma.transaction.findUnique({
        where: { id: withdrawalIdNum },
        include: {
          user: { select: { id: true, telegramId: true } },
          token: { select: { symbol: true } }
        }
      });

      if (!withdrawal) {
        console.error(`   ❌ Withdrawal not found: #${withdrawalIdNum}`);
        throw new Error(`Withdrawal #${withdrawalIdNum} not found`);
      }

      if (withdrawal.type !== 'WITHDRAW') {
        throw new Error(`Transaction #${withdrawalIdNum} is not a withdrawal`);
      }

      console.log(`   ✅ Withdrawal found: ${withdrawal.id}`);
      console.log(`   Status: ${withdrawal.status}`);

      const amount = parseFloat(withdrawal.amount.toString());
      const asset = withdrawal.token.symbol;
      
      // ✅ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Используем ID В TELEGRAM, А НЕ В БД!
      const userTelegramId = parseInt(withdrawal.user.telegramId);

      console.log(`   Amount: ${amount.toFixed(8)}, Asset: ${asset}`);
      console.log(`   User Telegram ID: ${userTelegramId}`);

      // ✅ ПРОВЕРЯЕМ СТАТУС
      if (withdrawal.status !== 'PENDING') {
        throw new Error(`Withdrawal #${withdrawalIdNum} is already ${withdrawal.status}`);
      }

      console.log(`   ✅ Withdrawal status is PENDING`);

      if (approve) {
        // ====================================
        // ОДОБРЕНИЕ ЗАЯВКИ
        // ====================================
        console.log(`\n✅ APPROVING WITHDRAWAL...`);

        // ✅ ПРОВЕРЯЕМ что CRYPTO_PAY_TOKEN есть
        if (!CRYPTO_PAY_TOKEN) {
          throw new Error('CRYPTO_PAY_TOKEN not set in environment variables');
        }

        console.log(`   ✅ CRYPTO_PAY_TOKEN is set`);

        // ✅ ПОДГОТАВЛИВАЕМ ПАРАМЕТРЫ
        const transferPayload = {
          user_id: userTelegramId,  // ✅ TELEGRAM ID, НЕ БД ID!
          asset: String(asset).toUpperCase().trim(),
          amount: amount.toFixed(8),
          spend_id: `withdraw_${withdrawalIdNum}_${Date.now()}`,
          comment: `Withdrawal #${withdrawalIdNum}`
        };

        console.log(`   📤 Transfer payload:`, {
          user_id: transferPayload.user_id,
          asset: transferPayload.asset,
          amount: transferPayload.amount,
          spend_id: transferPayload.spend_id
        });

        // ✅ ОТПРАВЛЯЕМ TRANSFER
        console.log(`   📤 Sending to Crypto Pay API...`);

        const transferResponse = await axios.post(
          `${CRYPTO_PAY_API}/transfer`,
          transferPayload,
          {
            headers: {
              'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        console.log(`   📥 Response status: ${transferResponse.status}`);
        console.log(`   📥 Response data:`, transferResponse.data);

        if (!transferResponse.data.ok) {
          const errorMsg = transferResponse.data.error?.description || 
                          transferResponse.data.error?.message ||
                          JSON.stringify(transferResponse.data.error);
          
          console.error(`   ❌ Transfer API error:`, errorMsg);
          throw new Error(`Transfer API error: ${errorMsg}`);
        }

        const transferData = transferResponse.data.result;
        const transferId = transferData.transfer_id;

        console.log(`   ✅ Transfer created: ${transferId}`);

        // ✅ ОБНОВЛЯЕМ СТАТУС ЗАЯВКИ
        const updatedWithdrawal = await prisma.transaction.update({
          where: { id: withdrawalIdNum },
          data: {
            status: 'COMPLETED',
            txHash: transferId,
            updatedAt: new Date()
          }
        });

        console.log(`   ✅ Withdrawal status updated to COMPLETED`);

        // ✅ ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ ПОЛЬЗОВАТЕЛЮ
        try {
          if (withdrawal.user.telegramId) {
            await bot.telegram.sendMessage(
              withdrawal.user.telegramId,
              `✅ *Ваш вывод одобрен!*\n\n` +
              `💰 Сумма: ${amount.toFixed(8)} ${asset}\n` +
              `🎫 ID: #${withdrawalIdNum}\n` +
              `🔗 Transfer: \`${transferId}\`\n\n` +
              `💬 Средства отправлены на ваш кошелёк @CryptoBot\n` +
              `⏰ Получение: 1-3 минуты`,
              { parse_mode: 'Markdown' }
            );
            console.log(`   ✅ User notification sent`);
          }
        } catch (notifyError) {
          console.warn(`   ⚠️ Failed to notify user: ${notifyError.message}`);
        }

        console.log(`✅ Withdrawal #${withdrawalIdNum} APPROVED\n`);

        return {
          success: true,
          amount,
          asset,
          transferId
        };

      } else {
        // ====================================
        // ОТКЛОНЕНИЕ ЗАЯВКИ
        // ====================================
        console.log(`\n❌ REJECTING WITHDRAWAL...`);

        // ✅ ВОЗВРАЩАЕМ ДЕНЬГИ НА БАЛАНС ПОЛЬЗОВАТЕЛЯ
        const returnedBalance = await prisma.balance.update({
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

        console.log(`   ✅ Money returned to user balance: ${returnedBalance.amount}`);

        // ✅ ОБНОВЛЯЕМ СТАТУС ЗАЯВКИ
        await prisma.transaction.update({
          where: { id: withdrawalIdNum },
          data: {
            status: 'REJECTED',
            updatedAt: new Date()
          }
        });

        console.log(`   ✅ Withdrawal status updated to REJECTED`);

        // ✅ ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ ПОЛЬЗОВАТЕЛЮ
        try {
          if (withdrawal.user.telegramId) {
            await bot.telegram.sendMessage(
              withdrawal.user.telegramId,
              `❌ *Ваша заявка на вывод отклонена*\n\n` +
              `💰 Сумма: ${amount.toFixed(8)} ${asset}\n` +
              `🎫 ID: #${withdrawalIdNum}\n\n` +
              `💬 Деньги возвращены на ваш баланс.\n` +
              `📞 Свяжитесь с поддержкой, если у вас есть вопросы.`,
              { parse_mode: 'Markdown' }
            );
            console.log(`   ✅ User notification sent`);
          }
        } catch (notifyError) {
          console.warn(`   ⚠️ Failed to notify user: ${notifyError.message}`);
        }

        console.log(`✅ Withdrawal #${withdrawalIdNum} REJECTED\n`);

        return {
          success: true,
          returnedAmount: amount,
          asset
        };
      }

    } catch (error) {
      console.error(`❌ Error processing withdrawal:`, error.message);
      console.error(`   Stack:`, error.stack);

      logger.error('WITHDRAWAL', 'Error processing withdrawal', {
        withdrawalId,
        approve,
        error: error.message
      });

      throw error;
    }
  }
};

module.exports = withdrawalService;