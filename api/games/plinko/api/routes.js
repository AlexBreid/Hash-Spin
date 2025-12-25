/**
 * 🎮 PLINKO API ROUTES - для твоей архитектуры
 */

const express = require('express');
const controller = require('./Controller');

const router = express.Router();

// ====================================
// MIDDLEWARE
// ====================================

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = req.headers['x-user-id'];

    if (!token || !userId) {
        return res.status(401).json({
            success: false,
            error: 'Missing authorization'
        });
    }

    req.userId = parseInt(userId);
    req.token = token;
    next();
};

// ====================================
// ROUTES
// ====================================

/**
 * POST /api/v1/plinko/play
 * Начать игру
 */
router.post('/play', authMiddleware, async(req, res) => {
    try {
        const { betAmount, rowCount, risk } = req.body;
        const userId = req.userId;

        if (!betAmount || !rowCount || !risk) {
            return res.status(400).json({
                success: false,
                error: 'Missing: betAmount, rowCount, risk'
            });
        }

        console.log(`🎮 POST /play - userId=${userId}, bet=${betAmount}`);

        const result = await controller.playGame({
            userId,
            betAmount: parseFloat(betAmount),
            rowCount: parseInt(rowCount),
            risk
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Error in POST /play:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/plinko/balance
 * Получить баланс текущего пользователя
 */
router.get('/balance', authMiddleware, async(req, res) => {
    try {
        const userId = req.userId;

        console.log(`💰 GET /balance - userId=${userId}`);

        const result = await controller.getBalance(userId);
        res.json(result);

    } catch (error) {
        console.error('❌ Error in GET /balance:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/plinko/history
 * Получить историю игр текущего пользователя
 */
router.get('/history', authMiddleware, async(req, res) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 20;

        console.log(`📜 GET /history - userId=${userId}, limit=${limit}`);

        const history = await controller.getHistory(userId, limit);

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('❌ Error in GET /history:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/plinko/stats
 * Получить статистику текущего пользователя
 */
router.get('/stats', authMiddleware, async(req, res) => {
    try {
        const userId = req.userId;

        console.log(`📊 GET /stats - userId=${userId}`);

        const stats = await controller.getStats(userId);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Error in GET /stats:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/plinko/game/:gameId
 * Получить одну игру
 */
router.get('/game/:gameId', authMiddleware, async(req, res) => {
    try {
        const gameId = req.params.gameId;
        const userId = req.userId;

        console.log(`🎮 GET /game/:gameId - gameId=${gameId}, userId=${userId}`);

        const result = await controller.getGame(gameId, userId);
        res.json(result);

    } catch (error) {
        console.error('❌ Error in GET /game/:gameId:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v1/plinko/verify
 * Проверить честность
 */
router.post('/verify', async(req, res) => {
    try {
        const { gameId, serverSeed, clientSeed, nonce } = req.body;

        if (!gameId || !serverSeed || !clientSeed || nonce === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing verification fields'
            });
        }

        console.log(`✔️ POST /verify - gameId=${gameId}`);

        const result = await controller.verifyGame({
            gameId,
            serverSeed,
            clientSeed,
            nonce
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Error in POST /verify:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;