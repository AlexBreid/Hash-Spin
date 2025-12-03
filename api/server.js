const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Импорт локальных модулей
const prisma = require('./prismaClient');
const telegramBot = require('./src/bots/telegramBot');
const RouteLoader = require('./src/utils/routeLoader');

// ========== КОНФИГУРАЦИЯ ==========
const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 4000;
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;

// ========== ИНИЦИАЛИЗАЦИЯ ROUTE LOADER ==========
const routesDir = path.join(__dirname, 'src/routes');
const routeLoader = new RouteLoader(routesDir);

// Загружаем все route файлы
routeLoader.loadRoutes();
// Выводим все загруженные routes в консоль (опционально)
routeLoader.printRoutes();

// ========== MIDDLEWARE (CORS & HEADERS) ==========
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://hash-spin.vercel.app',
    'https://web.telegram.org',
    'https://t.me',
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.some((allowed) => origin.includes(allowed.replace(/https?:\/\//, '')))) {
            callback(null, true);
        } else {
            console.warn(`⚠️ CORS warning: Request from ${origin}`);
            callback(null, true);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
}));

app.options('*', cors());
app.use(bodyParser.json());

// Отключаем кэширование
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('ETag', '');
    next();
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Функция для сохранения endpoints в JSON
function saveEndpointsToFile() {
    try {
        const apiPaths = routeLoader.getApiPaths();
        const exportData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            baseUrl: API_BASE_URL,
            totalEndpoints: Object.keys(apiPaths).length,
            endpoints: apiPaths,
        };

        const dir = path.join(__dirname, 'src/api');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const filePath = path.join(dir, 'api-endpoints.json');
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

        console.log(`✅ Endpoints сохранены в ${filePath}`);
        console.log(`📊 Всего endpoints: ${Object.keys(apiPaths).length}`);
    } catch (error) {
        console.error('❌ Ошибка сохранения endpoints:', error);
    }
}

// ========== СИСТЕМНЫЕ ENDPOINTS ==========

// Получение всех путей
app.get('/api-endpoints', (req, res) => {
    try {
        const apiPaths = routeLoader.getApiPaths();
        res.json({
            success: true,
            baseUrl: API_BASE_URL,
            timestamp: new Date().toISOString(),
            totalEndpoints: Object.keys(apiPaths).length,
            endpoints: apiPaths,
        });
    } catch (error) {
        console.error('❌ Ошибка в /api-endpoints:', error);
        res.status(500).json({ success: false, error: 'Не удалось получить endpoints' });
    }
});

// Документация
app.get('/api-docs', (req, res) => {
    try {
        const apiPaths = routeLoader.getApiPaths();
        const docs = Object.entries(apiPaths).map(([key, route]) => ({
            key, path: route.path, method: route.method,
        }));
        res.json({
            success: true,
            totalEndpoints: docs.length,
            docs: docs.sort((a, b) => a.path.localeCompare(b.path)),
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Не удалось получить документацию' });
    }
});

// Экспорт endpoints
app.get('/export-endpoints', (req, res) => {
    try {
        saveEndpointsToFile(); // Переиспользуем логику
        res.json({ success: true, message: 'Endpoints экспортированы' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Не удалось экспортировать endpoints' });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Info Root
app.get('/', (req, res) => {
    res.json({
        message: 'Casino API Server & Bot',
        version: '1.0.0',
        uptime: process.uptime(),
        services: { api: 'running', bot: telegramBot?.start ? 'enabled' : 'disabled' },
        endpoints: {
            health: '/health',
            apiEndpoints: '/api-endpoints',
            documentation: '/api-docs',
        },
    });
});

// ========== ПОДКЛЮЧЕНИЕ РОУТЕРОВ ПРИЛОЖЕНИЯ ==========
const routers = routeLoader.getExpressRouters();
for (const router of routers) {
    app.use('/', router);
}

// 404 & Error Handlers
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint не найден', path: req.path });
});

app.use((err, req, res, next) => {
    console.error('❌ Ошибка сервера:', err);
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
});

// ========== ЕДИНАЯ ТОЧКА ЗАПУСКА ==========

async function startServer() {
    let httpServer;

    try {
        // 1. Подключение к БД (общее для API и Бота)
        await prisma.$connect();
        console.log('✅ Database: Connected to PostgreSQL');

        // 2. Запуск Telegram Бота
        if (telegramBot && telegramBot.start) {
            telegramBot.start();
            console.log('🤖 Telegram Bot: Started successfully');
        } else {
            console.warn('⚠️ Telegram Bot: Not configured or start method missing');
        }

        // 3. Запуск API Сервера
        httpServer = app.listen(PORT, () => {
            console.log(`🚀 API Server: Running on ${API_BASE_URL}`);
            
            // Сохраняем endpoints при старте
            console.log('\n📝 Сохраняю endpoints в JSON файл...');
            saveEndpointsToFile();
            
            console.log(`\n📚 Info:`);
            console.log(`   - Docs: ${API_BASE_URL}/api-docs`);
            console.log(`   - Health: ${API_BASE_URL}/health\n`);
        });

    } catch (error) {
        console.error('❌ Critical Startup Error:', error);
        process.exit(1);
    }

    // ========== GRACEFUL SHUTDOWN (ОБЩИЙ) ==========
    const shutdown = async (signal) => {
        console.log(`\n🛑 Received ${signal}. Shutting down services...`);
        
        // Остановка Бота
        if (telegramBot?.botInstance) {
            telegramBot.botInstance.stop(signal);
            console.log('🤖 Bot stopped.');
        }

        // Остановка HTTP сервера
        if (httpServer) {
            httpServer.close(() => {
                console.log('🚀 API Server closed.');
            });
        }

        // Отключение БД
        try {
            await prisma.$disconnect();
            console.log('💾 Database disconnected.');
        } catch (e) {
            console.error('Error disconnecting database:', e);
        }

        console.log('👋 Goodbye.');
        process.exit(0);
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
}

// Запуск всего приложения
startServer();

module.exports = app; // Экспорт для тестов, если нужно