// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');

// ====================================
// ПОЛУЧЕНИЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
// ====================================
router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [user, totalGames, totalScoreAggregate] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          createdAt: true,
        },
      }),
      // Считаем все ставки
      prisma.bet.count({ where: { userId } }),
      // Агрегируем чистый выигрыш по всем ставкам
      prisma.bet.aggregate({
        _sum: { netAmount: true },
        where: { userId },
      }),
    ]);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Безопасное преобразование Decimal → number
    const rawNet = totalScoreAggregate._sum.netAmount;
    const totalScore = rawNet ? parseFloat(rawNet.toString()) : 0;

    const level = 1 + Math.floor(totalGames / 10);
    const vipLevel =
      level >= 100
        ? 'Бриллиант'
        : level >= 50
        ? 'Платина'
        : level >= 10
        ? 'Золото'
        : 'Бронза';

    const userData = {
      id: user.id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      vipLevel,
      level,
      totalScore,
      totalGames,
      createdAt: user.createdAt.toISOString(),
    };

    // ✅ ПРАВИЛЬНЫЙ ФОРМАТ ОТВЕТА
    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;