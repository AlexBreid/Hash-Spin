// src/bots/telegramBot.js
const { Telegraf } = require('telegraf');
const prisma = require('../../prismaClient');
const { registerNewUser, generateOneTimeToken } = require('../services/authService');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

if (!BOT_TOKEN) {  
    console.error('❌ TELEGRAM_BOT_TOKEN is not set. Bot cannot run.');  
    module.exports = { start: () => {} };
} else {  
    const bot = new Telegraf(BOT_TOKEN);

       // Обработка команды /start
      
    bot.start(async(ctx) => {    
        const telegramId = ctx.from.id.toString();    
        const username = ctx.from.username;

            
        try {       // 1. Поиск пользователя
                  
            let user = await prisma.user.findUnique({ where: { telegramId } });

            let loginId;

                  
            if (!user) {         // 2. Регистрация нового пользователя
                        
                const { user: newUser, rawPassword } = await registerNewUser(ctx.from);        
                user = newUser;

                // Используем ID из БД, если username отсутствует
                loginId = username ? `@${username}` : `ID: ${user.id}`;

                // Вывод логина и пароля ТОЛЬКО при первой регистрации
                        
                const registrationMessage = `
🎉 **Привет, ${ctx.from.first_name || 'Игрок'}! Вы зарегистрированы.**

**Сохраните эти данные для входа (логин/пароль):**
* Логин: \`${loginId}\`
* Пароль: \`${rawPassword}\`

⚠️ **ВАЖНО!** Этот пароль показан **только один раз**. Сохраните его немедленно.
`;        
                await ctx.reply(registrationMessage, { parse_mode: 'Markdown' });        
                await ctx.reply(`Нажмите "Открыть Казино" для мгновенного входа через Telegram.`);      
            } else {         // Пользователь найден
                loginId = user.username ? `@${user.username}` : `ID: ${user.id}`;

                        
                await ctx.reply(`
👋 **С возвращением, ${ctx.from.first_name || 'Игрок'}!** Генерация ссылки для входа...

**Ваш логин для сайта:** \`${loginId}\`
**Пароль:** *Используйте ранее выданный или установленный вами. Если забыли, воспользуйтесь формой восстановления на сайте.*

Нажмите "Открыть Казино" для входа через Telegram.
`);      
            }

                   // 3. Генерация одноразового токена
                  
            const oneTimeToken = await generateOneTimeToken(user.id);

                   // URL для входа
                  
            const authUrl = `${FRONTEND_URL}/auth?token=${oneTimeToken}`;

                   // Проверяем, можно ли использовать Web App (только HTTPS)
                  
            const isHttps = FRONTEND_URL.startsWith('https://');

                  
            if (isHttps) {         // Production/Ngrok: используем Web App кнопку
                         await ctx.reply(`✅ Вы авторизованы. Используйте кнопку ниже для входа на сайт.`, {           reply_markup: {             inline_keyboard: [              
                            [{                 text: '🚀 Открыть Казино',                 web_app: { url: authUrl }               }]            
                        ]           }         });       } else {         // Development: отправляем обычную ссылку
                         await ctx.reply(          `✅ Вы авторизованы!\n\n` +           `🔗 Ссылка для входа (действительна 5 минут):\n` +           `${authUrl}\n\n` +           `⚠️ Для разработки: Скопируйте ссылку и откройте в браузере.\n` +           `📱 Для production используйте HTTPS (Ngrok или деплой).`, { disable_web_page_preview: true }        );       }    
        } catch (error) {       console.error("❌ Error in /start command:", error);      
            await ctx.reply("Произошла ошибка при обработке команды. Пожалуйста, попробуйте позже.");     }  
    });

       // Экспорт функции запуска бота
      
    module.exports = {     start: () => {       bot.launch();      
            console.log('🤖 Telegram Bot started.');     },     botInstance: bot   };
}