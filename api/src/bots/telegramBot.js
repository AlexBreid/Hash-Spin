const { Telegraf } = require('telegraf');
const axios = require('axios');
const prisma = require('../../prismaClient');
const { registerNewUser, generateOneTimeToken } = require('../services/authService');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL;
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;
const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';

// Убедитесь, что этот путь правильный
const WELCOME_IMAGE_PATH = path.join(__dirname, '../../assets/photo_2025-12-02_22-50-50.jpg');

if (!BOT_TOKEN) {  
    console.error('❌ TELEGRAM_BOT_TOKEN is not set. Bot cannot run.');  
    module.exports = { start: () => {} };
} else {  
    const bot = new Telegraf(BOT_TOKEN);

    // ====================================
    // МЕНЮ КНОПОК
    // ====================================

    // Главное меню для обычных пользователей
    const getMainMenuKeyboard = () => ({
        reply_markup: {
            keyboard: [
                [{ text: '🎰 Казино', callback_data: 'open_casino' }],
                [{ text: '💰 Пополнить', callback_data: 'deposit' }, { text: '💸 Вывести', callback_data: 'withdraw' }],
                [{ text: '💎 VIP Статус', callback_data: 'vip_status' }, { text: '⚙️ Настройки', callback_data: 'settings' }],
                [{ text: '❓ Помощь', callback_data: 'help' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });

    // Админское меню
    const getAdminMenuKeyboard = () => ({
        reply_markup: {
            keyboard: [
                [{ text: '🎰 Казино', callback_data: 'open_casino' }],
                [{ text: '💰 Пополнить', callback_data: 'deposit' }, { text: '💸 Вывести', callback_data: 'withdraw' }],
                [{ text: '📊 АДМИН ПАНЕЛЬ', callback_data: 'admin_panel' }, { text: '⚙️ Настройки', callback_data: 'settings' }],
                [{ text: '👥 Управление', callback_data: 'admin_users' }, { text: '💳 Платежи', callback_data: 'admin_payments' }],
                [{ text: '❓ Помощь', callback_data: 'help' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });

    // Inline кнопка для открытия казино
    const getOpenCasinoButton = (authUrl) => ({
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 Открыть Казино', web_app: { url: authUrl } }]
            ]
        }
    });

    // ====================================
    // ПРОВЕРКА АДМИН-СТАТУСА
    // ====================================
    async function isAdmin(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            return user?.isAdmin || false;
        } catch (error) {
            console.error('❌ Error checking admin status:', error);
            return false;
        }
    }

    async function isBlocked(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            return user?.isBlocked || false;
        } catch (error) {
            console.error('❌ Error checking blocked status:', error);
            return false;
        }
    }

    // ====================================
    // CRYPTO PAY API
    // ====================================
    const cryptoPayAPI = {
        async createInvoice(amount, asset, description, userId) {
            try {
                const response = await axios.post(
                    `${CRYPTO_PAY_API}/createInvoice`,
                    {
                        asset: asset,
                        amount: amount.toString(),
                        description: description,
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
                } else {
                    console.error('❌ Invoice creation failed:', response.data.error);
                    return null;
                }
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
                        headers: {
                            'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN
                        },
                        params: {
                            invoice_ids: invoiceIds.join(',')
                        }
                    }
                );
                return response.data.ok ? response.data.result : null;
            } catch (error) {
                console.error('❌ Get Invoices error:', error.message);
                return null;
            }
        },

        async transfer(userId, amount, spendingId, asset) {
            try {
                const response = await axios.post(
                    `${CRYPTO_PAY_API}/transfer`,
                    {
                        user_id: userId,
                        asset: asset,
                        amount: amount.toString(),
                        spend_id: spendingId
                    },
                    {
                        headers: {
                            'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.data.ok) {
                    console.log(`✅ Transfer successful: ${response.data.result.transfer_id}`);
                    return response.data.result;
                } else {
                    console.error('❌ Transfer failed:', response.data);
                    return null;
                }
            } catch (error) {
                console.error('❌ Transfer error:', error.message);
                return null;
            }
        }
    };

    // ====================================
    // ПОЛУЧЕНИЕ БАЛАНСА ИЗ БД
    // ====================================
    async function getUserBalance(userId, tokenSymbol = 'USDT') {
        try {
            const balance = await prisma.balance.findFirst({
                where: {
                    userId: userId,
                    token: {
                        symbol: tokenSymbol
                    }
                },
                include: {
                    token: true
                }
            });

            return balance ? balance.amount : 0;
        } catch (error) {
            console.error('❌ Error getting balance:', error);
            return 0;
        }
    }

    // ====================================
    // ОБНОВЛЕНИЕ БАЛАНСА
    // ====================================
    async function updateBalance(userId, tokenSymbol, amount, type = 'MAIN') {
        try {
            const token = await prisma.cryptoToken.findUnique({
                where: { symbol: tokenSymbol }
            });

            if (!token) {
                console.error(`❌ Token not found: ${tokenSymbol}`);
                return false;
            }

            const balance = await prisma.balance.findFirst({
                where: {
                    userId,
                    tokenId: token.id,
                    type
                }
            });

            if (balance) {
                await prisma.balance.update({
                    where: { id: balance.id },
                    data: {
                        amount: balance.amount + amount
                    }
                });
            } else {
                await prisma.balance.create({
                    data: {
                        userId,
                        tokenId: token.id,
                        type,
                        amount: amount
                    }
                });
            }

            return true;
        } catch (error) {
            console.error('❌ Error updating balance:', error);
            return false;
        }
    }

    // ====================================
    // КОМАНДА /start
    // ====================================
bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username;

    try {
        let user = await prisma.user.findUnique({ where: { telegramId } });

        if (user && user.isBlocked) {
            await ctx.reply('🚫 Ваш аккаунт заблокирован. Обратитесь в поддержку.');
            return;
        }

        let isNewUser = false;
        let rawPassword = null; // ← объявляем здесь

        if (!user) {
            const { user: newUser, rawPassword: pwd } = await registerNewUser(ctx.from);
            user = newUser;
            rawPassword = pwd; // ← сохраняем
            isNewUser = true;
        }

        const commonSlogan = `🎰 *Добро пожаложовать в SafariX — Казино будущего!* 🌍

🚀 Здесь каждый спин — шаг к выигрышу!  
💎 Крипто-ставки без границ  
⚡ Мгновенные выплаты  
🎁 Ежедневные бонусы и турниры

🔥 *Играй. Выигрывай. Наслаждайся.*`;

        const credentialsBlock = isNewUser
            ? `\n\n✨ *Ваши данные для входа:*\n` +
              `🔑 Логин: \`${username ? `@${username}` : `ID: ${user.id}`}\`\n` +
              `🔐 Пароль: \`${rawPassword}\`\n\n` +
              `⚠️ *Сохраните пароль! Он показывается только один раз.*`
            : '';

        const fullMessage = commonSlogan + credentialsBlock;

        try {
            if (fs.existsSync(WELCOME_IMAGE_PATH)) {
                await ctx.replyWithPhoto(
                    { source: fs.createReadStream(WELCOME_IMAGE_PATH) },
                    { caption: fullMessage, parse_mode: 'Markdown' }
                );
            } else {
                throw new Error('Image not found');
            }
        } catch (imageError) {
            console.warn('⚠️ Could not send image:', imageError.message);
            await ctx.reply(fullMessage, { parse_mode: 'Markdown' });
        }

        const menu = user.isAdmin ? getAdminMenuKeyboard() : getMainMenuKeyboard();
        await ctx.reply('📋 *Выберите действие:*', menu);

    } catch (error) {
        console.error("❌ Error in /start command:", error);
        await ctx.reply("Произошла ошибка. Попробуйте позже.");
    }
});

    // ====================================
    // КОМАНДА /admin (Только для админов)
    // ====================================
    bot.command('admin', async (ctx) => {
        try {
            const user = await prisma.user.findUnique({
                where: { telegramId: ctx.from.id.toString() }
            });

            if (!user) {
                await ctx.reply('Пожалуйста, сначала нажмите /start');
                return;
            }

            if (!user.isAdmin) {
                await ctx.reply('🚫 У вас нет доступа к админ-панели. Вы не администратор.');
                return;
            }

            // Показываем админ-команды
            await ctx.reply(
                `👑 *АДМИН ПАНЕЛЬ*\n\n` +
                `Доступные команды:\n\n` +
                `/admin_stats - Статистика\n` +
                `/admin_blocks - Заблокированные пользователи\n` +
                `/block_user <id> - Заблокировать пользователя\n` + // Добавлено
                `/unblock_user <id> - Разблокировать пользователя\n` + // Добавлено
                `/admin_webhook - Логи веб-хуков\n` +
                `/admin_help - Справка`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Error in /admin command:', error);
            await ctx.reply('Ошибка при получении админ-панели.');
        }
    });

    // ====================================
    // КОМАНДА /admin_stats (Статистика)
    // ====================================
    bot.command('admin_stats', async (ctx) => {
        try {
            const user = await prisma.user.findUnique({
                where: { telegramId: ctx.from.id.toString() }
            });

            if (!user || !user.isAdmin) {
                await ctx.reply('🚫 Только для администраторов.');
                return;
            }

            const totalUsers = await prisma.user.count();
            const blockedUsers = await prisma.user.count({ where: { isBlocked: true } });
            const totalAdmins = await prisma.user.count({ where: { isAdmin: true } });

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

            await ctx.reply(
                `📊 *СТАТИСТИКА*\n\n` +
                `👥 Всего пользователей: ${totalUsers}\n` +
                `👑 Администраторов: ${totalAdmins}\n` +
                `🚫 Заблокирован: ${blockedUsers}\n\n` +
                `💰 Всего пополнений: $${totalDeposits._sum.amount || 0}\n` +
                `💸 Всего выводов: $${totalWithdrawals._sum.amount || 0}\n` +
                `⏳ Ожидают вывода: ${pendingWithdrawals}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Error in /admin_stats:', error);
            await ctx.reply('❌ Ошибка при получении статистики.');
        }
    });

    // ====================================
    // КОМАНДА /admin_blocks (Заблокированные юзеры)
    // ====================================
    bot.command('admin_blocks', async (ctx) => {
        try {
            const user = await prisma.user.findUnique({
                where: { telegramId: ctx.from.id.toString() }
            });

            if (!user || !user.isAdmin) {
                await ctx.reply('🚫 Только для администраторов.');
                return;
            }

            const blockedUsers = await prisma.user.findMany({
                where: { isBlocked: true },
                take: 20
            });

            if (blockedUsers.length === 0) {
                await ctx.reply('✅ Нет заблокированных пользователей.');
                return;
            }

            let message = '🚫 *ЗАБЛОКИРОВАННЫЕ ПОЛЬЗОВАТЕЛИ*\n\n';
            blockedUsers.forEach((u, i) => {
                message += `${i + 1}. ID: \`${u.id}\` | @${u.username || 'unknown'}\n`;
            });

            await ctx.reply(message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Error in /admin_blocks:', error);
            await ctx.reply('❌ Ошибка при получении списка.');
        }
    });

    // ====================================
    // КОМАНДА /block_user (Заблокировать юзера)
    // ====================================
    bot.command('block_user', async (ctx) => {
        try {
            const adminUser = await prisma.user.findUnique({
                where: { telegramId: ctx.from.id.toString() }
            });

            if (!adminUser || !adminUser.isAdmin) {
                await ctx.reply('🚫 Только для администраторов.');
                return;
            }

            const args = ctx.message.text.split(' ');
            const userId = parseInt(args[1]);

            if (!userId) {
                await ctx.reply('Использование: /block_user <user_id>');
                return;
            }

            await prisma.user.update({
                where: { id: userId },
                data: { isBlocked: true }
            });

            await ctx.reply(`✅ Пользователь \`${userId}\` заблокирован.`, { parse_mode: 'Markdown' });
            console.log(`👮 Admin ${adminUser.id} blocked user ${userId}`);
        } catch (error) {
            console.error('Error in /block_user:', error);
            await ctx.reply('❌ Ошибка при блокировке.');
        }
    });

    // ====================================
    // КОМАНДА /unblock_user (Разблокировать юзера)
    // ====================================
    bot.command('unblock_user', async (ctx) => {
        try {
            const adminUser = await prisma.user.findUnique({
                where: { telegramId: ctx.from.id.toString() }
            });

            if (!adminUser || !adminUser.isAdmin) {
                await ctx.reply('🚫 Только для администраторов.');
                return;
            }

            const args = ctx.message.text.split(' ');
            const userId = parseInt(args[1]);

            if (!userId) {
                await ctx.reply('Использование: /unblock_user <user_id>');
                return;
            }

            await prisma.user.update({
                where: { id: userId },
                data: { isBlocked: false }
            });

            await ctx.reply(`✅ Пользователь \`${userId}\` разблокирован.`, { parse_mode: 'Markdown' });
            console.log(`👮 Admin ${adminUser.id} unblocked user ${userId}`);
        } catch (error) {
            console.error('Error in /unblock_user:', error);
            await ctx.reply('❌ Ошибка при разблокировке.');
        }
    });

    // ====================================
    // ОБРАБОТКА СООБЩЕНИЙ (КНОПОК МЕНЮ)
    // ====================================
    bot.on('message', async (ctx) => {
        const text = ctx.message.text;

        try {
            const user = await prisma.user.findUnique({ 
                where: { telegramId: ctx.from.id.toString() } 
            });

            if (!user) {
                await ctx.reply('Пожалуйста, нажмите /start для регистрации');
                return;
            }

            // Проверка блокировки
            if (user.isBlocked) {
                await ctx.reply('🚫 Ваш аккаунт заблокирован.');
                return;
            }

            switch (text) {
                case '🎰 Казино':
                    const oneTimeToken = await generateOneTimeToken(user.id);
                    const authUrl = `${FRONTEND_URL}/login?token=${oneTimeToken}`;
                    const isHttps = FRONTEND_URL.startsWith('https://');

                    if (isHttps) {
                        await ctx.reply(
                            '🚀 *Открываем казино...*',
                            getOpenCasinoButton(authUrl)
                        );
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
                    const balance = await getUserBalance(user.id, 'USDT');
                    await ctx.reply(
                        `💸 *Вывод средств*\n\n💰 Ваш баланс: ${balance} USDT\n\nДля вывода введите команду: \`/withdraw <сумма> <адрес>\``,
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case '📊 АДМИН ПАНЕЛЬ':
                    if (!user.isAdmin) {
                        await ctx.reply('🚫 Только для администраторов.');
                        return;
                    }
                    // Переадресуем на команду /admin
                    return bot.handleUpdate({ message: { text: '/admin', chat: ctx.chat } }, ctx.botInfo);

                case '👥 Управление':
                    if (!user.isAdmin) {
                        await ctx.reply('🚫 Только для администраторов.');
                        return;
                    }
                    await ctx.reply(
                        `👥 *Управление пользователями*\n\n` +
                        `Используйте команды:\n` +
                        `/admin_blocks - Показать заблокированных\n` +
                        `/block_user <id> - Заблокировать пользователя\n` +
                        `/unblock_user <id> - Разблокировать пользователя`,
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case '💳 Платежи':
                    if (!user.isAdmin) {
                        await ctx.reply('🚫 Только для администраторов.');
                        return;
                    }
                    const pending = await prisma.transaction.count({
                        where: { type: 'WITHDRAW', status: 'PENDING' }
                    });
                    await ctx.reply(`💳 *Платежи*\n\nОжидают обработки: ${pending}\n\nДля обработки: \`/admin_withdrawals\``, { parse_mode: 'Markdown' });
                    break;

                case '⚙️ Настройки':
                    const userBalance = await getUserBalance(user.id, 'USDT');
                    const adminBadge = user.isAdmin ? '\n👑 Статус: АДМИНИСТРАТОР' : '';
                    await ctx.reply(
                        `⚙️ *Ваши настройки*\n\n` +
                        `👤 Ник: ${user.username ? '@' + user.username : 'ID: ' + user.id}\n` +
                        `💰 Баланс: ${userBalance} USDT${adminBadge}`,
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case '❓ Помощь':
                    await ctx.reply(
                        `❓ *Справка и поддержка*\n\n` +
                        `💬 Телеграм: @support_casino\n` +
                        `📧 Email: support@casinox.io`,
                        { parse_mode: 'Markdown' }
                    );
                    break;

                default:
                    // Проверяем, не является ли сообщение вводом суммы для пополнения
                    // В данном коде отсутствует логика обработки ввода произвольной суммы после 'deposit_custom',
                    // поэтому просто возвращаем главное меню, если это не команда.
                    if (!text.startsWith('/')) {
                        const menu = user.isAdmin ? getAdminMenuKeyboard() : getMainMenuKeyboard();
                        await ctx.reply('📋 *Выберите действие из меню:*', menu);
                    }
            }
        } catch (error) {
            console.error('Error handling message:', error);
            await ctx.reply('❌ Произошла ошибка. Попробуйте еще раз.');
        }
    });

    // ====================================
    // CALLBACK КНОПКИ
    // ====================================
    bot.action(/deposit_(\d+|custom)/, async (ctx) => {
        const action = ctx.match[0];
        const user = await prisma.user.findUnique({ 
            where: { telegramId: ctx.from.id.toString() } 
        });

        if (!user) return;

        let amount = 0;

        if (action === 'deposit_10') amount = 10;
        else if (action === 'deposit_50') amount = 50;
        else if (action === 'deposit_100') amount = 100;
        else if (action === 'deposit_500') amount = 500;
        else if (action === 'deposit_custom') {
            // Если нажата "Другая сумма", то пока что просто отвечаем.
            // В реальном приложении здесь должна быть логика ожидания следующего сообщения с суммой.
            await ctx.reply('Введите сумму в USDT, которую хотите пополнить. (Например: 25.5)');
            await ctx.answerCbQuery();
            return;
        }

        const invoice = await cryptoPayAPI.createInvoice(
            amount,
            'USDT',
            `Пополнение казино User #${user.id}`,
            user.id
        );

        if (invoice) {
            await ctx.editMessageText(
                `✅ *Инвойс создан*\n\nСумма: ${amount} USDT\nID: ${invoice.invoice_id}\n\nНажмите "Оплатить" для перехода к боту Crypto Pay.`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💳 Оплатить', url: invoice.bot_invoice_url }],
                            [{ text: '✅ Проверить статус', callback_data: `check_invoice_${invoice.invoice_id}` }]
                        ]
                    },
                    parse_mode: 'Markdown'
                }
            );
        } else {
            await ctx.reply('❌ Ошибка при создании инвойса.');
        }

        await ctx.answerCbQuery();
    });
    
    // Новая функция для проверки статуса инвойса
    bot.action(/check_invoice_(\d+)/, async (ctx) => {
        const invoiceId = ctx.match[1];
        await ctx.answerCbQuery('Проверяем статус...');
        
        const invoicesResult = await cryptoPayAPI.getInvoices([parseInt(invoiceId)]);

        if (invoicesResult && invoicesResult.invoices.length > 0) {
            const invoice = invoicesResult.invoices[0];
            const status = invoice.status;
            const amount = invoice.amount;
            const userId = parseInt(invoice.payload);

            if (status === 'paid') {
                // Проверяем, была ли транзакция уже записана в базу данных, чтобы избежать двойного пополнения
                const existingTransaction = await prisma.transaction.findFirst({
                    where: {
                        externalId: invoiceId.toString(),
                        type: 'DEPOSIT',
                        status: 'COMPLETED',
                    }
                });

                if (!existingTransaction) {
                    // Записываем транзакцию в БД
                    await prisma.transaction.create({
                        data: {
                            userId: userId,
                            type: 'DEPOSIT',
                            status: 'COMPLETED',
                            amount: amount,
                            currency: invoice.asset,
                            externalId: invoiceId.toString(),
                        }
                    });

                    // Обновляем баланс
                    await updateBalance(userId, invoice.asset, amount);
                    
                    await ctx.editMessageText(
                        `✅ *Оплата прошла успешно!* 🎉\n\nСумма: ${amount} ${invoice.asset} зачислена на Ваш баланс.`,
                        { parse_mode: 'Markdown' }
                    );
                } else {
                     await ctx.editMessageText(
                        `✅ *Оплата уже зачислена.* 🎉\n\nСумма: ${amount} ${invoice.asset} была зачислена ранее.`,
                        { parse_mode: 'Markdown' }
                    );
                }
            } else if (status === 'active') {
                await ctx.reply(`⏳ Инвойс #${invoiceId} еще не оплачен. Пожалуйста, оплатите по ссылке.`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💳 Оплатить', url: invoice.bot_invoice_url }],
                            [{ text: '✅ Проверить статус', callback_data: `check_invoice_${invoiceId}` }]
                        ]
                    }
                });
            } else if (status === 'expired') {
                 await ctx.editMessageText('❌ Срок действия инвойса истек. Попробуйте создать новый.', { parse_mode: 'Markdown' });
            } else {
                 await ctx.editMessageText(`⚠️ Статус инвойса #${invoiceId}: ${status}.`, { parse_mode: 'Markdown' });
            }
        } else {
            await ctx.reply('❌ Не удалось получить информацию об инвойсе.');
        }

    });


    // Экспорт
    module.exports = {     
        start: () => {       
            bot.launch();      
            console.log('🤖 Telegram Bot started.');     
        },     
        botInstance: bot,
        cryptoPayAPI,
        // Добавляем функцию для обработки вебхуков Crypto Pay
        handleCryptoPayWebhook: async (req, res) => {
            try {
                const updates = req.body.updates;
                if (!updates || updates.length === 0) {
                    return res.status(200).send('No updates');
                }

                console.log(`Webhook received ${updates.length} updates.`);
                
                for (const update of updates) {
                    const invoice = update.payload;
                    const invoiceId = invoice.invoice_id.toString();
                    const status = invoice.status;
                    const userId = parseInt(invoice.payload); // payload - это наш user.id
                    const amount = parseFloat(invoice.amount);
                    const asset = invoice.asset;

                    if (status === 'paid') {
                        // Проверяем, была ли транзакция уже записана в базу данных
                        const existingTransaction = await prisma.transaction.findFirst({
                            where: {
                                externalId: invoiceId,
                                type: 'DEPOSIT',
                                status: 'COMPLETED',
                            }
                        });

                        if (existingTransaction) {
                            console.log(`Deposit for invoice ${invoiceId} already processed.`);
                            continue;
                        }
                        
                        // Записываем транзакцию в БД
                        await prisma.transaction.create({
                            data: {
                                userId: userId,
                                type: 'DEPOSIT',
                                status: 'COMPLETED',
                                amount: amount,
                                currency: asset,
                                externalId: invoiceId,
                            }
                        });

                        // Обновляем баланс
                        await updateBalance(userId, asset, amount);

                        // Уведомляем пользователя
                        await bot.telegram.sendMessage(
                            userId,
                            `🎉 *Пополнение успешно!*\n\n${amount} ${asset} зачислено на Ваш баланс. Начинаем игру! 🚀`,
                            { parse_mode: 'Markdown' }
                        );
                        console.log(`Deposit processed for user ${userId}, amount ${amount} ${asset}.`);

                    } else if (status === 'expired') {
                         await bot.telegram.sendMessage(
                            userId,
                            `❌ *Инвойс истек*\n\nИнвойс #${invoiceId} на сумму ${amount} ${asset} истек. Пожалуйста, создайте новый.`,
                            { parse_mode: 'Markdown' }
                        );
                    }
                }

                res.status(200).send('OK');

            } catch (error) {
                console.error('❌ Crypto Pay Webhook error:', error);
                res.status(500).send('Internal Server Error');
            }
        }
    };
}