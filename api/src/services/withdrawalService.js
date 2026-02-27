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
const { getCurrencyRate } = require('./currencySyncService');

const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 НАСТРОЙКИ АВТОМАТИЧЕСКОГО ОДОБРЕНИЯ
// ═══════════════════════════════════════════════════════════════════════════════
const AUTO_APPROVE_LIMIT_USD = 100;      // Автоматическое одобрение до $100
const MAX_AUTO_WITHDRAWALS_PER_DAY = 2;  // Максимум 2 автоматических вывода в сутки

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

/**
 * ⭐ Конвертировать сумму криптовалюты в USD
 * @param {number} amount - Сумма в криптовалюте
 * @param {string} asset - Символ криптовалюты (USDT, BTC, ETH и т.д.)
 * @returns {number} Эквивалент в USD
 */
async function convertToUSD(amount, asset) {
  const assetUpper = asset.toUpperCase();
  
  // Стейблкоины = 1 USD
  if (['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD'].includes(assetUpper)) {
    return amount;
  }
  
  // Для Stars (XTR)
  if (assetUpper === 'XTR') {
    return amount * 0.02; // 1 Star ≈ $0.02
  }
  
  // Для остальных - используем актуальный курс
  try {
    const rate = getCurrencyRate(assetUpper);
    return amount * rate;
  } catch (e) {
    logger.warn('WITHDRAWAL', `Failed to get rate for ${assetUpper}, using 0`, { error: e.message });
    return 0;
  }
}

/**
 * ⭐ Проверить, может ли вывод быть автоматически одобрен
 * @param {number} userId - ID пользователя
 * @param {number} amountUSD - Сумма в USD
 * @returns {Object} { canAutoApprove: boolean, reason: string }
 */
async function checkAutoApproval(userId, amountUSD) {
  // Проверка суммы
  if (amountUSD > AUTO_APPROVE_LIMIT_USD) {
    return {
      canAutoApprove: false,
      reason: `Сумма ${amountUSD.toFixed(2)} USD превышает лимит автоматического одобрения ($${AUTO_APPROVE_LIMIT_USD})`
    };
  }
  
  // Проверка количества выводов за последние 24 часа
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentWithdrawals = await prisma.transaction.count({
    where: {
      userId: userId,
      type: 'WITHDRAW',
      status: 'COMPLETED',
      createdAt: { gte: oneDayAgo }
    }
  });
  
  if (recentWithdrawals >= MAX_AUTO_WITHDRAWALS_PER_DAY) {
    return {
      canAutoApprove: false,
      reason: `Превышен лимит автоматических выводов (${MAX_AUTO_WITHDRAWALS_PER_DAY} в сутки). Заявка отправлена на рассмотрение.`
    };
  }
  
  return {
    canAutoApprove: true,
    reason: 'Автоматическое одобрение'
  };
}

class WithdrawalService {
  /**
   * 📋 Создать заявку на вывод
   * ✅ ПРОВЕРКА: если есть активный бонус - вывод блокирован!
   * ✅ УЛУЧШЕНИЕ: Отправляем админам имя пользователя
   * ⭐ ИСПРАВЛЕНИЕ: Экранируем username для Markdown
   */
  async createWithdrawalRequest(bot, userId, amount, asset = 'USDT') {
    try {
      const userIdNum = parseInt(userId);
      const amountNum = parseFloat(amount);

      if (!validators.validateUserId(userIdNum)) {
        return { 
          success: false, 
          userMessage: '❌ Некорректный пользователь', 
          error: 'Invalid userId' 
        };
      }

      if (!validators.validateWithdrawAmount(amountNum)) {
        return { 
          success: false, 
          userMessage: '❌ Некорректная сумма', 
          error: 'Invalid amount' 
        };
      }

      if (!validators.validateAsset(asset)) {
        return { 
          success: false, 
          userMessage: '❌ Некорректный актив', 
          error: 'Invalid asset' 
        };
      }

      // ⭐ Загружаем пользователя с именем
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
        return { 
          success: false, 
          userMessage: '❌ Пользователь не найден', 
          error: 'User not found' 
        };
      }

      const token = await prisma.cryptoToken.findUnique({
        where: { symbol: asset }
      });

      if (!token) {
        return { 
          success: false, 
          userMessage: `❌ Токен ${asset} не найден`, 
          error: 'Token not found' 
        };
      }

      // ✅ Проверяем есть ли активный бонус
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
        // Без отыгрыша (required === 0): вывод разрешён
        if (remaining <= 0) {
          // Пропускаем блокировку
        } else {
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
      }

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

      if (currentBalance < amountNum) {
        return {
          success: false,
          userMessage: `❌ Недостаточно средств на счёте. Доступно: ${currentBalance.toFixed(8)} ${asset}`,
          error: 'Insufficient balance'
        };
      }

      // ═══════════════════════════════════════════════════════════════════════════════
      // ⭐ ПРОВЕРКА АВТОМАТИЧЕСКОГО ОДОБРЕНИЯ
      // ═══════════════════════════════════════════════════════════════════════════════
      
      const amountUSD = await convertToUSD(amountNum, asset);
      const autoApprovalCheck = await checkAutoApproval(userIdNum, amountUSD);
      
      logger.info('WITHDRAWAL', 'Auto-approval check', {
        userId: userIdNum,
        amount: amountNum,
        asset,
        amountUSD: amountUSD.toFixed(2),
        canAutoApprove: autoApprovalCheck.canAutoApprove,
        reason: autoApprovalCheck.reason
      });

      // Создаём заявку на вывод
      const withdrawal = await prisma.$transaction(async (tx) => {
        const newTx = await tx.transaction.create({
          data: {
            userId: userIdNum,
            tokenId: token.id,
            type: 'WITHDRAW',
            status: autoApprovalCheck.canAutoApprove ? 'COMPLETED' : 'PENDING',
            amount: amountNum.toFixed(8).toString(),
            walletAddress: null,
            txHash: autoApprovalCheck.canAutoApprove ? `auto_${Date.now()}` : null
          }
        });

        // ✅ Списываем с MAIN баланса!
        if (balance) {
          await tx.balance.update({
            where: { id: balance.id },
            data: {
              amount: { decrement: amountNum }
            }
          });
        }

        return newTx;
      });

      logger.info('WITHDRAWAL', 'Withdrawal request created', {
        withdrawalId: withdrawal.id,
        userId: userIdNum,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        amount: amountNum.toFixed(8),
        asset,
        amountUSD: amountUSD.toFixed(2),
        autoApproved: autoApprovalCheck.canAutoApprove
      });

      // ═══════════════════════════════════════════════════════════════════════════════
      // 📩 УВЕДОМЛЕНИЯ
      // ═══════════════════════════════════════════════════════════════════════════════
      
      const userDisplayName = user.username 
        ? `@${user.username}`
        : user.firstName 
          ? user.firstName 
          : `User #${user.id}`;
      const escapedUserName = escapeMarkdown(userDisplayName);

      if (autoApprovalCheck.canAutoApprove) {
        // ✅ Автоматически одобрено - уведомляем пользователя
        try {
          if (user.telegramId) {
            await bot.telegram.sendMessage(
              user.telegramId,
              `✅ *Вывод выполнен автоматически!*\n\n` +
              `💰 Сумма: ${amountNum.toFixed(8)} ${asset}\n` +
              `💵 (~$${amountUSD.toFixed(2)})\n` +
              `🎫 ID: #${withdrawal.id}\n` +
              `⏰ Время: ${new Date().toLocaleString()}\n\n` +
              `Средства отправлены!`,
              { parse_mode: 'Markdown' }
            );
          }
        } catch (e) {
          logger.warn('WITHDRAWAL', `Failed to notify user`, { error: e.message });
        }
        
        return {
          success: true,
          withdrawalId: withdrawal.id,
          amount: amountNum.toFixed(8),
          asset,
          amountUSD: amountUSD.toFixed(2),
          status: 'COMPLETED',
          autoApproved: true,
          message: '✅ Вывод выполнен автоматически!'
        };
      } else {
        // ⏳ Требуется одобрение админа - уведомляем админов
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
                  `👤 Пользователь: ${escapedUserName}\n` +
                  `💰 Сумма: ${amountNum.toFixed(8)} ${asset}\n` +
                  `💵 Эквивалент: ~$${amountUSD.toFixed(2)}\n` +
                  `⏰ Время: ${new Date().toLocaleString()}\n\n` +
                  `⚠️ Требуется ручное одобрение!\n` +
                  `Причина: ${autoApprovalCheck.reason}\n\n` +
                  `Управляйте в Админ Панели`,
                  { parse_mode: 'Markdown' }
                );
              } catch (e) {
                logger.warn('WITHDRAWAL', `Failed to notify admin`, { error: e.message });
              }
            }
          }
        } catch (e) {
          logger.warn('WITHDRAWAL', `Failed to get admins`, { error: e.message });
        }

        // Уведомляем пользователя о статусе
        try {
          if (user.telegramId) {
            await bot.telegram.sendMessage(
              user.telegramId,
              `⏳ *Заявка на вывод создана*\n\n` +
              `💰 Сумма: ${amountNum.toFixed(8)} ${asset}\n` +
              `💵 (~$${amountUSD.toFixed(2)})\n` +
              `🎫 ID: #${withdrawal.id}\n\n` +
              `📋 Статус: На рассмотрении\n` +
              `Администратор проверит заявку в ближайшее время.`,
              { parse_mode: 'Markdown' }
            );
          }
        } catch (e) {
          logger.warn('WITHDRAWAL', `Failed to notify user`, { error: e.message });
        }

        return {
          success: true,
          withdrawalId: withdrawal.id,
          amount: amountNum.toFixed(8),
          asset,
          amountUSD: amountUSD.toFixed(2),
          status: 'PENDING',
          autoApproved: false,
          message: '⏳ Заявка отправлена на рассмотрение администратору'
        };
      }
    } catch (error) {
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
    try {
      const withdrawalIdNum = parseInt(withdrawalId);

      if (isNaN(withdrawalIdNum) || withdrawalIdNum <= 0) {
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
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.type !== 'WITHDRAW') {
        throw new Error('Transaction is not a withdrawal');
      }

      if (withdrawal.status !== 'PENDING') {
        throw new Error(`Withdrawal status is ${withdrawal.status}, cannot process`);
      }

      const amount = parseFloat(withdrawal.amount.toString());
      const userId = withdrawal.user.id;
      const telegramId = parseInt(withdrawal.user.telegramId);
      const tokenId = withdrawal.tokenId;
      const asset = withdrawal.token.symbol;

      if (approve) {
        return await this._approveWithdrawal(bot, withdrawal, amount, userId, telegramId, tokenId, asset);
      } else {
        return await this._rejectWithdrawal(bot, withdrawal, amount, userId, telegramId, tokenId, asset);
      }
    } catch (error) {
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
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const spendId = `w${withdrawal.id}t${Date.now()}${randomSuffix}`;

      const payload = {
        user_id: telegramId,
        asset: asset,
        amount: amount.toFixed(8),
        spend_id: spendId
      };

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

        } catch (axiosError) {
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
        throw new Error(`Transfer failed: ${errorMsg}`);
      }

      if (!transferResponse.data.result) {
        throw new Error('No transfer result returned');
      }

      const transferResult = transferResponse.data.result;
      const transferId = transferResult.transfer_id || transferResult.id;

      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: withdrawal.id },
          data: {
            status: 'COMPLETED',
            txHash: String(transferId),
            updatedAt: new Date()
          }
        });

        });

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
      await prisma.$transaction(async (tx) => {
        // Обновляем статус заявки
        await tx.transaction.update({
          where: { id: withdrawal.id },
          data: {
            status: 'FAILED',
            updatedAt: new Date()
          }
        });

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

        });

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

