const { Telegraf } = require('telegraf');
const { registerNewUser, generateOneTimeToken } = require('../services/authService');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set. Bot cannot run.');
    // Не запускаем бота, если токен не найден
    module.exports = { start: () => {} };
} else {
    const bot = new Telegraf(BOT_TOKEN);

    // Обработка команды /start
    bot.start(async(ctx) => {
        const telegramId = ctx.from.id.toString();

        // 1. ПРОВЕРКА PRISMA: Ищем пользователя
        let user = await prisma.user.findUnique({ where: { telegramId } });

        if (!user) {
            // 2. ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН -> РЕГИСТРАЦИЯ
            try {
                user = await registerNewUser(ctx.from);
                await ctx.reply(`🎉 Привет, ${ctx.from.first_name || 'Игрок'}! Вы только что зарегистрированы в нашем крипто-казино. Нажмите кнопку ниже для входа.`);
            } catch (error) {
                console.error("Ошибка регистрации:", error);
                return ctx.reply("Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.");
            }
        }

        // 3. ГЕНЕРАЦИЯ ОДНОРАЗОВОГО ТОКЕНА
        const oneTimeToken = await generateOneTimeToken(user.id);

        // URL для Web App (Mini App)
        // Наш фронтенд будет слушать путь /auth
        const authUrl = `${FRONTEND_URL}/auth?token=${oneTimeToken}`;

        // Отправка кнопки Web App
        ctx.reply(`✅ Вы авторизованы. Нажмите "Открыть Казино" для входа на сайт.`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: '🚀 Открыть Казино',
                        web_app: { url: authUrl }
                    }]
                ]
            }
        });
    });

    // Экспорт функции запуска бота
    module.exports = {
        start: () => {
            bot.launch();
            console.log('🤖 Telegram Bot started.');
        },
        botInstance: bot // Полезно для других модулей
    };
}