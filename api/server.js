const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// --- ИМПОРТЫ НАШЕЙ ЛОГИКИ ---
const prisma = require('./prismaClient'); // Инициализированный клиент Prisma
const authRoutes = require('./src/routes/authRoutes'); // Роуты для авторизации
const userRoutes = require('./src/routes/userRoutes'); // <-- НОВЫЙ ИМПОРТ: Роуты для пользователя
const telegramBot = require('./src/bots/telegramBot'); // Запуск бота (если он тут инициализируется)

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://hash-spin.vercel.app';

// --- КОНФИГУРАЦИЯ CORS (КРИТИЧЕСКИ ВАЖНО) ---
const allowedOrigins = [
    'https://hash-spin.vercel.app', // Ваш публичный домен фронтенда
    'https://web.telegram.org',
    'https://t.me',
    // 💡 Добавляем Ngrok для работы во время разработки
    'https://bullheadedly-mobilizable-paulene.ngrok-free.dev',
    // Для локальной разработки, если это необходимо
    'http://localhost:5173', 
];

app.use(cors({
    origin: (origin, callback) => {
        // Разрешаем запросы без Origin (например, прямые запросы через curl/Postman или внутренние)
        if (!origin) return callback(null, true);

        // Разрешаем, если домен находится в списке
        if (allowedOrigins.includes(origin) || allowedOrigins.some(ao => origin.includes(ao.replace(/https?:\/\//, '')))) {
            callback(null, true);
        } else {
            // Если домен не разрешен - отклоняем и логируем для отладки
            console.error(`❌ CORS blocked request from unallowed origin: ${origin}`);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Важно для передачи заголовков авторизации (JWT)
}));

app.use(bodyParser.json());

// --- РОУТИНГ ---
app.get('/', (req, res) => {
    res.send(`Casino API is running on port ${PORT}. Frontend URL: ${FRONTEND_URL}`);
});

// Роуты авторизации: /api/v1/auth/* (логин, регистрация)
app.use('/api/v1/auth', authRoutes);

// Роуты для пользователя: /api/v1/user/* (профиль, статистика)
app.use('/api/v1/user', userRoutes); // <-- ДОБАВЛЕНО

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
