const { v4: uuidv4 } = require('uuid');
const prisma = require('../../prismaClient');

/**
 * Вспомогательная функция для регистрации нового пользователя.
 * @param {object} telegramData - Данные пользователя из Telegram (msg.from)
 * @returns {Promise<User>}
 */
async function registerNewUser(telegramData) {
    const telegramId = telegramData.id.toString();

    // ВАЖНО: Добавьте сюда логику инициализации Balance[] для каждого CryptoToken!
    // Для простоты, пока только создание User.
    const newUser = await prisma.user.create({
        data: {
            telegramId: telegramId,
            username: telegramData.username || null,
            firstName: telegramData.first_name || null,
            photoUrl: telegramData.photo_url || null,
            // referralCode генерируется автоматически по @default(cuid())
            // ... Здесь должна быть логика создания начальных балансов
        }
    });

    return newUser;
}


/**
 * Генерирует одноразовый токен и записывает его в БД.
 */
async function generateOneTimeToken(userId) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 120000); // Истекает через 30 секунд

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
 */
async function useOneTimeToken(token) {
    const authToken = await prisma.oneTimeAuthToken.findUnique({
        where: { token: token },
        include: { user: true },
    });

    if (!authToken ||
        authToken.isUsed ||
        authToken.expiresAt < new Date()
    ) {
        return null; // Недействителен, использован или просрочен
    }

    // Помечаем токен как использованный
    await prisma.oneTimeAuthToken.update({
        where: { id: authToken.id },
        data: { isUsed: true },
    });

    return authToken.user;
}

module.exports = { registerNewUser, generateOneTimeToken, useOneTimeToken };