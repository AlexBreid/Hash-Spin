const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
// ИСПРАВЛЕНИЕ: Импортируем generateSessionToken
const { useOneTimeToken, generateSessionToken } = require('../services/authService');
const prisma = require('../../prismaClient'); // Импортируем prisma для логирования/обновления

// ...

// Эндпоинт для обмена одноразового токена (вызывается из AuthHandler.tsx)
router.post('/login-with-token', async(req, res) => {
    const { token: oneTimeToken } = req.body;

    if (!oneTimeToken) {
        return res.status(400).json({ success: false, error: 'One-time token is required' });
    }
    
    // Пытаемся получить пользователя. Проверка 'isUsed' временно отключена в сервисе!
    const user = await useOneTimeToken(oneTimeToken); 

    if (!user) {
        // === ЛОГИРОВАНИЕ ОШИБКИ (Остается для диагностики) ===
        console.error(`[AUTH ERROR 401] Token rejected: ${oneTimeToken}`);
        const rejectedToken = await prisma.oneTimeAuthToken.findUnique({ where: { token: oneTimeToken } });

        if (rejectedToken) {
            const expired = rejectedToken.expiresAt < new Date();
            const used = rejectedToken.isUsed;

            console.error(`[TOKEN STATUS] Used: ${used}, Expired: ${expired} (Expires at: ${rejectedToken.expiresAt.toISOString()})`);
        } else {
            console.error('[TOKEN STATUS] Token not found in DB.');
        }
        // ==========================

        return res.status(401).json({ success: false, error: 'Invalid, expired, or used token' });
    }

    // --- ЛОГИКА УСПЕШНОГО ВХОДА ---

    // 1. Создаем JWT-токен сессии
    const sessionToken = generateSessionToken(user);
    
    // -----------------------------------------------------------------
    // >>> ВРЕМЕННЫЙ ХАК: ЗАКОММЕНТИРУЙТЕ БЛОК ОБНОВЛЕНИЯ,
    // чтобы токен можно было использовать несколько раз для теста!
    /* try {
        await prisma.oneTimeAuthToken.update({
            where: { token: oneTimeToken },
            data: { isUsed: true },
        });
        console.log(`✅ One-time token ${oneTimeToken} successfully marked as used.`);
    } catch (dbError) {
        console.error('❌ Failed to mark one-time token as used:', dbError);
    }
    */
    // -----------------------------------------------------------------
    
    console.log(`🎉 Successful login via token: ${oneTimeToken}. Issued Session Token.`);
    
    // Успешный ответ
    return res.json({ 
        success: true, 
        token: sessionToken, 
        // Возвращаем данные пользователя, как ожидает фронтенд
        user: { 
            id: user.id, 
            username: user.username, 
            firstName: user.firstName 
        } 
    });
});

module.exports = router;