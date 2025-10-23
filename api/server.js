const express = require('express'); // <-- ИСПРАВЛЕНО: Добавлен express
const bodyParser = require('body-parser');
const cors = require('cors');

// --- ИМПОРТЫ НАШЕЙ ЛОГИКИ ---
const prisma = require('./prismaClient'); // Инициализированный клиент Prisma
const authRoutes = require('./src/routes/authRoutes'); // Роуты для авторизации
const telegramBot = require('./src/bots/telegramBot'); // Запуск бота (если он тут инициализируется)

const app = express();
const PORT = process.env.PORT || 3000;
// FRONTEND_URL используется для информации, но не для CORS, поэтому оставляем
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://hash-spin.vercel.app';

// --- КОНФИГУРАЦИЯ CORS (КРИТИЧЕСКИ ВАЖНО) ---
const allowedOrigins = [
    // 1. Ваш публичный домен фронтенда (УБРАН СЛЭШ!)
    'https://hash-spin.vercel.app',

    // 2. Домены, которые использует Telegram Web App
    'https://web.telegram.org',
    'https://t.me',

    // 3. Локальный хост (если вы тестируете локальный фронтенд)
    'http://localhost:3000',
    'http://localhost:5173' // Порт по умолчанию для Vite/React
];

app.use(cors({
    origin: (origin, callback) => {
        // Разрешаем запросы без Origin (например, прямые запросы через curl/Postman)
        if (!origin) return callback(null, true);

        // Разрешаем, если домен находится в списке
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Если домен не разрешен - отклоняем и логируем для отладки
            console.error(`❌ CORS blocked request from unallowed origin: ${origin}`);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Важно для передачи куки и заголовков авторизации
}));

app.use(bodyParser.json());

// --- РОУТИНГ ---
app.get('/', (req, res) => {
    res.send(`Casino API is running on port ${PORT}. Frontend URL: ${FRONTEND_URL}`);
});

// Роуты авторизации: /api/v1/auth/*
app.use('/api/v1/auth', authRoutes);


// --- ЗАПУСК СЕРВЕРА ---
async function startServer() {
    try {
        // Проверка подключения к БД
        await prisma.$connect();
        console.log('✅ Connected to PostgreSQL database successfully.');

        // Запуск Telegram-бота 
        if (telegramBot && telegramBot.start) {
            telegramBot.start();
        }

        app.listen(PORT, () => {
            console.log(`⚡️ Express server listening at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Database connection or server start failed:', error);
        process.exit(1);
    }
}

startServer();