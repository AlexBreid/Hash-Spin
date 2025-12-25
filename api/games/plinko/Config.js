/**
 * 🎮 PLINKO MICROSERVICE CONFIG
 */

// Socket.IO конфиг по умолчанию
const defaultSocketConfig = {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8000', '*'],
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
};

// Таблица выплат (если require не работает, используем по умолчанию)
let payoutTable;
try {
    payoutTable = require('./helpers/payoutTable');
} catch (e) {
    console.warn('⚠️ Could not load payout table, using default');
    payoutTable = {
        low: { 8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6] },
        medium: { 8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13] },
        high: { 8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29] }
    };
}

module.exports = {
    // Порт микросервиса
    port: process.env.PLINKO_PORT || 5600,
    host: process.env.PLINKO_HOST || '127.0.0.1',

    // Main API Gateway (для синхронизации с основным сервером)
    mainApiUrl: process.env.MAIN_API_URL || 'http://localhost:4000',
    apiToken: process.env.API_TOKEN || 'your-secret-token',

    // Database (MongoDB для истории)
    mongoUrl: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/plinko',
    mongoEnabled: process.env.MONGO_ENABLED !== 'false',

    // Prisma Database (для основной БД, если нужна)
    prismaUrl: process.env.DATABASE_URL,
    prismaEnabled: process.env.DATABASE_URL ? true : false,

    // Конфигурация игры
    game: {
        name: 'plinko',
        displayName: 'Plinko',
        icon: '🎮',

        // Параметры ставок
        minBet: parseFloat(process.env.PLINKO_MIN_BET || '0.01'),
        maxBet: parseFloat(process.env.PLINKO_MAX_BET || '1000000'),

        // Параметры игры
        minRows: 8,
        maxRows: 16,
        risks: ['low', 'medium', 'high'],

        // Множители выигрыша
        payoutTable: payoutTable,
    },

    // Socket.IO конфиг ✅ ВАЖНО: не удалять!
    socket: defaultSocketConfig,

    // Логирование
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        directory: process.env.LOG_DIR || './logs'
    },

    // Таймауты
    timeouts: {
        gameProcess: 5000, // 5 сек для обработки игры
        mainApiRequest: 3000, // 3 сек для запроса к main API
        socketResponse: 2000 // 2 сек для ответа по сокету
    },

    // Размер истории по умолчанию
    historyLimit: 20,

    // Включение/отключение функций
    features: {
        fairnessVerification: true,
        historyTracking: true,
        statsTracking: true,
        webhooks: false
    }
};