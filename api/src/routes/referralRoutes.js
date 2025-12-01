const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * 📊 GET реферальную статистику пользователя
 * GET /api/v1/referral/stats
 */
router.get('/api/v1/referral/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log(`📊 Загружаю статистику для пользователя ${userId}`);

    // Получаем пользователя с информацией о рефереру
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCode: true,
        referredById: true,
        referrer: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден',
      });
    }

    // Считаем количество рефералов (друзей, которые ввели наш код)
    const referralsCount = await prisma.user.count({
      where: { referredById: userId },
    });

    console.log(`✅ Пользователь имеет ${referralsCount} рефералов`);

    res.json({
      success: true,
      data: {
        myReferralCode: user.referralCode,
        myRefeersCount: referralsCount,
        referredByCode: user.referredById ? true : false,
        referrerUsername: user.referrer?.username || null,
        bonusPercentage: 10, // 10% от пополнений рефералов
      },
    });
  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики',
    });
  }
});

/**
 * 🔗 POST привязать реферальный код
 * POST /api/v1/referral/link-referrer
 * Body: { referralCode: "ABC123" }
 */
router.post('/api/v1/referral/link-referrer', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { referralCode } = req.body;

    console.log(`🔗 Попытка привязать код ${referralCode} для пользователя ${userId}`);

    // Валидация
    if (!referralCode || referralCode.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Реферальный код не может быть пустым',
      });
    }

    // Получаем текущего пользователя
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referredById: true, username: true },
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Текущий пользователь не найден',
      });
    }

    // 🔴 КРИТИЧЕСКАЯ ПРОВЕРКА: пользователь уже привязан к рефереру
    if (currentUser.referredById !== null) {
      console.warn(`⚠️ Пользователь ${userId} уже привязан к рефереру с ID ${currentUser.referredById}`);
      return res.status(400).json({
        success: false,
        message: 'Вы уже использовали реферальный код. Один код можно ввести только один раз!',
      });
    }

    // Ищем реферера по коду (referralCode)
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.trim() },
      select: { id: true, username: true },
    });

    if (!referrer) {
      console.warn(`⚠️ Реферер с кодом "${referralCode}" не найден`);
      return res.status(404).json({
        success: false,
        message: 'Реферальный код не найден. Проверьте правильность кода.',
      });
    }

    // 🔴 ПРОВЕРКА: не пытаемся привязаться к себе
    if (referrer.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя использовать свой собственный реферальный код',
      });
    }

    // ✅ Привязываем пользователя к рефереру
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { referredById: referrer.id },
      select: { id: true, referredById: true },
    });

    console.log(`✅ Пользователь ${userId} (${currentUser.username}) привязан к рефереру ${referrer.id} (${referrer.username})`);

    res.json({
      success: true,
      message: 'Реферальный код успешно привязан!',
      data: {
        referrerUsername: referrer.username,
        referrerId: referrer.id,
      },
    });
  } catch (error) {
    console.error('❌ Ошибка привязки реферального кода:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Ошибка привязки реферального кода',
      error: error.message,
    });
  }
});

module.exports = router;