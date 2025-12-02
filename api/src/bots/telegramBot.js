// src/bots/telegramBot.js
const { Telegraf } = require('telegraf');
const axios = require('axios');
const prisma = require('../../prismaClient');
const { registerNewUser, generateOneTimeToken } = require('../services/authService');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;
const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';

const WELCOME_IMAGE_PATH = path.join(__dirname, '../../assets/welcome.jpg');

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
    bot.start(async(ctx) => {    
        const telegramId = ctx.from.id.toString();    
        const username = ctx.from.username;

        try {
            // Проверяем блокировку
            let user = await prisma.user.findUnique({ where: { telegramId } });
            
            if (user && user.isBlocked) {
                await ctx.reply('🚫 Ваш аккаунт заблокирован. Обратитесь в поддержку.');
                return;
            }

            let isNewUser = false;

            if (!user) {
                // Регистрация нового пользователя
                const { user: newUser, rawPassword } = await registerNewUser(ctx.from);        
                user = newUser;
                isNewUser = true;

                const loginId = username ? `@${username}` : `ID: ${user.id}`;

                // Приветственное сообщение
                try {
                    if (fs.existsSync(WELCOME_IMAGE_PATH)) {
                        await ctx.replyWithPhoto(
                            { source: fs.createReadStream(WELCOME_IMAGE_PATH) },
                            {
                                caption: `🎉 *Добро пожаловать в ЛУЧШЕЕ КРИПТО ТГ КАЗИНО!* 🎉\n\n` +
                                        `Это невероятное казино с самыми высокими коэффициентами!\n\n` +
                                        `✨ *Ваши данные входа:*\n` +
                                        `🔑 Логин: \`${loginId}\`\n` +
                                        `🔐 Пароль: \`${rawPassword}\`\n\n` +
                                        `⚠️ *Сохраните пароль! Он показан только один раз.*`,
                                parse_mode: 'Markdown'
                            }
                        );
                    } else {
                        throw new Error('Image not found');
                    }
                } catch (imageError) {
                    console.warn('⚠️ Could not send image:', imageError.message);
                    await ctx.reply(
                        `🎉 *Добро пожаловать!*\n\n` +
                        `✨ *Ваши данные входа:*\n` +
                        `🔑 Логин: \`${loginId}\`\n` +
                        `🔐 Пароль: \`${rawPassword}\``,
                        { parse_mode: 'Markdown' }
                    );
                }
            } else {
                // Существующий пользователь
                const adminStatus = user.isAdmin ? ' 👑 (АДМИНИСТРАТОР)' : '';
                await ctx.reply(
                    `👋 *С возвращением, ${ctx.from.first_name || 'Игрок'}!*${adminStatus}\n\n` +
                    `Добро пожаловать обратно в лучшее крипто казино!`,
                    { parse_mode: 'Markdown' }
                );
            }

            // Генерация токена
            const oneTimeToken = await generateOneTimeToken(user.id);
            const authUrl = `${FRONTEND_URL}/auth?token=${oneTimeToken}`;
            const isHttps = FRONTEND_URL.startsWith('https://');

            if (isHttps) {
                await ctx.reply(
                    '✅ *Вы авторизованы! Готовы к игре?*',
                    getOpenCasinoButton(authUrl)
                );
            } else {
                await ctx.reply(
                    `✅ Вы авторизованы!\n\n🔗 Ссылка для входа:\n${authUrl}`,
                    { disable_web_page_preview: true }
                );
            }

            // Выбираем меню в зависимости от админ-статуса
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
                `/admin_users - Управление пользователями\n` +
                `/admin_blocks - Заблокированные пользователи\n` +
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
                message += `${i + 1}. ID: ${u.id} | @${u.username || 'unknown'}\n`;
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
            const user = await prisma.user.findUnique({
                where: { telegramId: ctx.from.id.toString() }
            });

            if (!user || !user.isAdmin) {
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

            await ctx.reply(`✅ Пользователь #${userId} заблокирован.`);
            console.log(`👮 Admin ${user.id} blocked user ${userId}`);
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
            const user = await prisma.user.findUnique({
                where: { telegramId: ctx.from.id.toString() }
            });

            if (!user || !user.isAdmin) {
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

            await ctx.reply(`✅ Пользователь #${userId} разблокирован.`);
            console.log(`👮 Admin ${user.id} unblocked user ${userId}`);
        } catch (error) {
            console.error('Error in /unblock_user:', error);
            await ctx.reply('❌ Ошибка при разблокировке.');
        }
    });

    // ====================================
    // ОБРАБОТКА СООБЩЕНИЙ
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
                    const authUrl = `${FRONTEND_URL}/auth?token=${oneTimeToken}`;
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
                            }
                        }
                    );
                    break;

                case '💸 Вывести':
                    const balance = await getUserBalance(user.id, 'USDT');
                    await ctx.reply(
                        `💸 *Вывод средств*\n\n💰 Ваш баланс: ${balance} USDT`,
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
                        `Используйте команды:\n` +
                        `/admin_stats - Статистика\n` +
                        `/admin_blocks - Заблокированные\n` +
                        `/block_user <id> - Заблокировать\n` +
                        `/unblock_user <id> - Разблокировать`,
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case '👥 Управление':
                    if (!user.isAdmin) {
                        await ctx.reply('🚫 Только для администраторов.');
                        return;
                    }
                    await ctx.command('admin_blocks');
                    break;

                case '💳 Платежи':
                    if (!user.isAdmin) {
                        await ctx.reply('🚫 Только для администраторов.');
                        return;
                    }
                    const pending = await prisma.transaction.count({
                        where: { type: 'WITHDRAW', status: 'PENDING' }
                    });
                    await ctx.reply(`💳 *Платежи*\n\nОжидают обработки: ${pending}`, { parse_mode: 'Markdown' });
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
            await ctx.reply('Введите сумму в USDT:');
            return;
        }

        const invoice = await cryptoPayAPI.createInvoice(
            amount,
            'USDT',
            `Пополнение казино User #${user.id}`,
            user.id
        );

        if (invoice) {
            await ctx.reply(
                `✅ *Инвойс создан*\n\nСумма: ${amount} USDT\nID: ${invoice.invoice_id}`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💳 Оплатить', url: invoice.bot_invoice_url }],
                            [{ text: '✅ Проверить статус', callback_data: `check_invoice_${invoice.invoice_id}` }]
                        ]
                    }
                }
            );
        } else {
            await ctx.reply('❌ Ошибка при создании инвойса.');
        }

        await ctx.answerCbQuery();
    });

    // Экспорт
    module.exports = {     
        start: () => {       
            bot.launch();      
            console.log('🤖 Telegram Bot started.');     
        },     
        botInstance: bot,
        cryptoPayAPI
    };
}