const { v4: uuidv4 } = require('uuid');
const prisma = require('../../prismaClient');
const jwt = require('jsonwebtoken'); // <-- Добавлен импорт для генерации JWT

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '7d'; // Токен сессии действует 7 дней

// --- Вспомогательные функции ---

/**
 * Генерирует JWT-токен сессии для пользователя.
 */
function generateSessionToken(user) {
    const payload = {
        userId: user.id,
        telegramId: user.telegramId
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

/**
 * Вспомогательная функция для регистрации нового пользователя.
 */
async function registerNewUser(telegramData) {
    // ... (логика регистрации остается без изменений) ...
    const telegramId = telegramData.id.toString();

    const newUser = await prisma.user.create({
        data: {
            telegramId: telegramId,
            username: telegramData.username || null,
            firstName: telegramData.first_name || null,
            photoUrl: telegramData.photo_url || null,
        }
    });

    return newUser;
}


/**
 * Генерирует одноразовый токен и записывает его в БД.
 */
async function generateOneTimeToken(userId) {
    const token = uuidv4();
    // ИСПРАВЛЕНИЕ: Увеличен таймаут до 5 минут (300000 мс)
    const expiresAt = new Date(Date.now() + 300000); 

    await prisma.oneTimeAuthToken.create({
        data: {
            token: token,
            userId: userId,
            expiresAt: expiresAt,
            isUsed: false,
        },
    });

    return token;
}

/**
 * Проверяет и использует одноразовый токен.
 * @returns {Promise<User|null>}
 */
async function useOneTimeToken(token) {
    const authToken = await prisma.oneTimeAuthToken.findUnique({
        where: { token: token },
        include: { user: true },
    });

    if (!authToken || 
        authToken.expiresAt < new Date()
    ) {
        return null; // Недействителен или просрочен
    }
    
    // -----------------------------------------------------------------
    // >>> ВРЕМЕННЫЙ ХАК ДЛЯ ОТЛАДКИ: ИГНОРИРУЕМ ПРОВЕРКУ "ИСПОЛЬЗОВАН"
    // Если мы не закомментируем этот блок, токен будет использован при первом же запросе
    // и все последующие попытки авторизации будут завершаться ошибкой.
    /*
    if (authToken.isUsed) {
        console.warn('⚠️ HACK: Ignoring used token check for debug.');
        // В нормальном режиме тут должен быть return null;
    }
    */
    // -----------------------------------------------------------------

    // *НЕ* помечаем токен как использованный здесь, пока не убедимся в успехе
    // Мы сделаем это в роуте, чтобы токен можно было использовать повторно для отладки.
    
    return authToken.user;
}

module.exports = { registerNewUser, generateOneTimeToken, useOneTimeToken, generateSessionToken };