const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');

// 💡 Вспомогательная функция для проверки Game Server Secret
const checkServerSecret = (req, res) => {
    const serverSecret = req.headers['x-server-secret'];
    if (serverSecret !== process.env.GAME_SERVER_SECRET) {
        res.status(403).json({ success: false, error: 'Unauthorized: Invalid Server Secret' });
        return false;
    }
    return true;
};

// ===================================
// 🟢 НОВЫЕ ЭНДПОИНТЫ ДЛЯ GAME SERVER
// ===================================

/**
 * POST /api/v1/crash/start-round
 * Создать новую запись о раунде
 */
router.post('/api/v1/crash/start-round', async (req, res) => {
    if (!checkServerSecret(req, res)) return;

    try {
        const { gameId, crashPoint, serverSeedHash, clientSeed } = req.body;

        const newRound = await prisma.crashRound.create({
            data: {
                gameId: gameId, 
                crashPoint: crashPoint.toString(),
                serverSeedHash,
                clientSeed,
            },
        });

        res.json({ success: true, data: { roundId: newRound.id } });
    } catch (error) {
        console.error('❌ Error creating crash round:', error);
        res.status(500).json({ success: false, error: 'Failed to create round' });
    }
});


/**
 * POST /api/v1/crash/create-bet
 * Создать новую запись о ставке
 */
router.post('/api/v1/crash/create-bet', async (req, res) => {
    if (!checkServerSecret(req, res)) return;

    try {
        const { userId, gameId, amount, tokenId } = req.body;

        // Конвертация GameId из UUID в Int ID раунда
        const round = await prisma.crashRound.findUnique({
            where: { gameId: gameId },
            select: { id: true }
        });
        
        if (!round) {
            console.error(`❌ Error creating crash bet: Round with gameId ${gameId} not found.`);
            return res.status(404).json({ success: false, error: 'Round not found' });
        }

        const newBet = await prisma.crashBet.create({
            data: {
                userId,
                roundId: round.id, // Используем Int ID раунда
                tokenId,
                betAmount: amount.toString(),
                exitMultiplier: null,
                winnings: '0',
                result: 'pending',
            },
        });

        // Также логируем транзакцию (списание)
        await prisma.crashTransaction.create({
            data: {
                userId,
                betId: newBet.id,
                tokenId,
                amount: -parseFloat(amount), // Отрицательная сумма = списание
                type: 'bet',
            },
        });


        res.json({ success: true, data: { betId: newBet.id } }); // Возвращаем ID ставки
    } catch (error) {
        console.error('❌ Error creating crash bet:', error);
        res.status(500).json({ success: false, error: 'Failed to create bet' });
    }
});


// ===================================
// 🟢 ОБНОВЛЕННЫЙ ЭНДПОИНТ: cashout-result
// ===================================

/**
 * POST /api/v1/crash/cashout-result
 * Зачислить выигрыш и финализировать ставку
 */
router.post('/api/v1/crash/cashout-result', async (req, res) => {
    if (!checkServerSecret(req, res)) return;

    try {
        const { userId, tokenId, betId, winnings, exitMultiplier, gameId, result } = req.body;
        
        // 🚨 ИСПРАВЛЕНИЕ: Проверяем, что betId существует
        if (!betId) {
            console.error('❌ Error: betId is missing in cashout-result request body');
            // В зависимости от логики вашего сервера, вы можете вернуть 400 или 500
            return res.status(400).json({ success: false, error: 'Missing required parameter: betId' });
        }

        const winningsAmount = parseFloat(winnings) || 0;
        
        // 1. Обновляем запись о ставке
        // Преобразуем betId в целое число, так как в схеме это Int
        const betIdInt = parseInt(betId, 10);

        // Проверяем, что betIdInt - это валидное число
        if (isNaN(betIdInt)) {
             console.error(`❌ Error: Invalid betId provided: ${betId}`);
             return res.status(400).json({ success: false, error: 'Invalid betId format' });
        }
        
        await prisma.crashBet.update({
            where: { id: betIdInt }, // Используем проверенный Int ID
            data: {
                result, // 'won' или 'lost'
                winnings: winningsAmount.toString(),
                exitMultiplier: exitMultiplier ? exitMultiplier.toString() : null,
            },
        });

        if (winningsAmount > 0) {
            // 2. Зачисляем выигрыш на баланс
            // NOTE: В реальном приложении это должно быть в транзакции, чтобы избежать race conditions
            let balance = await prisma.balance.findUnique({
                where: {
                    userId_tokenId_type: {
                        userId,
                        tokenId,
                        type: 'MAIN',
                    },
                },
            });

            // Логика создания баланса, если не существует
            if (!balance) {
                // В зависимости от вашей логики, возможно, здесь должна быть ошибка, если баланс не был создан при регистрации
                balance = await prisma.balance.create({
                    data: {
                        userId,
                        tokenId,
                        type: 'MAIN',
                        amount: winningsAmount.toString(),
                    },
                });
            } else {
                balance = await prisma.balance.update({
                    where: { id: balance.id },
                    data: {
                        amount: {
                            increment: winningsAmount,
                        },
                    },
                });
            }

            // 3. Логируем транзакцию (выигрыш)
            await prisma.crashTransaction.create({
                data: {
                    userId,
                    betId: betIdInt, // Используем проверенный Int ID
                    tokenId,
                    amount: winningsAmount,
                    type: 'winnings',
                },
            });
            console.log(`✅ Cashout processed: User ${userId}, Bet ID: ${betId}, Winnings: ${winnings}`);
        }
        
        // 4. (Оставлен комментарий о финализации раунда, как и в оригинале)
        
        res.json({ success: true, data: { status: 'finalized' } });
    } catch (error) {
        console.error('❌ Error processing cashout/results:', error);

        // В случае ошибки PrismaClientValidationError, скорее всего, проблема с ID
        if (error.code === 'P2025') {
             return res.status(404).json({ success: false, error: 'Bet record not found or already processed.' });
        }
        if (error.name === 'PrismaClientValidationError') {
            return res.status(400).json({ success: false, error: 'Invalid input data or missing required field.' });
        }

        res.status(500).json({ success: false, error: 'Failed to process cashout' });
    }
});


// ===================================
// СТАРЫЕ ЭНДПОИНТЫ (без изменений)
// ===================================

router.get('/api/v1/crash/history', authenticateToken, async (req, res) => { /* ... */ });
router.get('/api/v1/crash/stats', authenticateToken, async (req, res) => { /* ... */ });
router.get('/api/v1/crash/leaderboard', async (req, res) => { /* ... */ });
router.post('/api/v1/crash/verify-bet', authenticateToken, async (req, res) => { /* ... */ });

module.exports = router;