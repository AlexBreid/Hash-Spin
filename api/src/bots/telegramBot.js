/**
 * ✅ ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ telegramBot.js
 * КОПИРУЙ ВЕСЬ КОД В src/bots/telegramBot.js
 * 
 * ✅ ИСПРАВЛЕНИЯ:
 * 1. ✅ Импорт logger и validators
 * 2. ✅ Таймауты для очистки Map'ов (решение утечки памяти)
 * 3. ✅ toFixed(8) везде для денег
 * 4. ✅ Валидация везде
 * 5. ✅ Логирование вместо console
 * 6. ✅ Правильный импорт ReferralService (маленькая буква)
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const prisma = require('../../prismaClient');
const { registerNewUser, generateOneTimeToken } = require('../services/authService');
const referralService = require('../services/ReferralService'); // ✅ ИСПРАВЛЕНО: маленькая буква
const validators = require('../utils/validators'); // ✅ ДОБАВЛЕНО: импорт валидаторов
const logger = require('../utils/logger'); // ✅ ДОБАВЛЕНО: импорт логгера
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL;
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;
const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';

const WELCOME_IMAGE_PATH = path.join(__dirname, '../../assets/photo_2025-12-04_19-25-39.jpg');

// ====================================
// ВРЕМЕННЫЕ ХРАНИЛИЩА СОСТОЯНИЙ
// ====================================
const waitingForDeposit = new Map();
const waitingForWithdrawAmount = new Map();
const waitingForWithdrawAddress = new Map();

// ✅ ИСПРАВЛЕНИЕ #5: Функция очистки памяти (РЕШЕНИЕ УТЕЧКИ ПАМЯТИ)
function setStateTimeout(map, userId, timeoutMs = 10 * 60 * 1000) {
  setTimeout(() => {
    if (map.has(userId)) {
      map.delete(userId);
      logger.debug('BOT', `Cleaned up state for user ${userId}`);
    }
  }, timeoutMs);
}

// ====================================
// АВТОМАТИЧЕСКАЯ ПРОВЕРКА ИНВОЙСА
// ====================================
async function scheduleDepositCheck(bot, userId, invoiceId, amount, asset = 'USDT') {
    try {
      // ✅ ВАЛИДАЦИЯ
      const userIdNum = parseInt(userId);
      const invoiceIdNum = parseInt(invoiceId);
      const amountNum = parseFloat(amount);
      
      if (isNaN(userIdNum) || isNaN(invoiceIdNum) || isNaN(amountNum)) {
        logger.warn('BOT', 'Invalid parameters for scheduleDepositCheck', { userId, invoiceId, amount });
        return;
      }
      
      await prisma.pendingDeposit.upsert({
        where: { invoiceId: invoiceIdNum.toString() },
        create: {
          userId: userIdNum,
          invoiceId: invoiceIdNum.toString(),
          amount: amountNum.toFixed(8).toString(),
          asset: String(asset),
          status: 'pending'
        },
        update: { status: 'pending', updatedAt: new Date() }
      });

      setTimeout(async () => {
        try {
          const response = await axios.get(`${CRYPTO_PAY_API}/getInvoices`, {
            headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN },
            params: { invoiceIds: invoiceIdNum }
          });

          if (!response.data?.ok || !response.data.result?.items?.length) return;
          const invoice = response.data.result.items[0];
          if (invoice.status !== 'paid') {
            await prisma.pendingDeposit.update({
              where: { invoiceId: invoiceIdNum.toString() },
              data: { status: invoice.status }
            });
            return;
          }

          const existingTx = await prisma.transaction.findFirst({
            where: { txHash: invoiceIdNum.toString(), type: 'DEPOSIT', status: 'COMPLETED' }
          });
          if (existingTx) {
            logger.warn('BOT', `Duplicate invoice detected`, { invoiceId: invoiceIdNum });
            return;
          }

          const token = await prisma.cryptoToken.findUnique({ where: { symbol: asset } });
          if (!token) {
            logger.warn('BOT', `Token not found`, { asset });
            return;
          }

          // ✅ ИСПРАВЛЕНИЕ: toFixed(8)
          await prisma.transaction.create({
            data: {
              userId: userIdNum,
              tokenId: token.id,
              type: 'DEPOSIT',
              status: 'COMPLETED',
              amount: amountNum.toFixed(8).toString(),
              txHash: invoiceIdNum.toString()
            }
          });

          await prisma.balance.upsert({
            where: {
              userId_tokenId_type: { userId: userIdNum, tokenId: token.id, type: 'MAIN' }
            },
            create: { userId: userIdNum, tokenId: token.id, type: 'MAIN', amount: amountNum.toFixed(8).toString() },
            update: { amount: { increment: amountNum } }
          });

          if (asset === 'USDT') {
            try {
              await referralService.grantDepositBonus(userIdNum, amountNum, token.id);
            } catch (e) {
              logger.warn('BOT', `Failed to grant bonus`, { error: e.message });
            }
          }

          await prisma.pendingDeposit.update({
            where: { invoiceId: invoiceIdNum.toString() },
            data: { status: 'processed' }
          });

          try {
            const user = await prisma.user.findUnique({ 
              where: { id: userIdNum }, 
              select: { telegramId: true } 
            });
            if (user?.telegramId) {
              await bot.telegram.sendMessage(
                user.telegramId,
                `✅ *Пополнение на ${amountNum.toFixed(8)} ${asset} зачислено!*`,
                { parse_mode: 'Markdown' }
              );
            }
          } catch (e) {
            logger.warn('BOT', `Failed to send deposit notification`, { error: e.message });
          }
        } catch (error) {
          logger.error('BOT', `Error checking invoice`, { invoiceId: invoiceIdNum, error: error.message });
        }
      }, 3 * 60 * 1000);
      
    } catch (error) {
      logger.error('BOT', `Error scheduling deposit check`, { error: error.message });
    }
}

if (!BOT_TOKEN) {
    logger.error('BOT', 'TELEGRAM_BOT_TOKEN is not set');
    module.exports = { start: () => {} };
} else {
    const bot = new Telegraf(BOT_TOKEN);

    const getMainMenuKeyboard = () => ({
        reply_markup: {
            keyboard: [
                [{ text: '🎰 Казино' }],
                [{ text: '💰 Пополнить' }, { text: '💸 Вывести' }],
                [{ text: '📥 Мои выводы' }],
                [{ text: '👥 Рефералы' }, { text: '⚙️ Настройки' }],
                [{ text: '❓ Помощь' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });

    const getAdminMenuKeyboard = () => ({
        reply_markup: {
            keyboard: [
                [{ text: '🎰 Казино' }],
                [{ text: '💰 Пополнить' }, { text: '💸 Вывести' }],
                [{ text: '📊 АДМИН ПАНЕЛЬ' }, { text: '⚙️ Настройки' }],
                [{ text: '👥 Рефералы' }, { text: '💳 Платежи' }],
                [{ text: '❓ Помощь' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });

    const getOpenCasinoButton = (authUrl) => ({
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 Открыть Казино', web_app: { url: authUrl } }]
            ]
        }
    });

    const cryptoPayAPI = {
        async createInvoice(amount, asset, description, userId) {
            try {
              // ✅ ВАЛИДАЦИЯ
              const amountNum = parseFloat(amount);
              if (isNaN(amountNum) || amountNum <= 0) {
                logger.warn('BOT', 'Invalid amount for invoice', { amount });
                return null;
              }
              
              if (!validators.validateAsset(asset)) {
                logger.warn('BOT', 'Invalid asset', { asset });
                return null;
              }
              
              const userIdNum = parseInt(userId);
              if (isNaN(userIdNum)) {
                logger.warn('BOT', 'Invalid userId for invoice', { userId });
                return null;
              }
              
              const response = await axios.post(
                `${CRYPTO_PAY_API}/createInvoice`,
                {
                  asset: String(asset),
                  amount: amountNum.toFixed(8).toString(),
                  description: String(description),
                  payload: userIdNum.toString(),
                  allow_comments: false,
                  allow_anonymous: false
                },
                {
                  headers: {
                    'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN,
                    'Content-Type': 'application/json'
                  }
                }
              );

              if (response.data.ok) {
                logger.info('BOT', `Invoice created`, { invoiceId: response.data.result.invoice_id, amount: amountNum.toFixed(8) });
                return response.data.result;
              }
              
              logger.error('BOT', `Crypto Pay API error`, { response: response.data });
              return null;
            } catch (error) {
              logger.error('BOT', `Error creating invoice`, { error: error.message });
              return null;
            }
        },

        async getInvoices(invoiceIds) {
            try {
              const response = await axios.get(
                `${CRYPTO_PAY_API}/getInvoices`,
                {
                  headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN },
                  params: { invoiceIds: invoiceIds.join(',') }
                }
              );
              return response.data.ok ? response.data.result : null;
            } catch (error) {
              logger.error('BOT', `Error getting invoices`, { error: error.message });
              return null;
            }
        }
    };

    async function getUserBalance(userId, tokenSymbol = 'USDT') {
        try {
          const userIdNum = parseInt(userId);
          if (isNaN(userIdNum) || !validators.validateUserId(userIdNum)) {
            return 0;
          }
          
          const balance = await prisma.balance.findFirst({
            where: { userId: userIdNum, token: { symbol: tokenSymbol }, type: 'MAIN' }
          });
          
          return balance ? parseFloat(balance.amount.toString()) : 0;
        } catch (error) {
          logger.error('BOT', `Error getting user balance`, { error: error.message });
          return 0;
        }
    }

    bot.start(async (ctx) => {
        const telegramId = ctx.from.id.toString();

        try {
            let user = await prisma.user.findUnique({ where: { telegramId } });

            if (user && user.isBlocked) {
                logger.warn('BOT', `Blocked user tried to start bot`, { userId: user.id });
                await ctx.reply('🚫 Ваш аккаунт заблокирован.');
                return;
            }

            let isNewUser = false;
            let rawPassword = null;
            let referralApplied = false;

            const startPayload = ctx.startPayload;
            let referralCode = null;
            if (startPayload && startPayload.startsWith('ref_')) {
                referralCode = startPayload.replace('ref_', '');
            }

            if (!user) {
                const { user: newUser, rawPassword: pwd } = await registerNewUser(ctx.from);
                user = newUser;
                rawPassword = pwd;
                isNewUser = true;
                
                logger.info('BOT', `New user registered`, { userId: user.id, telegramId });

                if (referralCode) {
                    const referrer = await prisma.user.findUnique({
                        where: { referralCode },
                        select: { id: true }
                    });

                    if (referrer && referrer.id !== user.id) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { referredById: referrer.id }
                        });
                        referralApplied = true;
                        logger.info('BOT', `Referral applied`, { userId: user.id, referrerId: referrer.id });
                    }
                }
            }

            const commonSlogan = `🎰 *Добро пожаловать в SafariX — Казино будущего!* 🌍

🚀 Здесь каждый спин — шаг к выигрышу!  
💎 Крипто-ставки без границ  
⚡ Мгновенные выплаты  
🎁 Ежедневные бонусы и турниры

🔥 *Играй. Выигрывай. Наслаждайся.*`;

            let credentialsBlock = '';
            if (isNewUser) {
                const username = ctx.from.username;
                credentialsBlock = `\n\n✨ *Ваши данные для входа:*\n` +
                    `🔑 Логин: \`${username ? `@${username}` : `ID: ${user.id}`}\`\n` +
                    `🔐 Пароль: \`${rawPassword}\`\n\n` +
                    `⚠️ *Сохраните пароль! Он показывается только один раз.*`;
                
                if (referralApplied) {
                    credentialsBlock += `\n\n🎁 *Бонус активирован!*\nПри первом депозите получите +100% на бонусный баланс!`;
                }
            }

            const fullMessage = commonSlogan + credentialsBlock;

            try {
                if (fs.existsSync(WELCOME_IMAGE_PATH)) {
                    await ctx.replyWithPhoto(
                        { source: fs.createReadStream(WELCOME_IMAGE_PATH) },
                        { caption: fullMessage, parse_mode: 'Markdown' }
                    );
                } else {
                    await ctx.reply(fullMessage, { parse_mode: 'Markdown' });
                }
            } catch (imageError) {
                logger.warn('BOT', `Error sending welcome image`, { error: imageError.message });
                await ctx.reply(fullMessage, { parse_mode: 'Markdown' });
            }

            const menu = user.isAdmin ? getAdminMenuKeyboard() : getMainMenuKeyboard();
            await ctx.reply('📋 *Выберите действие:*', menu);
        } catch (error) {
            logger.error('BOT', `Error in /start command`, { error: error.message });
            await ctx.reply("Произошла ошибка. Попробуйте позже.");
        }
    });

    // ====================================
    // АДМИН КОМАНДЫ
    // ====================================
    bot.command('admin_stats', async (ctx) => {
      try {
        const admin = await prisma.user.findUnique({ 
          where: { telegramId: ctx.from.id.toString() } 
        });
        
        if (!admin?.isAdmin) {
          logger.warn('BOT', `Non-admin user tried to access admin_stats`, { telegramId: ctx.from.id });
          return await ctx.reply('🚫 Только для администраторов.');
        }

        const totalUsers = await prisma.user.count();
        const totalTransactions = await prisma.transaction.count();
        const totalDeposits = await prisma.transaction.aggregate({
          where: { type: 'DEPOSIT', status: 'COMPLETED' },
          _sum: { amount: true }
        });
        const totalWithdrawals = await prisma.transaction.aggregate({
          where: { type: 'WITHDRAW', status: 'COMPLETED' },
          _sum: { amount: true }
        });
        const pendingWithdrawals = await prisma.transaction.count({
          where: { type: 'WITHDRAW', status: 'PENDING' }
        });
        const totalGames = await prisma.crashRound.count();
        const totalBets = await prisma.crashBet.count();

        // ✅ ИСПРАВЛЕНИЕ: toFixed(8)
        const depositAmount = parseFloat(totalDeposits._sum.amount?.toString() || '0');
        const withdrawAmount = parseFloat(totalWithdrawals._sum.amount?.toString() || '0');

        const statsMsg = `👑 *СТАТИСТИКА СИСТЕМЫ*\n\n` +
          `👥 Всего пользователей: ${totalUsers}\n` +
          `💰 Всего депозитов: ${depositAmount.toFixed(8)} USDT\n` +
          `💸 Всего выводов: ${withdrawAmount.toFixed(8)} USDT\n` +
          `⏳ На обработке: ${pendingWithdrawals} заявок\n\n` +
          `🎰 *ИГРЫ*\n` +
          `🎮 Раундов: ${totalGames}\n` +
          `🎲 Ставок: ${totalBets}\n` +
          `📊 Всего транзакций: ${totalTransactions}`;

        logger.info('BOT', `Admin accessed stats`);
        await ctx.reply(statsMsg, { parse_mode: 'Markdown' });
        
      } catch (error) {
        logger.error('BOT', `Error in admin_stats`, { error: error.message });
        await ctx.reply('❌ Ошибка при получении статистики.');
      }
    });

    bot.command('approve_withdraw', async (ctx) => {
        try {
            const admin = await prisma.user.findUnique({
                where: { telegramId: ctx.from.id.toString() }
            });

            if (!admin?.isAdmin) {
                logger.warn('BOT', `Non-admin tried to approve withdrawal`);
                return await ctx.reply('🚫 Только для администраторов.');
            }

            const parts = ctx.message.text.trim().split(/\s+/);
            const withdrawalId = parts[1] ? parseInt(parts[1], 10) : null;

            if (!withdrawalId || isNaN(withdrawalId)) {
                return await ctx.reply('❌ Использование: /approve_withdraw <ID_заявки>');
            }

            const withdrawal = await prisma.transaction.findUnique({
                where: { id: withdrawalId },
                include: { user: true }
            });

            if (!withdrawal) {
                return await ctx.reply(`❌ Заявка #${withdrawalId} не найдена.`);
            }

            if (withdrawal.type !== 'WITHDRAW') {
                return await ctx.reply(`❌ Запись #${withdrawalId} — не вывод.`);
            }

            if (withdrawal.status !== 'PENDING') {
                return await ctx.reply(`❌ Заявка #${withdrawalId} уже обработана. Статус: ${withdrawal.status}`);
            }

            const txHash = 'TX_' + Date.now();
            const withdrawAmount = parseFloat(withdrawal.amount.toString());

            await prisma.transaction.update({
                where: { id: withdrawalId },
                data: { status: 'COMPLETED', txHash }
            });

            logger.info('BOT', `Withdrawal approved`, { withdrawalId, userId: withdrawal.userId });

            if (withdrawal.user?.telegramId) {
                try {
                    await bot.telegram.sendMessage(
                        withdrawal.user.telegramId,
                        `✅ Вывод на ${withdrawAmount.toFixed(8)} USDT выполнен!\nTX: \`${txHash}\``,
                        { parse_mode: 'Markdown' }
                    );
                } catch (e) {
                    logger.warn('BOT', `Failed to send withdrawal confirmation`, { error: e.message });
                }
            }

            await ctx.reply(`✅ Заявка #${withdrawalId} успешно подтверждена!`);
            
        } catch (error) {
            logger.error('BOT', `Error in approve_withdraw`, { error: error.message });
            await ctx.reply('💥 Произошла внутренняя ошибка.');
        }
    });

    bot.command('set_worker', async (ctx) => {
        try {
            const admin = await prisma.user.findUnique({ 
              where: { telegramId: ctx.from.id.toString() } 
            });
            
            if (!admin?.isAdmin) {
              return await ctx.reply('🚫 Только для администраторов.');
            }
            
            const userId = parseInt(ctx.message.text.split(' ')[1]);
            if (!userId || isNaN(userId)) {
              return await ctx.reply('Использование: /set_worker <user_id>');
            }
            
            await referralService.setUserAsWorker(userId);
            logger.info('BOT', `User set as worker`, { userId });
            await ctx.reply(`✅ Пользователь ${userId} теперь ВОРКЕР (5% от профита)`);
            
        } catch (error) {
            logger.error('BOT', `Error in set_worker`, { error: error.message });
            await ctx.reply('❌ Ошибка');
        }
    });

    bot.command('remove_worker', async (ctx) => {
        try {
            const admin = await prisma.user.findUnique({ 
              where: { telegramId: ctx.from.id.toString() } 
            });
            
            if (!admin?.isAdmin) {
              return await ctx.reply('🚫 Только для администраторов.');
            }
            
            const userId = parseInt(ctx.message.text.split(' ')[1]);
            if (!userId || isNaN(userId)) {
              return await ctx.reply('Использование: /remove_worker <user_id>');
            }
            
            await prisma.user.update({ 
              where: { id: userId }, 
              data: { referrerType: 'REGULAR' } 
            });
            
            logger.info('BOT', `User removed from worker`, { userId });
            await ctx.reply(`✅ Пользователь ${userId} теперь обычный реферал (30% комиссия)`);
            
        } catch (error) {
            logger.error('BOT', `Error in remove_worker`, { error: error.message });
            await ctx.reply('❌ Ошибка');
        }
    });

    bot.command('payout_all', async (ctx) => {
        try {
            const admin = await prisma.user.findUnique({ 
              where: { telegramId: ctx.from.id.toString() } 
            });
            
            if (!admin?.isAdmin) {
              return await ctx.reply('🚫 Только для администраторов.');
            }
            
            await ctx.reply('⏳ Выплачиваю комиссии...');
            const result = await referralService.processAllPendingCommissions();
            
            logger.info('BOT', `Payout completed`, result);
            
            await ctx.reply(
              `✅ *Выплата завершена*\n\n` +
              `📊 Обработано: ${result.processed}\n` +
              `✅ Успешно: ${result.success}\n` +
              `💰 Выплачено: ${result.totalPaid} USDT`,
              { parse_mode: 'Markdown' }
            );
            
        } catch (error) {
            logger.error('BOT', `Error in payout_all`, { error: error.message });
            await ctx.reply('❌ Ошибка');
        }
    });

    bot.command('block_user', async (ctx) => {
        try {
            const admin = await prisma.user.findUnique({ 
              where: { telegramId: ctx.from.id.toString() } 
            });
            
            if (!admin?.isAdmin) {
              return await ctx.reply('🚫 Только для администраторов.');
            }

            const parts = ctx.message.text.trim().split(/\s+/);
            const userIdOrTgId = parts[1];

            if (!userIdOrTgId) {
              return await ctx.reply('❌ Использование: /block_user <user_id или telegram_id>');
            }

            let user;
            if (!isNaN(userIdOrTgId)) {
              user = await prisma.user.findFirst({
                where: {
                  OR: [
                    { id: parseInt(userIdOrTgId, 10) },
                    { telegramId: userIdOrTgId }
                  ]
                }
              });
            } else {
              user = await prisma.user.findUnique({ 
                where: { username: userIdOrTgId.replace('@', '') } 
              });
            }

            if (!user) {
              return await ctx.reply(`❌ Пользователь не найден.`);
            }

            await prisma.user.update({
              where: { id: user.id },
              data: { isBlocked: true }
            });

            if (user.telegramId) {
              try {
                await bot.telegram.sendMessage(user.telegramId, '🚫 Ваш аккаунт заблокирован администратором.');
              } catch (e) {}
            }

            logger.info('BOT', `User blocked`, { userId: user.id });
            await ctx.reply(`✅ Пользователь ${user.username || user.id} заблокирован.`);
            
        } catch (error) {
            logger.error('BOT', `Error in block_user`, { error: error.message });
            await ctx.reply('❌ Ошибка при блокировке пользователя.');
        }
    });

    bot.command('unblock_user', async (ctx) => {
        try {
            const admin = await prisma.user.findUnique({ 
              where: { telegramId: ctx.from.id.toString() } 
            });
            
            if (!admin?.isAdmin) {
              return await ctx.reply('🚫 Только для администраторов.');
            }

            const parts = ctx.message.text.trim().split(/\s+/);
            const userIdOrTgId = parts[1];

            if (!userIdOrTgId) {
              return await ctx.reply('❌ Использование: /unblock_user <user_id или telegram_id>');
            }

            let user;
            if (!isNaN(userIdOrTgId)) {
              user = await prisma.user.findFirst({
                where: {
                  OR: [
                    { id: parseInt(userIdOrTgId, 10) },
                    { telegramId: userIdOrTgId }
                  ]
                }
              });
            } else {
              user = await prisma.user.findUnique({ 
                where: { username: userIdOrTgId.replace('@', '') } 
              });
            }

            if (!user) {
              return await ctx.reply(`❌ Пользователь не найден.`);
            }

            await prisma.user.update({
              where: { id: user.id },
              data: { isBlocked: false }
            });

            if (user.telegramId) {
              try {
                await bot.telegram.sendMessage(user.telegramId, '✅ Ваш аккаунт разблокирован.');
              } catch (e) {}
            }

            logger.info('BOT', `User unblocked`, { userId: user.id });
            await ctx.reply(`✅ Пользователь ${user.username || user.id} разблокирован.`);
            
        } catch (error) {
            logger.error('BOT', `Error in unblock_user`, { error: error.message });
            await ctx.reply('❌ Ошибка при разблокировке пользователя.');
        }
    });

    bot.on('message', async (ctx) => {
        if (!ctx.message?.text) return;
        const text = ctx.message.text.trim();
        if (!text) return;

        try {
            const user = await prisma.user.findUnique({ 
              where: { telegramId: ctx.from.id.toString() } 
            });
            
            if (!user) {
                await ctx.reply('Пожалуйста, нажмите /start для регистрации');
                return;
            }
            
            if (user.isBlocked) {
                logger.warn('BOT', `Blocked user sent message`, { userId: user.id });
                await ctx.reply('🚫 Ваш аккаунт заблокирован.');
                return;
            }

            // ✅ ПРОВЕРКА СУММЫ ВЫВОДА
            if (waitingForWithdrawAmount.has(user.id)) {
              const amount = parseFloat(text);
              const balance = await getUserBalance(user.id);
              
              if (!validators.validateWithdrawAmount(amount) || amount > balance) {
                await ctx.reply(`❌ Некорректная сумма. Доступно: ${balance.toFixed(8)} USDT. Попробуйте снова.`);
                return;
              }
              
              waitingForWithdrawAmount.delete(user.id);
              waitingForWithdrawAddress.set(user.id, amount);
              setStateTimeout(waitingForWithdrawAddress, user.id); // ✅ ДОБАВЛЕН ТАЙМАУТ
              
              await ctx.reply(`Теперь введите адрес кошелька для вывода ${amount.toFixed(8)} USDT:`);
              logger.info('BOT', `User entered withdraw amount`, { userId: user.id, amount: amount.toFixed(8) });
              return;
            }

            // ✅ ПРОВЕРКА АДРЕСА ВЫВОДА
            if (waitingForWithdrawAddress.has(user.id)) {
              const amount = waitingForWithdrawAddress.get(user.id);
              const walletAddress = text.trim();

              if (!validators.validateWalletAddress(walletAddress)) {
                await ctx.reply('❌ Некорректный адрес кошелька. Попробуйте снова.');
                logger.warn('BOT', `Invalid wallet address`, { userId: user.id, address: walletAddress });
                return;
              }

              waitingForWithdrawAddress.delete(user.id);

              const currentBalance = await getUserBalance(user.id);
              if (currentBalance < amount) {
                await ctx.reply('❌ Недостаточно средств для вывода.');
                return;
              }

              const usdtToken = await prisma.cryptoToken.findFirst({ 
                where: { symbol: 'USDT' } 
              });
              
              if (!usdtToken) {
                await ctx.reply('❌ Ошибка: USDT не найден.');
                return;
              }

              const withdrawal = await prisma.transaction.create({
                data: {
                  userId: user.id,
                  tokenId: usdtToken.id,
                  type: 'WITHDRAW',
                  status: 'PENDING',
                  amount: amount.toFixed(8).toString(),
                  walletAddress,
                  txHash: null
                }
              });

              await prisma.balance.update({
                where: { 
                  userId_tokenId_type: { userId: user.id, tokenId: usdtToken.id, type: 'MAIN' } 
                },
                data: { amount: { decrement: amount } }
              });

              logger.info('BOT', `Withdrawal created`, { userId: user.id, amount: amount.toFixed(8), walletAddress });

              await ctx.reply(
                `✅ Заявка на вывод создана!\n\nСумма: ${amount.toFixed(8)} USDT\nАдрес: \`${walletAddress}\`\n\nОжидайте обработки администратором.`,
                { parse_mode: 'Markdown' }
              );

              const admins = await prisma.user.findMany({ where: { isAdmin: true } });
              for (const admin of admins) {
                if (admin.telegramId) {
                  try {
                    await bot.telegram.sendMessage(
                      admin.telegramId,
                      `💸 НОВАЯ ЗАЯВКА НА ВЫВОД\nПользователь: ${user.id}\nСумма: ${amount.toFixed(8)} USDT\nАдрес: ${walletAddress}\n\nКоманда: /approve_withdraw ${withdrawal.id}`
                    );
                  } catch (e) {
                    logger.warn('BOT', `Failed to send withdrawal notification to admin`, { error: e.message });
                  }
                }
              }
              return;
            }

            // ✅ ПРОВЕРКА СУММЫ ДЕПОЗИТА
            if (waitingForDeposit.has(user.id)) {
              const amount = parseFloat(text);
              
              if (!validators.validateDepositAmount(amount)) {
                await ctx.reply("❌ Введите корректную сумму (от 0.01 до 1000000 USDT). Пример: 10.5");
                return;
              }
              
              waitingForDeposit.delete(user.id);
              logger.info('BOT', `User entered deposit amount`, { userId: user.id, amount: amount.toFixed(8) });
              
              // Проверяем первый ли это депозит
              const existingDeposit = await prisma.transaction.findFirst({
                where: {
                  userId: user.id,
                  type: 'DEPOSIT',
                  status: 'COMPLETED'
                }
              });
              
              if (user.referredById && !existingDeposit) {
                // Показываем вопрос о бонусе
                await ctx.reply(
                  `💰 *Пополнение на ${amount.toFixed(8)} USDT*\n\n🎁 Использовать бонус?`,
                  {
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: "✅ С БОНУСОМ +100%", callback_data: `confirm_deposit_${amount}_yes` }],
                        [{ text: "💎 БЕЗ БОНУСА", callback_data: `confirm_deposit_${amount}_no` }]
                      ]
                    },
                    parse_mode: "Markdown"
                  }
                );
              } else {
                // Пополняем без вопроса
                const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);
                if (!invoice) {
                  await ctx.reply("❌ Ошибка при создании инвойса.");
                  return;
                }
                
                scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT');
                
                await ctx.reply(
                  `✅ *Инвойс создан*\n\nСумма: ${amount.toFixed(8)} USDT`,
                  {
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: "💳 Оплатить", url: invoice.bot_invoice_url }],
                        [{ text: "🔄 Проверить", callback_data: `check_invoice_${invoice.invoice_id}` }]
                      ]
                    },
                    parse_mode: "Markdown"
                  }
                );
              }
              return;
            }

            // ✅ ОСНОВНЫЕ КОМАНДЫ
            switch (text) {
                case '🎰 Казино':
                    const oneTimeToken = await generateOneTimeToken(user.id);
                    const authUrl = `${FRONTEND_URL}/login?token=${oneTimeToken}`;
                    if (FRONTEND_URL.startsWith('https://')) {
                        await ctx.reply('🚀 *Открываем казино...*', getOpenCasinoButton(authUrl));
                    } else {
                        await ctx.reply(`🔗 Ссылка для входа:\n${authUrl}`);
                    }
                    break;

                case '💰 Пополнить':
                    waitingForDeposit.set(user.id, true);
                    setStateTimeout(waitingForDeposit, user.id); // ✅ ДОБАВЛЕН ТАЙМАУТ
                    
                    await ctx.reply(
                        `💰 *Пополнение счета*\n\nВыберите сумму или введите свою:`,
                        {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '10 USDT', callback_data: 'deposit_10' }, { text: '50 USDT', callback_data: 'deposit_50' }],
                                    [{ text: '100 USDT', callback_data: 'deposit_100' }, { text: '500 USDT', callback_data: 'deposit_500' }],
                                    [{ text: 'Другая сумма', callback_data: 'deposit_custom' }]
                                ]
                            },
                            parse_mode: 'Markdown'
                        }
                    );
                    break;

                case '💸 Вывести':
                    const balance = await getUserBalance(user.id);
                    if (balance < 1) {
                        await ctx.reply('❌ Минимальный баланс для вывода — 1 USDT.');
                        return;
                    }
                    
                    waitingForWithdrawAmount.set(user.id, true);
                    setStateTimeout(waitingForWithdrawAmount, user.id); // ✅ ДОБАВЛЕН ТАЙМАУТ
                    
                    await ctx.reply(
                        `💸 *Выберите сумму для вывода:*`,
                        {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '10 USDT', callback_data: 'withdraw_10' }],
                                    [{ text: '50 USDT', callback_data: 'withdraw_50' }],
                                    [{ text: '100 USDT', callback_data: 'withdraw_100' }],
                                    [{ text: 'Другая сумма', callback_data: 'withdraw_custom' }]
                                ]
                            },
                            parse_mode: 'Markdown'
                        }
                    );
                    break;

                case '📥 Мои выводы':
                    const userTx = await prisma.transaction.findMany({
                        where: {
                            userId: user.id,
                            type: 'WITHDRAW'
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                        select: {
                            id: true,
                            amount: true,
                            status: true,
                            walletAddress: true,
                            createdAt: true
                        }
                    });

                    if (userTx.length === 0) {
                        await ctx.reply('У вас пока нет заявок на вывод.');
                        return;
                    }

                    let msg = `📥 *Ваши последние заявки на вывод:*\n\n`;
                    for (const tx of userTx) {
                        const statusEmoji = 
                            tx.status === 'PENDING' ? '⏳' :
                            tx.status === 'COMPLETED' ? '✅' :
                            '❌';
                        const statusText = 
                            tx.status === 'PENDING' ? 'В обработке' :
                            tx.status === 'COMPLETED' ? 'Выполнен' :
                            'Отклонён';

                        const txAmount = parseFloat(tx.amount.toString());
                        const addr = tx.walletAddress || '—';
                        const shortAddr = addr.length > 10 ? `${addr.slice(0,6)}...${addr.slice(-4)}` : addr;

                        msg += `${statusEmoji} *${txAmount.toFixed(8)} USDT*\n` +
                               `Адрес: \`${shortAddr}\`\n` +
                               `Статус: ${statusText}\n` +
                               `ID: #${tx.id}\n\n`;
                    }

                    await ctx.reply(msg, { parse_mode: 'Markdown' });
                    break;

                case '👥 Рефералы':
                    try {
                        const stats = await referralService.getReferrerStats(user.id);
                        const userInfo = await prisma.user.findUnique({
                            where: { id: user.id },
                            select: { referralCode: true, referrerType: true }
                        });
                        
                        const referralLink = `https://t.me/${ctx.botInfo.username}?start=ref_${userInfo.referralCode}`;
                        const typeEmoji = userInfo.referrerType === 'WORKER' ? '👷' : '👤';
                        
                        const refMsg = `${typeEmoji} *Реферальная программа*\n\n` +
                          `🔗 Ваша ссылка:\n\`${referralLink}\`\n\n` +
                          `📊 *Статистика:*\n` +
                          `👥 Рефералов: ${stats.referralsCount}\n` +
                          `💰 Оборот: ${stats.totalTurnover} USDT\n` +
                          `✅ Выплачено: ${stats.totalCommissionPaid} USDT\n` +
                          `⏳ Накоплено: ${stats.potentialCommission} USDT\n\n` +
                          `💎 Ваша комиссия: *${stats.commissionRate}%*`;
                        
                        await ctx.reply(refMsg, { parse_mode: 'Markdown' });
                    } catch (error) {
                        logger.error('BOT', `Error in referrals command`, { error: error.message });
                        await ctx.reply('❌ Ошибка при получении информации о рефералах.');
                    }
                    break;

                case '⚙️ Настройки':
                    const userBal = await getUserBalance(user.id);
                    const badges = [];
                    if (user.isAdmin) badges.push('👑 АДМИН');
                    if (user.referrerType === 'WORKER') badges.push('👷 ВОРКЕР');
                    
                    await ctx.reply(
                        `⚙️ *Настройки*\n\n` +
                        `👤 ${user.username ? '@' + user.username : 'ID: ' + user.id}\n` +
                        `💰 Основной: ${userBal.toFixed(8)} USDT` +
                        (badges.length ? `\n${badges.join(' | ')}` : ''),
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case '❓ Помощь':
                    await ctx.reply(
                        `❓ *Справка*\n\n` +
                        `💬 Поддержка: @support_casino\n\n` +
                        `*Команды:*\n` +
                        `/balance - Баланс\n` +
                        `/bonus - Статус бонуса`,
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case '📊 АДМИН ПАНЕЛЬ':
                    if (!user.isAdmin) {
                        await ctx.reply('🚫 Только для администраторов.');
                        return;
                    }
                    await ctx.reply(
                        `👑 *АДМИН ПАНЕЛЬ*\n\n` +
                        `/admin_stats - Статистика\n` +
                        `/set_worker <id> - Сделать воркером\n` +
                        `/remove_worker <id> - Убрать воркера\n` +
                        `/payout_all - Выплатить комиссии\n` +
                        `/approve_withdraw <id> - Подтвердить вывод\n` +
                        `/block_user <id> - Заблокировать\n` +
                        `/unblock_user <id> - Разблокировать`,
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case '💳 Платежи':
                    if (!user.isAdmin) {
                        await ctx.reply('🚫 Только для администраторов.');
                        return;
                    }
                    await ctx.reply(
                        `Выберите тип платежей:`,
                        {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '📤 Выводы в обработке', callback_data: 'pending_withdraws_0' }],
                                    [{ text: '📥 Все депозиты', callback_data: 'all_deposits_0' }]
                                ]
                            }
                        }
                    );
                    break;

                default:
                    if (!text.startsWith('/')) {
                        const menu = user.isAdmin ? getAdminMenuKeyboard() : getMainMenuKeyboard();
                        await ctx.reply('📋 *Выберите действие:*', menu);
                    }
                    break;
            }
        } catch (error) {
            logger.error('BOT', `Error handling message`, { error: error.message });
            await ctx.reply('❌ Ошибка. Попробуйте еще раз.');
        }
    });

    // ====================================
    // CALLBACKS
    // ====================================
    bot.action('deposit_custom', async (ctx) => {
        const user = await prisma.user.findUnique({ 
          where: { telegramId: ctx.from.id.toString() } 
        });
        if (!user) return;
        
        waitingForDeposit.set(user.id, true);
        setStateTimeout(waitingForDeposit, user.id); // ✅ ДОБАВЛЕН ТАЙМАУТ
        
        await ctx.reply("Введите сумму в USDT (пример: 15.25)");
        await ctx.answerCbQuery();
    });

    bot.action(/confirm_deposit_(\d+(?:\.\d+)?)_(yes|no)/, async (ctx) => {
        try {
            const amountStr = ctx.match[1];
            const useBonus = ctx.match[2] === 'yes';
            const amount = parseFloat(amountStr);
            
            if (!validators.validateDepositAmount(amount)) {
                await ctx.answerCbQuery("❌ Некорректная сумма");
                return;
            }
            
            const user = await prisma.user.findUnique({ 
              where: { telegramId: ctx.from.id.toString() } 
            });
            
            if (!user) {
                await ctx.answerCbQuery("❌ Пользователь не найден.");
                return;
            }

            const description = useBonus 
              ? `Deposit User #${user.id} WITH BONUS +100%`
              : `Deposit User #${user.id}`;

            const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", description, user.id);
            if (!invoice) {
                await ctx.answerCbQuery("❌ Ошибка создания инвойса.");
                return;
            }

            scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT');

            const bonusText = useBonus 
              ? `\n\n🎁 *С БОНУСОМ:*\n• +${amount.toFixed(8)} USDT бонуса\n• Отыграй в 10x\n• Действует 7 дней`
              : `\n\n💎 *БЕЗ БОНУСА:*\n• Сразу на счёт`;

            try {
                await ctx.deleteMessage();
            } catch (e) {}

            await ctx.reply(
              `✅ *Инвойс создан*\n\nСумма: ${amount.toFixed(8)} USDT${bonusText}`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "💳 Оплатить", url: invoice.bot_invoice_url }],
                    [{ text: "🔄 Проверить статус", callback_data: `check_invoice_${invoice.invoice_id}` }]
                  ]
                },
                parse_mode: "Markdown"
              }
            );
            
            await ctx.answerCbQuery();
        } catch (error) {
            logger.error('BOT', `Error in confirm_deposit callback`, { error: error.message });
            await ctx.answerCbQuery(`❌ Ошибка: ${error.message}`);
        }
    });

    bot.action(/deposit_(\d+)/, async (ctx) => {
        try {
            const amount = parseFloat(ctx.match[1]);
            
            if (!validators.validateDepositAmount(amount)) {
                await ctx.answerCbQuery("❌ Некорректная сумма");
                return;
            }
            
            const user = await prisma.user.findUnique({ 
              where: { telegramId: ctx.from.id.toString() } 
            });
            
            if (!user) return;

            const existingDeposit = await prisma.transaction.findFirst({
              where: {
                userId: user.id,
                type: 'DEPOSIT',
                status: 'COMPLETED'
              }
            });

            if (user.referredById && !existingDeposit) {
              try {
                await ctx.deleteMessage();
              } catch (e) {}
              
              await ctx.reply(
                `💰 *Пополнение на ${amount.toFixed(8)} USDT*\n\n🎁 Использовать бонус +100%?`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "✅ С БОНУСОМ +100%", callback_data: `confirm_deposit_${amount}_yes` }],
                      [{ text: "💎 БЕЗ БОНУСА", callback_data: `confirm_deposit_${amount}_no` }]
                    ]
                  },
                  parse_mode: "Markdown"
                }
              );
            } else {
              const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);
              if (!invoice) {
                await ctx.reply("❌ Ошибка создания инвойса.");
                return await ctx.answerCbQuery();
              }
              
              scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT');
              
              try {
                await ctx.deleteMessage();
              } catch (e) {}
              
              await ctx.reply(
                `✅ *Инвойс создан*\n\nСумма: ${amount.toFixed(8)} USDT`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "💳 Оплатить", url: invoice.bot_invoice_url }],
                      [{ text: "🔄 Проверить", callback_data: `check_invoice_${invoice.invoice_id}` }]
                    ]
                  },
                  parse_mode: "Markdown"
                }
              );
            }
            
            await ctx.answerCbQuery();
        } catch (error) {
            logger.error('BOT', `Error in deposit callback`, { error: error.message });
            await ctx.answerCbQuery('❌ Ошибка');
        }
    });

    bot.action(/check_invoice_(\d+)/, async (ctx) => {
        try {
            const invoiceId = parseInt(ctx.match[1]);
            if (isNaN(invoiceId)) {
                await ctx.answerCbQuery('❌ Некорректный ID инвойса');
                return;
            }
            
            await ctx.answerCbQuery('🔍 Проверяем статус...');
            const result = await cryptoPayAPI.getInvoices([invoiceId]);
            
            if (!result?.items?.length) {
                await ctx.reply('ℹ️ Инвойс не найден.');
                return;
            }
            
            const invoice = result.items[0];
            if (invoice.status === 'paid') {
                try {
                    await ctx.editMessageText(`✅ *Средства приняты*, обработка...`, { parse_mode: 'Markdown' });
                } catch (e) {
                    if (!e.description?.includes('message is not modified')) {
                        await ctx.reply('✅ Оплата подтверждена! Средства зачислены.');
                    }
                }
            } else if (invoice.status === 'active') {
                await ctx.reply(
                    `⏳ Инвойс ожидает оплаты`,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '💳 Оплатить', url: invoice.bot_invoice_url }],
                                [{ text: '🔄 Проверить снова', callback_data: `check_invoice_${invoiceId}` }]
                            ]
                        }
                    }
                );
            } else {
                await ctx.editMessageText(`❌ Инвойс ${invoice.status}`, { parse_mode: 'Markdown' });
            }
            
        } catch (error) {
            logger.error('BOT', `Error in check_invoice callback`, { error: error.message });
            await ctx.answerCbQuery('⚠️ Ошибка при проверке');
        }
    });

    bot.action(/withdraw_(\d+)/, async (ctx) => {
        try {
            const amount = parseFloat(ctx.match[1]);
            
            if (!validators.validateWithdrawAmount(amount)) {
                await ctx.answerCbQuery('❌ Некорректная сумма');
                return;
            }
            
            const user = await prisma.user.findUnique({ 
              where: { telegramId: ctx.from.id.toString() } 
            });
            
            if (!user) {
                return await ctx.answerCbQuery('Пользователь не найден.');
            }

            const balance = await getUserBalance(user.id);
            if (balance < amount) {
                await ctx.answerCbQuery('❌ Недостаточно средств.');
                return;
            }

            waitingForWithdrawAddress.set(user.id, amount);
            setStateTimeout(waitingForWithdrawAddress, user.id); // ✅ ДОБАВЛЕН ТАЙМАУТ
            
            await ctx.editMessageText(`Введите крипто-адрес для вывода ${amount.toFixed(8)} USDT:`);
        } catch (error) {
            logger.error('BOT', `Error in withdraw callback`, { error: error.message });
            await ctx.answerCbQuery('❌ Ошибка');
        }
    });

    bot.action('withdraw_custom', async (ctx) => {
        const user = await prisma.user.findUnique({ 
          where: { telegramId: ctx.from.id.toString() } 
        });
        
        if (!user) {
            return await ctx.answerCbQuery('Пользователь не найден.');
        }

        const balance = await getUserBalance(user.id);
        waitingForWithdrawAmount.set(user.id, true);
        setStateTimeout(waitingForWithdrawAmount, user.id); // ✅ ДОБАВЛЕН ТАЙМАУТ
        
        await ctx.editMessageText(
            `Введите сумму вывода (минимум 1 USDT, максимум ${balance.toFixed(8)} USDT):`
        );
    });

    bot.action(/pending_withdraws_(\d+)/, async (ctx) => {
        const page = parseInt(ctx.match[1]);
        const take = 50;
        const skip = page * take;

        const totalPending = await prisma.transaction.count({
            where: { type: 'WITHDRAW', status: 'PENDING' }
        });

        const withdrawals = await prisma.transaction.findMany({
            where: { type: 'WITHDRAW', status: 'PENDING' },
            include: {
                user: { select: { id: true, username: true, telegramId: true } }
            },
            orderBy: { createdAt: 'asc' },
            skip,
            take
        });

        if (withdrawals.length === 0) {
            await ctx.editMessageText('Нет заявок на вывод в обработке.');
            return;
        }

        let msg = `📤 *Заявки на вывод (в обработке)*\nСтраница ${page + 1}\nВсего: ${totalPending}\n\n`;
        for (const w of withdrawals) {
            const name = w.user.username ? `@${w.user.username}` : `User #${w.user.id}`;
            const wAmount = parseFloat(w.amount.toString());
            msg += `ID: #${w.id}\n` +
                   `Сумма: ${wAmount.toFixed(8)} USDT\n` +
                   `Адрес: \`${w.walletAddress}\`\n` +
                   `Пользователь: ${name}\n\n`;
        }

        const buttons = [];
        if (page > 0) {
            buttons.push({ text: '⬅️ Назад', callback_data: `pending_withdraws_${page - 1}` });
        }
        if ((page + 1) * take < totalPending) {
            buttons.push({ text: 'Вперёд ➡️', callback_data: `pending_withdraws_${page + 1}` });
        }

        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons.length ? [buttons] : [] }
        });
    });

    bot.action('my_referrals', async (ctx) => {
        const user = await prisma.user.findUnique({ where: { telegramId: ctx.from.id.toString() } });
        if (!user) return;
        const referrals = await prisma.user.findMany({
            where: { referredById: user.id },
            select: { id: true, username: true, firstName: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        if (referrals.length === 0) {
            await ctx.reply('У вас пока нет рефералов.');
            return await ctx.answerCbQuery();
        }
        let msg = '👥 *Ваши рефералы:*\n\n';
        referrals.forEach((r, i) => {
            const name = r.username ? `@${r.username}` : r.firstName || `User #${r.id}`;
            msg += `${i + 1}. ${name}\n`;
        });
        await ctx.reply(msg, { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
    });

    bot.action('claim_commission', async (ctx) => {
        const user = await prisma.user.findUnique({ where: { telegramId: ctx.from.id.toString() } });
        if (!user) return;
        await ctx.answerCbQuery('Обрабатываю...');

        const stats = await prisma.referralStats.findMany({
            where: { referrerId: user.id, turnoverSinceLastPayout: { gt: 0 } }
        });

        if (stats.length === 0) {
            await ctx.reply('⚠️ Нет накопленной комиссии.');
            return;
        }

        let totalPaid = 0;
        for (const stat of stats) {
            try {
                const result = await referralService.payoutReferrerCommission(stat.referrerId, stat.refereeId, stat.tokenId);
                if (result) {
                    totalPaid += parseFloat(result.commission.toString());
                }
            } catch (e) {
                logger.error('BOT', `Error in claim commission`, { error: e.message });
            }
        }

        if (totalPaid > 0) {
            await ctx.reply(`✅ Выплачено ${totalPaid.toFixed(8)} USDT`);
        } else {
            await ctx.reply('⚠️ Минимальная сумма не достигнута.');
        }
    });

    // ====================================
    // WEBHOOK HANDLER
    // ====================================
    const handleCryptoPayWebhook = async (req, res) => {
        try {
            const updates = req.body.updates || [req.body];
            
            for (const update of updates) {
                const invoice = update.payload || update;
                const invoiceId = String(invoice.invoice_id);
                const status = String(invoice.status);
                const userIdStr = String(invoice.payload);
                const amount = parseFloat(invoice.amount);
                const asset = String(invoice.asset);

                // ✅ ВАЛИДАЦИЯ
                const userIdNum = parseInt(userIdStr);
                const invoiceIdNum = parseInt(invoiceId);
                const amountNum = parseFloat(amount);
                
                if (isNaN(userIdNum) || isNaN(invoiceIdNum) || isNaN(amountNum) || amountNum <= 0) {
                    logger.warn('BOT', `Invalid webhook parameters`, { invoice });
                    continue;
                }

                logger.info('BOT', `Webhook received`, { invoiceId: invoiceIdNum, status, userId: userIdNum, amount: amountNum.toFixed(8) });

                // Только для PAID
                if (status !== 'paid') {
                    logger.debug('BOT', `Invoice not paid yet`, { invoiceId: invoiceIdNum, status });
                    continue;
                }

                // Проверяем дубликат
                const existingTx = await prisma.transaction.findFirst({
                    where: {
                        txHash: invoiceIdNum.toString(),
                        type: 'DEPOSIT',
                        status: 'COMPLETED'
                    }
                });

                if (existingTx) {
                    logger.warn('BOT', `Duplicate invoice`, { invoiceId: invoiceIdNum });
                    res.status(200).send('OK');
                    continue;
                }

                // Получаем токен
                const token = await prisma.cryptoToken.findUnique({
                    where: { symbol: asset }
                });

                if (!token) {
                    logger.warn('BOT', `Token not found`, { asset });
                    res.status(200).send('OK');
                    continue;
                }

                // ✅ ИСПРАВЛЕНИЕ: toFixed(8) и TRANSACTION
                await prisma.$transaction(async (tx) => {
                    await tx.transaction.create({
                        data: {
                            userId: userIdNum,
                            tokenId: token.id,
                            type: 'DEPOSIT',
                            status: 'COMPLETED',
                            amount: amountNum.toFixed(8).toString(),
                            txHash: invoiceIdNum.toString()
                        }
                    });

                    await tx.balance.upsert({
                        where: {
                            userId_tokenId_type: {
                                userId: userIdNum,
                                tokenId: token.id,
                                type: 'MAIN'
                            }
                        },
                        create: {
                            userId: userIdNum,
                            tokenId: token.id,
                            type: 'MAIN',
                            amount: amountNum.toFixed(8).toString()
                        },
                        update: {
                            amount: { increment: amountNum }
                        }
                    });
                });

                logger.info('BOT', `Deposit processed`, { userId: userIdNum, amount: amountNum.toFixed(8) });

                // Пытаемся выдать бонус
                if (asset === 'USDT') {
                    try {
                        await referralService.grantDepositBonus(userIdNum, amountNum, token.id);
                    } catch (e) {
                        logger.warn('BOT', `Bonus grant failed`, { error: e.message });
                    }
                }

                // Уведомляем пользователя
                try {
                    const userNotif = await prisma.user.findUnique({
                        where: { id: userIdNum },
                        select: { telegramId: true }
                    });

                    if (userNotif?.telegramId) {
                        await bot.telegram.sendMessage(
                            userNotif.telegramId,
                            `🎉 *Пополнение успешно!*\n\n✅ ${amountNum.toFixed(8)} ${asset} зачислено на ваш счёт`,
                            { parse_mode: 'Markdown' }
                        );
                    }
                } catch (e) {
                    logger.warn('BOT', `Failed to send deposit notification`, { error: e.message });
                }
            }

            res.status(200).send('OK');

        } catch (error) {
            logger.error('BOT', `Webhook error`, { error: error.message });
            res.status(200).send('OK');
        }
    };

    module.exports = {
        start: () => {
            bot.launch();
            logger.info('BOT', 'Telegram Bot started successfully');
        },
        botInstance: bot,
        cryptoPayAPI,
        handleCryptoPayWebhook
    };
}