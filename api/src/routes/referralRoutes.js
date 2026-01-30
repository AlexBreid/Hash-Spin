/**
 * 🔗 Referral Routes - API реферальной системы (ИСПРАВЛЕННЫЙ)
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const referralService = require('../services/ReferralService');

/**
 * 📊 GET реферальную статистику пользователя
 * GET /api/v1/referral/stats
 */
router.get('/api/v1/referral/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Получаем полную статистику через сервис
    const stats = await referralService.getReferrerStats(userId);

    // Получаем пользователя с информацией о реферере
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCode: true,
        referredById: true,
        referrerType: true,
        referrer: {
          select: { username: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      data: {
        // Моя рефералка
        myReferralCode: user.referralCode,
        referrerType: user.referrerType,
        commissionRate: stats?.commissionRate || 0,
        
        // Мои рефералы
        myReferralsCount: stats?.referralsCount || 0,
        
        // Статистика заработка
        totalTurnover: stats?.totalTurnover || 0,
        totalCommissionPaid: stats?.totalCommissionPaid || 0,
        potentialCommission: stats?.potentialCommission || 0,
        totalLosses: stats?.totalLosses || 0,
        
        // Был ли я приглашен
        referredByCode: user.referredById ? true : false,
        referrerUsername: user.referrer?.username || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики'
    });
  }
});

/**
 * 📊 GET прогресс отыгрыша бонуса
 * GET /api/v1/referral/bonus-stats
 */
router.get('/api/v1/referral/bonus-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const bonusStats = await referralService.getBonusStats(userId);

    if (!bonusStats?.hasActiveBonus) {
      return res.json({
        success: true,
        data: null,
        message: 'Нет активных бонусов'
      });
    }

    res.json({
      success: true,
      data: bonusStats.bonus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики бонуса'
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

    // Валидация
    if (!referralCode || referralCode.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Реферальный код не может быть пустым'
      });
    }

    // Получаем текущего пользователя
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referredById: true, username: true }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Текущий пользователь не найден'
      });
    }

    // 🔴 КРИТИЧЕСКАЯ ПРОВЕРКА: пользователь уже привязан к рефереру
    if (currentUser.referredById !== null) {
      return res.status(400).json({
        success: false,
        message: 'Вы уже использовали реферальный код. Один код можно ввести только один раз!'
      });
    }

    // Ищем реферера по коду
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.trim() },
      select: { id: true, username: true, referrerType: true }
    });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Реферальный код не найден. Проверьте правильность кода.'
      });
    }

    // 🔴 ПРОВЕРКА: не пытаемся привязаться к себе
    if (referrer.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя использовать свой собственный реферальный код'
      });
    }

    // ✅ Привязываем пользователя к рефереру
    await prisma.user.update({
      where: { id: userId },
      data: { referredById: referrer.id }
    });

    res.json({
      success: true,
      message: 'Реферальный код успешно привязан! При первом депозите вы получите +100% бонус!',
      data: {
        referrerUsername: referrer.username,
        referrerId: referrer.id,
        bonusInfo: {
          depositBonus: '100%',
          wageringRequirement: '10x'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка привязки реферального кода'
    });
  }
});

/**
 * 📋 GET список моих рефералов
 * GET /api/v1/referral/my-referrals
 */
router.get('/api/v1/referral/my-referrals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Получаем рефералов
    const referrals = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Получаем статистику по каждому рефералу
    const referralsWithStats = await Promise.all(
      referrals.map(async (ref) => {
        const stats = await prisma.referralStats.findUnique({
          where: {
            referrerId_refereeId_tokenId: {
              referrerId: userId,
              refereeId: ref.id,
              tokenId: 2 // USDT
            }
          }
        });

        // Получаем количество рефералов этого реферала
        const refereeReferralsCount = await prisma.user.count({
          where: { referredById: ref.id }
        });

        return {
          id: ref.id,
          username: ref.username || `User #${ref.id}`,
          firstName: ref.firstName,
          joinedAt: ref.createdAt,
          totalTurnover: parseFloat(stats?.totalTurnover?.toString() || '0'),
          commissionEarned: parseFloat(stats?.totalCommissionPaid?.toString() || '0'),
          totalLosses: parseFloat(stats?.totalLosses?.toString() || '0'),
          referralsCount: refereeReferralsCount // Количество рефералов этого реферала
        };
      })
    );

    const totalCount = await prisma.user.count({
      where: { referredById: userId }
    });

    res.json({
      success: true,
      data: {
        referrals: referralsWithStats,
        pagination: {
          total: totalCount,
          limit,
          offset
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения списка рефералов'
    });
  }
});

// ====================================
// ADMIN ROUTES
// ====================================

/**
 * 👷 POST установить пользователя как воркера (ADMIN)
 * POST /api/v1/admin/referral/set-worker
 * Body: { userId: 123 }
 */
router.post('/api/v1/admin/referral/set-worker', authenticateToken, async (req, res) => {
  try {
    // Проверяем админ
    const admin = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isAdmin: true }
    });

    if (!admin?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещён'
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId обязателен'
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { referrerType: 'WORKER' }
    });

    res.json({
      success: true,
      message: `Пользователь ${userId} установлен как WORKER (5% комиссия от потерь рефералов)`,
      data: {
        userId: user.id,
        username: user.username,
        referrerType: user.referrerType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка установки воркера'
    });
  }
});

/**
 * 👷 POST убрать статус воркера (ADMIN)
 * POST /api/v1/admin/referral/remove-worker
 * Body: { userId: 123 }
 */
router.post('/api/v1/admin/referral/remove-worker', authenticateToken, async (req, res) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isAdmin: true }
    });

    if (!admin?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещён'
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId обязателен'
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { referrerType: 'REGULAR' }
    });

    res.json({
      success: true,
      message: `Пользователь ${userId} теперь REGULAR (30% комиссия)`,
      data: {
        userId: user.id,
        username: user.username,
        referrerType: user.referrerType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления воркера'
    });
  }
});

/**
 * 📊 GET общая статистика реферальной системы (ADMIN)
 * GET /api/v1/admin/referral/global-stats
 */
router.get('/api/v1/admin/referral/global-stats', authenticateToken, async (req, res) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isAdmin: true }
    });

    if (!admin?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещён'
      });
    }

    // Общая статистика
    const totalReferrals = await prisma.user.count({
      where: { referredById: { not: null } }
    });

    const totalWorkers = await prisma.user.count({
      where: { referrerType: 'WORKER' }
    });

    const totalReferrers = await prisma.user.count({
      where: {
        referrals: { some: {} }
      }
    });

    const statsAgg = await prisma.referralStats.aggregate({
      _sum: {
        totalTurnover: true,
        totalCommissionPaid: true,
        totalLosses: true
      }
    });

    const activeBonuses = await prisma.userBonus.count({
      where: {
        isActive: true,
        isCompleted: false
      }
    });

    res.json({
      success: true,
      data: {
        totalReferrals,
        totalReferrers,
        totalWorkers,
        activeBonuses,
        totalTurnover: parseFloat(statsAgg._sum.totalTurnover?.toString() || '0'),
        totalCommissionPaid: parseFloat(statsAgg._sum.totalCommissionPaid?.toString() || '0'),
        totalLosses: parseFloat(statsAgg._sum.totalLosses?.toString() || '0')
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики'
    });
  }
});

/**
 * 🔄 POST принудительно выплатить все комиссии (ADMIN)
 * POST /api/v1/admin/referral/payout-all
 */
router.post('/api/v1/admin/referral/payout-all', authenticateToken, async (req, res) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isAdmin: true }
    });

    if (!admin?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещён'
      });
    }

    const result = await referralService.processAllPendingCommissions();

    res.json({
      success: true,
      message: `Обработано ${result.processed} записей, выплачено ${result.totalPaid}`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка массовой выплаты'
    });
  }
});

module.exports = router;

