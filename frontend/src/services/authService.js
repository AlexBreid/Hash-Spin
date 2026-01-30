// services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../../prismaClient');

const JWT_SECRET = process.env.JWT_SECRET || 'AAGbcdhfJcDJVuWCVMrFF1D6y711NyOvrpE';
const JWT_EXPIRES_IN = '7d'; // Токен действителен 7 дней
const ONE_TIME_TOKEN_EXPIRES_IN = 5 * 60 * 1000; // 5 минут для одноразового токена

// ====================================
// ГЕНЕРАЦИЯ JWT СЕССИОННОГО ТОКЕНА
// ====================================
function generateSessionToken(user) {
    return jwt.sign({
            userId: user.id,
            username: user.username
        },
        JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    );
}

// ====================================
// ВЕРИФИКАЦИЯ JWT ТОКЕНА
// ====================================
function verifySessionToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        
        return null;
    }
}

// ====================================
// ГЕНЕРАЦИЯ СЛУЧАЙНОГО ПАРОЛЯ
// ====================================
function generateRandomPassword(length = 12) {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
}

// ====================================
// РЕГИСТРАЦИЯ НОВОГО ПОЛЬЗОВАТЕЛЯ
// ====================================
async function registerNewUser(telegramUser) {
    const telegramId = telegramUser.id.toString();
    const rawPassword = generateRandomPassword(); // Генерируем случайный пароль
    const passwordHash = await bcrypt.hash(rawPassword, 10); // Хешируем пароль

    const user = await prisma.user.create({
        data: {
            telegramId,
            username: telegramUser.username || null,
            firstName: telegramUser.first_name || 'Unknown',
            lastName: telegramUser.last_name || null,
            photoUrl: null, // Можно добавить получение фото профиля
            passwordHash, // Сохраняем хеш пароля
        },
    });

    

    return { user, rawPassword }; // Возвращаем и пользователя, и сырой пароль
}

// ====================================
// ГЕНЕРАЦИЯ ОДНОРАЗОВОГО ТОКЕНА
// ====================================
async function generateOneTimeToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ONE_TIME_TOKEN_EXPIRES_IN);

    await prisma.oneTimeToken.create({
        data: {
            token,
            userId,
            expiresAt,
            used: false,
        },
    });

    
    return token;
}

// ====================================
// ИСПОЛЬЗОВАНИЕ ОДНОРАЗОВОГО ТОКЕНА
// ====================================
async function useOneTimeToken(token) {
    const tokenRecord = await prisma.oneTimeToken.findUnique({
        where: { token },
        include: { user: true },
    });

    // Проверки валидности токена
    if (!tokenRecord) {
        
        return null;
    }

    if (tokenRecord.used) {
        
        return null;
    }

    if (new Date() > tokenRecord.expiresAt) {
        
        return null;
    }

    // Помечаем токен как использованный
    await prisma.oneTimeToken.update({
        where: { token },
        data: { used: true },
    });

    
    return tokenRecord.user;
}

module.exports = {
    generateSessionToken,
    verifySessionToken,
    generateRandomPassword,
    registerNewUser,
    generateOneTimeToken,
    useOneTimeToken,
};
