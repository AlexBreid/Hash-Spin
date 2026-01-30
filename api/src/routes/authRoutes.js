// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { 
    useOneTimeToken, 
    generateSessionToken, 
    shouldRefreshToken, 
    refreshSessionToken,
    authenticateWithTelegramInitData,
    verifySessionToken
} = require('../services/authService');
const prisma = require('../../prismaClient');

// ====================================
// 1. АВТОРИЗАЦИЯ ПО ТОКЕНУ (TELEGRAM)
// ====================================
router.post('/login-with-token', async(req, res) => {  
    const { token: oneTimeToken } = req.body;

    if (!oneTimeToken) {
        return res.status(400).json({ success: false, error: 'One-time token is required' });
    }

    try {
        const user = await useOneTimeToken(oneTimeToken);

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid, expired, or used token' });
        }

        const sessionToken = generateSessionToken(user);

        return res.json({
            success: true,
            token: sessionToken,
            user: { id: user.id, username: user.username, firstName: user.firstName }
        });
    } catch {
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ================================================
// 2. АВТОРИЗАЦИЯ ПО ЛОГИНУ И ПАРОЛЮ
// ================================================
router.post('/login-with-credentials', async(req, res) => {  
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    try {
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: username },
                    { id: isNaN(username) ? undefined : parseInt(username) }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        if (!user.passwordHash) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        const sessionToken = generateSessionToken(user);

        return res.json({
            success: true,
            token: sessionToken,
            user: { id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName }
        });
    } catch {
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ====================================
// 3. ОБНОВЛЕНИЕ ТОКЕНА (REFRESH)
// ====================================
router.post('/refresh-token', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    try {
        if (!shouldRefreshToken(token)) {
            const decoded = verifySessionToken(token);
            if (decoded) {
                return res.json({ success: true, refreshed: false, message: 'Token is still fresh' });
            }
        }

        const result = await refreshSessionToken(token);
        
        if (!result) {
            return res.status(401).json({ success: false, error: 'Token refresh failed' });
        }

        return res.json({
            success: true,
            refreshed: true,
            token: result.token,
            user: result.user
        });
    } catch {
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ====================================
// 4. АВТОРИЗАЦИЯ ЧЕРЕЗ TELEGRAM WEBAPP
// ====================================
router.post('/login-with-telegram', async (req, res) => {
    const { initData } = req.body;

    if (!initData) {
        return res.status(400).json({ success: false, error: 'Telegram initData is required' });
    }

    try {
        const result = await authenticateWithTelegramInitData(initData);

        if (!result) {
            return res.status(401).json({ success: false, error: 'Telegram authentication failed' });
        }

        return res.json({
            success: true,
            token: result.token,
            user: result.user
        });
    } catch {
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ====================================
// 5. ПРОВЕРКА ВАЛИДНОСТИ ТОКЕНА
// ====================================
router.get('/verify-token', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, valid: false, error: 'No token provided' });
    }

    try {
        const decoded = verifySessionToken(token);
        
        if (!decoded) {
            return res.status(401).json({ success: false, valid: false, error: 'Invalid or expired token' });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return res.status(401).json({ success: false, valid: false, error: 'User not found' });
        }

        const needsRefresh = shouldRefreshToken(token);

        return res.json({
            success: true,
            valid: true,
            needsRefresh,
            user: { id: user.id, username: user.username, firstName: user.firstName }
        });
    } catch {
        return res.status(500).json({ success: false, valid: false, error: 'Internal server error' });
    }
});

module.exports = router;
