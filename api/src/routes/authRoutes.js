// API/src/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { useOneTimeToken } = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET;

// Эндпоинт для обмена одноразового токена (вызывается из AuthHandler.tsx)
router.post('/login-with-token', async(req, res) => {
    const { token: oneTimeToken } = req.body;

    if (!oneTimeToken) {
        return res.status(400).json({ success: false, error: 'One-time token is required' });
    }

    const user = await useOneTimeToken(oneTimeToken);

    if (!user) {
        // === ЛОГИРОВАНИЕ ОШИБКИ ===
        console.error(`[AUTH ERROR 401] Token rejected: ${oneTimeToken}`);
        // Попытаемся найти токен, чтобы увидеть его текущий статус в БД
        const rejectedToken = await prisma.oneTimeAuthToken.findUnique({ where: { token: oneTimeToken } });

        if (rejectedToken) {
            // 1. Просрочен?
            const expired = rejectedToken.expiresAt < new Date();
            // 2. Использован?
            const used = rejectedToken.isUsed;

            console.error(`[TOKEN STATUS] Used: ${used}, Expired: ${expired} (Expires at: ${rejectedToken.expiresAt.toISOString()})`);
        } else {
            console.error('[TOKEN STATUS] Token not found in DB.');
        }
        // ==========================

        return res.status(401).json({ success: false, error: 'Invalid, expired, or used token' });
    }

    // ... (код успешного входа)
});

module.exports = router;