const { Telegraf } = require('telegraf');
const axios = require('axios');
const prisma = require('../../prismaClient');
const { registerNewUser, generateOneTimeToken } = require('../services/authService');
const referralService = require('../services/ReferralService');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL;
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;
const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';

const WELCOME_IMAGE_PATH = path.join(__dirname, '../../assets/photo_2025-12-04_19-25-39.jpg');
// ====================================
// Автоматическая проверка инвойса через 3 минуты
// ====================================
async function scheduleDepositCheck(bot, userId, invoiceId, amount, asset = 'USDT') {
    await prisma.pendingDeposit.upsert({
        where: { invoiceId: invoiceId.toString() },
        create: {
            userId,
            invoiceId: invoiceId.toString(),
            amount,
            asset,
            status: 'pending'
        },
        update: { status: 'pending', updatedAt: new Date() }
    });

    setTimeout(async () => {
        try {
            const response = await axios.get(`${CRYPTO_PAY_API}/getInvoices`, {
                headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN },
                params: { invoiceIds: invoiceId }
            });

            if (!response.data?.ok || !response.data.result?.items?.length) return;
            const invoice = response.data.result.items[0]; // ← items
            if (invoice.status !== 'paid') {
                await prisma.pendingDeposit.update({
                    where: { invoiceId: invoiceId.toString() },
                    data: { status: invoice.status }
                });
                return;
            }

            const existingTx = await prisma.transaction.findFirst({
                where: { txHash: invoiceId.toString(), type: 'DEPOSIT' }
            });
            if (existingTx) return;

            const token = await prisma.cryptoToken.findUnique({ where: { symbol: asset } });
            if (!token) return;

            // Зачисление
            await prisma.transaction.create({
                data: {
                    userId,
                    tokenId: token.id,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    amount: amount.toString(),
                    txHash: invoiceId.toString()
                }
            });

            await prisma.balance.upsert({
                where: {
                    userId_tokenId_type: { userId, tokenId: token.id, type: 'MAIN' }
                },
                create: { userId, tokenId: token.id, type: 'MAIN', amount: amount.toString() },
                update: { amount: { increment: amount } }
            });

            // Бонус
            if (asset === 'USDT') {
                try {
                    await referralService.grantDepositBonus(userId, amount, token.id);
                } catch (e) {}
            }

            await prisma.pendingDeposit.update({
                where: { invoiceId: invoiceId.toString() },
                data: { status: 'processed' }
            });

            // Уведомление
            try {
                const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
                if (user?.telegramId) {
                    await bot.telegram.sendMessage(
                        user.telegramId,
                        `✅ *Пополнение на ${amount} ${asset} зачислено!*`,
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (e) {}
        } catch (error) {
            console.error(`[TIMER] Ошибка при проверке инвойса ${invoiceId}:`, error.message);
        }
    }, 3 * 60 * 1000);
}
if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set. Bot cannot run.');
    module.exports = { start: () => {} };
} else {
    const bot = new Telegraf(BOT_TOKEN);

    // ====================================
    // МЕНЮ КНОПОК
    // ====================================
    const getMainMenuKeyboard = () => ({
        reply_markup: {
            keyboard: [
                [{ text: '🎰 Казино' }],
                [{ text: '💰 Пополнить' }, { text: '💸 Вывести' }],
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

    // ====================================
    // CRYPTO PAY API
    // ====================================
    const cryptoPayAPI = {
        async createInvoice(amount, asset, description, userId) {
            try {
                const response = await axios.post(
                    `${CRYPTO_PAY_API}/createInvoice`,
                    {
                        asset,
                        amount: amount.toString(),
                        description,
                        payload: userId.toString(),
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
                    console.log(`✅ Invoice created: ${response.data.result.invoice_id}`);
                    return response.data.result;
                }
                return null;
            } catch (error) {
                console.error('❌ Crypto Pay API error:', error.response?.data || error.message);
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
                console.error('❌ Get Invoices error:', error.message);
                return null;
            }
        }
    };

    // ====================================
    // БАЛАНС
    // ====================================
    async function getUserBalance(userId, tokenSymbol = 'USDT') {
        try {
            const balance = await prisma.balance.findFirst({
                where: { userId, token: { symbol: tokenSymbol }, type: 'MAIN' }
            });
            return balance ? parseFloat(balance.amount.toString()) : 0;
        } catch (error) {
            return 0;
        }
    }

    async function getBonusBalance(userId, tokenSymbol = 'USDT') {
        try {
            const balance = await prisma.balance.findFirst({
                where: { userId, token: { symbol: tokenSymbol }, type: 'BONUS' }
            });
            return balance ? parseFloat(balance.amount.toString()) : 0;
        } catch (error) {
            return 0;
        }
    }

    // Хранилище ожидания суммы
    const waitingForDeposit = new Map();

    // ====================================
    // КОМАНДА /start С РЕФЕРАЛЬНОЙ ССЫЛКОЙ
    // ====================================
    bot.start(async (ctx) => {
        const telegramId = ctx.from.id.toString();

        try {
            let user = await prisma.user.findUnique({ where: { telegramId } });

            if (user && user.isBlocked) {
                await ctx.reply('🚫 Ваш аккаунт заблокирован.');
                return;
            }

            let isNewUser = false;
            let rawPassword = null;
            let referralApplied = false;

            // Извлекаем реферальный код из deep link: /start ref_ABC123
            const startPayload = ctx.startPayload;
            let referralCode = null;
            
            if (startPayload && startPayload.startsWith('ref_')) {
                referralCode = startPayload.replace('ref_', '');
                console.log(`🔗 [BOT] Referral code detected: ${referralCode}`);
            }

            if (!user) {
                const { user: newUser, rawPassword: pwd } = await registerNewUser(ctx.from);
                user = newUser;
                rawPassword = pwd;
                isNewUser = true;

                // Привязываем реферера
                if (referralCode) {
                    const referrer = await prisma.user.findUnique({
                        where: { referralCode },
                        select: { id: true, username: true }
                    });

                    if (referrer && referrer.id !== user.id) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { referredById: referrer.id }
                        });
                        referralApplied = true;
                        console.log(`✅ [BOT] User ${user.id} linked to referrer ${referrer.id}`);
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
                await ctx.reply(fullMessage, { parse_mode: 'Markdown' });
            }

            const menu = user.isAdmin ? getAdminMenuKeyboard() : getMainMenuKeyboard();
            await ctx.reply('📋 *Выберите действие:*', menu);
        } catch (error) {
            console.error("❌ Error in /start:", error);
            await ctx.reply("Произошла ошибка. Попробуйте позже.");
        }
    });

    // ====================================
    // ОСНОВНОЙ ОБРАБОТЧИК СООБЩЕНИЙ
    // ====================================
    bot.on('message', async (ctx) => {
        if (!ctx.message?.text) return;

        const text = ctx.message.text.trim();
        if (!text) return;

        try {
            const user = await prisma.user.findUnique({ where: { telegramId: ctx.from.id.toString() } });

            if (!user) {
                await ctx.reply('Пожалуйста, нажмите /start для регистрации');
                return;
            }

            if (user.isBlocked) {
                await ctx.reply('🚫 Ваш аккаунт заблокирован.');
                return;
            }

            // Обработка кастомной суммы пополнения
            if (waitingForDeposit.has(user.id)) {
                const amount = Number(text);
                if (isNaN(amount) || amount <= 0) {
                    await ctx.reply("❌ Введите корректную сумму. Пример: 10.5");
                    return;
                }

                waitingForDeposit.delete(user.id);

                const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);

                if (!invoice) {
                    await ctx.reply("❌ Ошибка при создании инвойса.");
                    return;
                }
                scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT');
                await ctx.reply(
                    `✅ *Инвойс создан*\n\nСумма: ${amount} USDT\nID: ${invoice.invoice_id}`,
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
                return;
            }

            // Обработка кнопок меню
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
                    await ctx.reply(
                        `💰 *Пополнение счета*\n\nВыберите сумму:`,
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
                    const bonusBalance = await getBonusBalance(user.id);
                    
                    let withdrawMsg = `💸 *Вывод средств*\n\n💰 Основной: ${balance.toFixed(2)} USDT\n`;
                    
                    if (bonusBalance > 0) {
                        const wagerProgress = await referralService.getWagerProgress(user.id);
                        withdrawMsg += `🎁 Бонусный: ${bonusBalance.toFixed(2)} USDT\n`;
                        if (wagerProgress) {
                            withdrawMsg += `📊 Отыгрыш: ${wagerProgress.progress}%\n`;
                        }
                        withdrawMsg += `\n⚠️ _Бонус недоступен для вывода до отыгрыша_`;
                    }
                    
                    withdrawMsg += `\n\nДля вывода: \`/withdraw <сумма> <адрес>\``;
                    await ctx.reply(withdrawMsg, { parse_mode: 'Markdown' });
                    break;

                case '👥 Рефералы':
                    const stats = await referralService.getReferrerStats(user.id);
                    const userInfo = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: { referralCode: true, referrerType: true }
                    });
                    
                    const referralLink = `https://t.me/${ctx.botInfo.username}?start=ref_${userInfo.referralCode}`;
                    const typeEmoji = userInfo.referrerType === 'WORKER' ? '👷' : '👤';
                    
                    let refMsg = `${typeEmoji} *Реферальная программа*\n\n` +
                        `🔗 Ваша ссылка:\n\`${referralLink}\`\n\n` +
                        `📊 *Статистика:*\n` +
                        `👥 Рефералов: ${stats.referralsCount}\n` +
                        `💰 Оборот: ${stats.totalTurnover.toFixed(2)} USDT\n` +
                        `✅ Выплачено: ${stats.totalCommissionPaid.toFixed(4)} USDT\n` +
                        `⏳ Накоплено: ${stats.potentialCommission} USDT\n\n` +
                        `💎 Ваша комиссия: *${stats.commissionRate}%*\n\n` +
                        `ℹ️ *Как работает:*\n` +
                        `• Друг получает +100% к депозиту\n` +
                        `• Вы получаете ${stats.commissionRate}% от прибыли казино`;
                    
                    await ctx.reply(refMsg, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📋 Мои рефералы', callback_data: 'my_referrals' }],
                                [{ text: '💰 Получить комиссию', callback_data: 'claim_commission' }]
                            ]
                        },
                        parse_mode: 'Markdown'
                    });
                    break;

                case '⚙️ Настройки':
                    const userBal = await getUserBalance(user.id);
                    const userBonus = await getBonusBalance(user.id);
                    const badges = [];
                    if (user.isAdmin) badges.push('👑 АДМИН');
                    if (user.referrerType === 'WORKER') badges.push('👷 ВОРКЕР');
                    
                    await ctx.reply(
                        `⚙️ *Настройки*\n\n` +
                        `👤 ${user.username ? '@' + user.username : 'ID: ' + user.id}\n` +
                        `💰 Основной: ${userBal.toFixed(2)} USDT\n` +
                        `🎁 Бонусный: ${userBonus.toFixed(2)} USDT` +
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
                        `/block_user <id> - Заблокировать\n` +
                        `/unblock_user <id> - Разблокировать`,
                        { parse_mode: 'Markdown' }
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
            console.error('Error handling message:', error);
            await ctx.reply('❌ Ошибка. Попробуйте еще раз.');
        }
    });

// ====================================
// АДМИН-КОМАНДЫ
// ====================================

bot.command('withdraw', async (ctx) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: ctx.from.id.toString() }
    });
    if (!user) {
      await ctx.reply('Сначала зарегистрируйтесь через /start');
      return;
    }

    const args = ctx.message.text.split(' ').filter(arg => arg.trim() !== '');
    const amount = parseFloat(args[1]);
    const walletAddress = args[2];

    if (!amount || !walletAddress) {
      await ctx.reply('Использование: /withdraw <сумма> <адрес>\nПример: /withdraw 10 TGx5a...cB2');
      return;
    }

    if (amount < 1) {
      await ctx.reply('Минимальная сумма вывода: 1 USDT');
      return;
    }

    // Проверяем баланс
    const balance = await getUserBalance(user.id);
    if (balance < amount) {
      await ctx.reply(`❌ Недостаточно средств. Баланс: ${balance.toFixed(2)} USDT`);
      return;
    }

    // Получаем ID токена USDT (лучше не хардкодить)
    const usdtToken = await prisma.cryptoToken.findFirst({ where: { symbol: 'USDT' } });
    if (!usdtToken) {
      await ctx.reply('❌ Валюта USDT не настроена.');
      return;
    }

    // Создаём заявку на вывод
    const withdrawal = await prisma.transaction.create({
      data: {
        userId: user.id,
        tokenId: usdtToken.id,
        type: 'WITHDRAW',
        status: 'PENDING',
        amount: amount.toString(),
        walletAddress: walletAddress,
        txHash: null
      }
    });

    // Списываем средства
    await prisma.balance.update({
      where: {
        userId_tokenId_type: { userId: user.id, tokenId: usdtToken.id, type: 'MAIN' }
      },
      data: { amount: { decrement: amount } }
    });

    await ctx.reply(
      `✅ Заявка на вывод создана!\n\nСумма: ${amount} USDT\nАдрес: \`${walletAddress}\`\n\nОжидайте обработки администратором.`,
      { parse_mode: 'Markdown' }
    );

    // Уведомление админу
    const admins = await prisma.user.findMany({ where: { isAdmin: true } });
    for (const admin of admins) {
      if (admin.telegramId) {
        await bot.telegram.sendMessage(
          admin.telegramId,
          `💸 НОВАЯ ЗАЯВКА НА ВЫВОД\nПользователь: ${user.id}\nСумма: ${amount} USDT\nАдрес: ${walletAddress}\n\nКоманда: /approve_withdraw ${withdrawal.id}`
        );
      }
    }

  } catch (error) {
    console.error('Withdraw error:', error);
    await ctx.reply('❌ Ошибка при создании заявки. Обратитесь в поддержку.');
  }
});

bot.command('approve_withdraw', async (ctx) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { telegramId: ctx.from.id.toString() }
    });
    if (!admin?.isAdmin) {
      await ctx.reply('Только для админов');
      return;
    }

    const withdrawalId = parseInt(ctx.message.text.split(' ')[1]);
    if (!withdrawalId) {
      await ctx.reply('Использование: /approve_withdraw <id>');
      return;
    }

    const withdrawal = await prisma.transaction.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal || withdrawal.status !== 'PENDING') {
      await ctx.reply('Заявка не найдена или уже обработана');
      return;
    }

    // ⚠️ Здесь вы должны вручную отправить USDT с вашего кошелька
    // ИЛИ вызвать ваш внешний сервис вывода
    // Пример: const txHash = await myWallet.send(withdrawal.walletAddress, withdrawal.amount);

    // После отправки — обновите статус (здесь временный фейковый хеш)
    const fakeTxHash = 'TX_' + Date.now(); // ЗАМЕНИТЕ на реальный хеш транзакции

    await prisma.transaction.update({
      where: { id: withdrawalId },
      data: { status: 'COMPLETED', txHash: fakeTxHash } // ← ОБЯЗАТЕЛЬНО "data:"
    });

    // Уведомить пользователя
    const user = await prisma.user.findUnique({
      where: { id: withdrawal.userId },
      select: { telegramId: true }
    });
    if (user?.telegramId) {
      await bot.telegram.sendMessage(
        user.telegramId,
        `✅ Вывод успешно обработан!\nСумма: ${withdrawal.amount} USDT\nАдрес: ${withdrawal.walletAddress}\nTX: \`${fakeTxHash}\``,
        { parse_mode: 'Markdown' }
      );
    }

    await ctx.reply('✅ Вывод подтверждён!');

  } catch (error) {
    console.error('Approve withdraw error:', error);
    await ctx.reply('❌ Ошибка подтверждения');
  }
});
    bot.command('set_worker', async (ctx) => {
        try {
            const admin = await prisma.user.findUnique({ where: { telegramId: ctx.from.id.toString() } });
            if (!admin?.isAdmin) {
                await ctx.reply('🚫 Только для администраторов.');
                return;
            }

            const userId = parseInt(ctx.message.text.split(' ')[1]);
            if (!userId) {
                await ctx.reply('Использование: /set_worker <user_id>');
                return;
            }

            await referralService.setUserAsWorker(userId);
            await ctx.reply(`✅ Пользователь ${userId} теперь ВОРКЕР (40% комиссия)`);
        } catch (error) {
            await ctx.reply('❌ Ошибка');
        }
    });

    bot.command('remove_worker', async (ctx) => {
        try {
            const admin = await prisma.user.findUnique({ where: { telegramId: ctx.from.id.toString() } });
            if (!admin?.isAdmin) {
                await ctx.reply('🚫 Только для администраторов.');
                return;
            }

            const userId = parseInt(ctx.message.text.split(' ')[1]);
            if (!userId) {
                await ctx.reply('Использование: /remove_worker <user_id>');
                return;
            }

            await prisma.user.update({ where: { id: userId }, data: { referrerType: 'REGULAR' } });
            await ctx.reply(`✅ Пользователь ${userId} теперь обычный (30% комиссия)`);
        } catch (error) {
            await ctx.reply('❌ Ошибка');
        }
    });

    bot.command('payout_all', async (ctx) => {
        try {
            const admin = await prisma.user.findUnique({ where: { telegramId: ctx.from.id.toString() } });
            if (!admin?.isAdmin) {
                await ctx.reply('🚫 Только для администраторов.');
                return;
            }

            await ctx.reply('⏳ Выплачиваю комиссии...');
            const result = await referralService.processAllPendingCommissions();
            
            await ctx.reply(
                `✅ *Выплата завершена*\n\n` +
                `📊 Обработано: ${result.processed}\n` +
                `✅ Успешно: ${result.success}\n` +
                `💰 Выплачено: ${result.totalPaid.toFixed(4)} USDT`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            await ctx.reply('❌ Ошибка');
        }
    });

    // ====================================
    // CALLBACK HANDLERS
    // ====================================
    bot.action('deposit_custom', async (ctx) => {
        const user = await prisma.user.findUnique({ where: { telegramId: ctx.from.id.toString() } });
        if (!user) return;
        waitingForDeposit.set(user.id, true);
        await ctx.reply("Введите сумму в USDT (пример: 15.25)");
        await ctx.answerCbQuery();
    });

    bot.action(/deposit_(\d+)/, async (ctx) => {
        const amount = parseInt(ctx.match[1]);
        const user = await prisma.user.findUnique({ where: { telegramId: ctx.from.id.toString() } });
        if (!user) return;

        const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);
        if (!invoice) {
            await ctx.reply("❌ Ошибка создания инвойса.");
            return await ctx.answerCbQuery();
        }
        scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT');
        await ctx.reply(
            `✅ *Инвойс создан*\n\nСумма: ${amount} USDT`,
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
        await ctx.answerCbQuery();
    });

    bot.action(/check_invoice_(\d+)/, async (ctx) => {
        try {
            const invoiceIdStr = ctx.match[1];
            const invoiceId = parseInt(invoiceIdStr, 10);

            if (isNaN(invoiceId)) {
                console.warn(`[CHECK] Invalid invoice ID: ${invoiceIdStr}`);
                await ctx.answerCbQuery('❌ Некорректный ID инвойса');
                return;
            }

            await ctx.answerCbQuery('🔍 Проверяем статус...');

            console.log(`[CHECK] Fetching status for invoice ${invoiceId}`);
            const result = await cryptoPayAPI.getInvoices([invoiceId]);

            if (!result) {
                console.error(`[CHECK] Failed to fetch invoice ${invoiceId}`);
                await ctx.reply('❌ Не удалось получить статус. Попробуйте позже.');
                return;
            }

            if (!result?.items?.length) {
                console.warn(`[CHECK] Invoice ${invoiceId} not found in API response`);
                await ctx.reply('ℹ️ Инвойс не найден.');
                return;
            }
            const invoice = result.items[0]; // ← items, не invoices!
            console.log(`[CHECK] Invoice ${invoiceId} status: ${invoice.status}`);

            if (invoice.status === 'paid') {
                try {
                    await ctx.editMessageText(`✅ *Оплачено!* Средства зачислены.`, { parse_mode: 'Markdown' });
                } catch (e) {
                    if (e.description?.includes('message is not modified')) {
                        // Игнорируем, если сообщение уже обновлено
                        console.log('[CHECK] Message already updated (likely by webhook)');
                    } else {
                        console.error('[CHECK] Edit message error:', e.message);
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
                // expired, canceled, etc.
                await ctx.editMessageText(`❌ Инвойс ${invoice.status}`, { parse_mode: 'Markdown' });
            }
        } catch (error) {
            console.error('[CHECK] Unexpected error:', error);
            await ctx.answerCbQuery('⚠️ Ошибка при проверке');
            await ctx.reply('⚠️ Произошла ошибка. Обратитесь в поддержку.');
        }
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
                if (result) totalPaid += result.commission;
            } catch (e) {}
        }

        if (totalPaid > 0) {
            await ctx.reply(`✅ Выплачено ${totalPaid.toFixed(4)} USDT`);
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
                const status = invoice.status;
                const userId = Number(invoice.payload);
                const amount = Number(invoice.amount);
                const asset = invoice.asset;

                if (isNaN(userId) || userId <= 0) continue;

                if (status === 'paid') {
                    // Проверяем дубликат
                    const existing = await prisma.transaction.findFirst({
                        where: { txHash: invoiceId, type: 'DEPOSIT', status: 'COMPLETED' }
                    });
                    if (existing) continue;

                    const token = await prisma.cryptoToken.findUnique({ where: { symbol: asset } });
                    if (!token) continue;

                    // Создаём транзакцию и зачисляем
                    await prisma.transaction.create({
                        data: {
                            userId,
                            tokenId: token.id,
                            type: 'DEPOSIT',
                            status: 'COMPLETED',
                            amount: amount.toString(),
                            txHash: invoiceId
                        }
                    });

                    await prisma.balance.upsert({
                        where: { userId_tokenId_type: { userId, tokenId: token.id, type: 'MAIN' } },
                        create: { userId, tokenId: token.id, type: 'MAIN', amount: amount.toString() },
                        update: { amount: { increment: amount } }
                    });

                    console.log(`✅ [WEBHOOK] Deposit ${amount} ${asset} to user ${userId}`);

                    // 🎁 РЕФЕРАЛЬНЫЙ БОНУС
                    if (asset === 'USDT') {
                        try {
                            const bonusResult = await referralService.grantDepositBonus(userId, amount, token.id);
                            
                            if (bonusResult) {
                                const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
                                if (user?.telegramId) {
                                    await bot.telegram.sendMessage(
                                        user.telegramId,
                                        `🎉 *Бонус активирован!*\n\n` +
                                        `+${bonusResult.bonusAmount} USDT на бонусный баланс\n` +
                                        `📊 Отыграйте ${bonusResult.requiredWager} USDT для вывода\n` +
                                        `⏳ Действует 7 дней`,
                                        { parse_mode: 'Markdown' }
                                    );
                                }
                            }
                        } catch (e) {
                            console.error('Bonus error:', e.message);
                        }
                    }

                    // Уведомление о депозите
                    try {
                        const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
                        if (user?.telegramId) {
                            await bot.telegram.sendMessage(
                                user.telegramId,
                                `🎉 *Пополнение успешно!*\n\n${amount} ${asset} зачислено! 🚀`,
                                { parse_mode: 'Markdown' }
                            );
                        }
                    } catch (e) {}
                }
            }

            res.status(200).send('OK');
        } catch (error) {
            console.error('❌ Webhook error:', error);
            res.status(500).send('Error');
        }
    };

    // ====================================
    // EXPORT
    // ====================================
    module.exports = {
        start: () => {
            bot.launch();
            console.log('🤖 Telegram Bot started with Referral System.');
        },
        botInstance: bot,
        cryptoPayAPI,
        handleCryptoPayWebhook
    };
}