const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
// Импортируем middleware для защиты роута
const { authenticateToken } = require('../middleware/authMiddleware'); 

// Эндпоинт: GET /api/v1/user/profile (защищен)
router.get('/profile', authenticateToken, async (req, res) => {
    // Получаем ID пользователя из JWT-пейлоада, добавленного в req.user
    const userId = req.user.userId; 

    try {
        // --- 1. Параллельные запросы к БД ---
        
        // A. Основные данные пользователя
        const userPromise = prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                createdAt: true,
            }
        });

        // B. Агрегация: Считаем общее количество сыгранных игр (Bet)
        const totalGamesPromise = prisma.bet.count({
            where: { userId: userId },
        });

        // C. Агрегация: Считаем общий чистый результат (Net Amount)
        const totalScoreAggregatePromise = prisma.bet.aggregate({
            _sum: { netAmount: true },
            where: { userId: userId },
        });

        const [user, totalGames, totalScoreAggregate] = await Promise.all([
            userPromise,
            totalGamesPromise,
            totalScoreAggregatePromise,
        ]);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // --- 2. Логика расчетов уровня и VIP-статуса ---
        
        // Перевод Decimal в Number/String
        const totalScore = totalScoreAggregate._sum.netAmount 
            ? parseFloat(totalScoreAggregate._sum.netAmount.toFixed(2))
            : 0;
            
        // Пример логики расчета уровня: 1 уровень за каждые 10 игр
        const level = 1 + Math.floor(totalGames / 10); 
        // Пример логики VIP-статуса
        const vipLevel = 
            level >= 100 ? 'Бриллиант' : 
            (level >= 50 ? 'Платина' : 
            (level >= 10 ? 'Золото' : 'Бронза'));

        // --- 3. Формирование финального объекта ---
        const userData = {
            id: user.id.toString(), 
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            photoUrl: user.photoUrl,
            
            vipLevel: vipLevel,
            level: level,
            totalScore: totalScore,
            totalGames: totalGames,
            createdAt: user.createdAt.toISOString(),
        };

        res.json(userData);

    } catch (error) {
        console.error('❌ Error fetching user profile:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;