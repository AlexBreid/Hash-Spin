// botServer.js - Отдельный сервер только для Telegram бота (БЕЗ Express!)
const prisma = require('./prismaClient');
const telegramBot = require('./src/bots/telegramBot');

async function startBotServer() {
    try {
        await prisma.$connect();
        console.log('✅ Bot Server: Connected to PostgreSQL');

        if (telegramBot && telegramBot.start) {
            telegramBot.start();
            console.log('🤖 Telegram Bot started successfully');
            console.log('📱 Bot is listening for messages...');
        } else {
            console.warn('⚠️ Telegram Bot not configured');
        }

        // Graceful shutdown
        process.once('SIGINT', () => {
            console.log('🛑 Bot Server: Shutting down...');
            if (telegramBot.botInstance) {
                telegramBot.botInstance.stop('SIGINT');
            }
            prisma.$disconnect();
            process.exit(0);
        });

        process.once('SIGTERM', () => {
            console.log('🛑 Bot Server: Shutting down...');
            if (telegramBot.botInstance) {
                telegramBot.botInstance.stop('SIGTERM');
            }
            prisma.$disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Bot Server startup failed:', error);
        process.exit(1);
    }
}

startBotServer();

// НЕ экспортируем app, только функцию запуска
module.exports = { startBotServer };