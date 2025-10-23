// API/server.js
require('dotenv').config({ path: '../.env' }); // Загрузка переменных окружения из корня
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// --- ИМПОРТЫ НАШЕЙ ЛОГИКИ ---
const prisma = require('./prismaClient'); // Инициализированный клиент Prisma
const authRoutes = require('./src/routes/authRoutes'); // Роуты для авторизации
const telegramBot = require('./src/bots/telegramBot'); // Запуск бота (если он тут инициализируется)

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'; // Ваш React URL

// --- MIDDLEWARE ---
app.use(cors()); // Это эквивалентно cors({ origin: '*' })
app.use(bodyParser.json());

// --- РОУТИНГ ---
app.get('/', (req, res) => {
    res.send(`Casino API is running on port ${PORT}. Environment: ${process.env.NODE_ENV}`);
});

// Роуты авторизации: /api/v1/auth/*
app.use('/api/v1/auth', authRoutes);


// --- ЗАПУСК СЕРВЕРА ---
async function startServer() {
    try {
        // Проверка подключения к БД
        await prisma.$connect();
        console.log('✅ Connected to PostgreSQL database successfully.');

        // Запуск Telegram-бота (если его логика находится в отдельном модуле)
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