// src/routes/referralRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * GET /api/v1/referral/stats
 * Получить статистику реферальной программы пользователя
 * 
 * Возвращает:
 * - totalInvited: количество приглашенных пользователей
 * - pendingBonus: количество ожидающих бонусов
 * - totalCommission: общая сумма комиссий
 * - referralCode: реферальный код пользователя
 * - referralLink: реферальная ссылка
 * - recentReferrals: список недавних рефералов (до 10)
 */
router.get('/api/v1/referral/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Получаем пользователя с его реферальным кодом
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCode: true,
        username: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // 2. Получаем всех рефералов пользователя
    const referrals = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Получаем все реферальные комиссии для этого пользователя
    const referralTransactions = await prisma.referralTransaction.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        amount: true,
        eventType: true,
        createdAt: true,
      },
    });

    // 4. Подсчитываем статистику
    const totalInvited = referrals.length;

    // Считаем ожидающие бонусы (для упрощения - берем последние комиссии за последние 30 дней)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCommissions = referralTransactions.filter(
      (tx) => new Date(tx.createdAt) > thirtyDaysAgo
    );
    const pendingBonus = recentCommissions.length;

    // Суммируем все комиссии
    const totalCommission = referralTransactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount.toString()),
      0
    );

    // 5. Формируем список недавних рефералов с их статусом активности
    const recentReferrals = referrals.slice(0, 10).map((ref) => {
      const referralDate = new Date(ref.createdAt);
      
      // Форматируем дату как DD.MM.YYYY
      const day = String(referralDate.getDate()).padStart(2, '0');
      const month = String(referralDate.getMonth() + 1).padStart(2, '0');
      const year = referralDate.getFullYear();
      const formattedDate = `${day}.${month}.${year}`;

      // Проверяем активность: если есть ставки за последние 30 дней = активен
      const isActive = new Date(ref.createdAt) > thirtyDaysAgo;

      return {
        id: ref.id.toString(),
        username: ref.username || `User_${ref.id}`,
        date: formattedDate,
        status: isActive ? 'active' : 'pending',
      };
    });

    // 6. Формируем реферальную ссылку
    const baseUrl = process.env.FRONTEND_URL || 'https://game-portal.com';
    const referralLink = `${baseUrl}/ref/${user.referralCode}`;

    // 7. Возвращаем ответ в формате страницы
    res.json({
      success: true,
      data: {
        totalInvited,
        pendingBonus,
        totalCommission: parseFloat(totalCommission.toFixed(2)),
        referralCode: user.referralCode,
        referralLink,
        recentReferrals,
        currency: 'USDT', // Можно сделать динамическим
      },
    });

    console.log(`✅ Referral stats fetched for user ${userId}`);
  } catch (error) {
    console.error('❌ Error fetching referral stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/referral/history
 * Получить историю реферальных комиссий с пагинацией
 */
router.get('/api/v1/referral/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.referralTransaction.findMany({
        where: { referrerId: userId },
        include: {
          referee: {
            select: {
              id: true,
              username: true,
            },
          },
          token: {
            select: {
              symbol: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.referralTransaction.count({
        where: { referrerId: userId },
      }),
    ]);

    const history = transactions.map((tx) => ({
      id: tx.id.toString(),
      refereeUsername: tx.referee.username || `User_${tx.referee.id}`,
      eventType: tx.eventType,
      amount: parseFloat(tx.amount.toString()),
      token: tx.token.symbol,
      date: tx.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

    console.log(`✅ Referral history fetched for user ${userId}`);
  } catch (error) {
    console.error('❌ Error fetching referral history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/v1/referral/claim-bonus
 * Использовать реферальные бонусы
 */
router.post('/api/v1/referral/claim-bonus', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        error: 'Token ID is required',
      });
    }

    // Получаем все ожидающие комиссии для пользователя по этому токену
    const pendingCommissions = await prisma.referralTransaction.findMany({
      where: {
        referrerId: userId,
        tokenId: parseInt(tokenId),
      },
      select: {
        id: true,
        amount: true,
      },
    });

    if (pendingCommissions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No pending bonuses available',
      });
    }

    // Суммируем все комиссии
    const totalAmount = pendingCommissions.reduce(
      (sum, comm) => sum + parseFloat(comm.amount.toString()),
      0
    );

    // Получаем или создаем BONUS баланс
    let balance = await prisma.balance.findUnique({
      where: {
        userId_tokenId_type: {
          userId,
          tokenId: parseInt(tokenId),
          type: 'BONUS',
        },
      },
    });

    if (!balance) {
      balance = await prisma.balance.create({
        data: {
          userId,
          tokenId: parseInt(tokenId),
          type: 'BONUS',
          amount: totalAmount,
        },
      });
    } else {
      balance = await prisma.balance.update({
        where: { id: balance.id },
        data: {
          amount: {
            increment: totalAmount,
          },
        },
      });
    }

    res.json({
      success: true,
      data: {
        claimedAmount: totalAmount,
        newBalance: parseFloat(balance.amount.toString()),
        message: 'Bonus claimed successfully',
      },
    });

    console.log(
      `✅ User ${userId} claimed ${totalAmount} bonus for token ${tokenId}`
    );
  } catch (error) {
    console.error('❌ Error claiming bonus:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/referral/referee/:refereeId
 * Получить информацию о конкретном реферале
 */
router.get('/api/v1/referral/referee/:refereeId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const refereeId = parseInt(req.params.refereeId);

    // Проверяем, что реферал действительно приглашен текущим пользователем
    const referee = await prisma.user.findUnique({
      where: { id: refereeId },
      select: {
        id: true,
        username: true,
        firstName: true,
        createdAt: true,
        referredById: true,
      },
    });

    if (!referee || referee.referredById !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Referee not found or not your referral',
      });
    }

    // Получаем все комиссии от этого реферала
    const commissions = await prisma.referralTransaction.findMany({
      where: {
        referrerId: userId,
        refereeId: refereeId,
      },
      include: {
        token: true,
      },
    });

    // Получаем статистику ставок реферала
    const betStats = await prisma.bet.aggregate({
      where: { userId: refereeId },
      _sum: {
        betAmount: true,
        payoutAmount: true,
        netAmount: true,
      },
      _count: true,
    });

    const totalCommissionAmount = commissions.reduce(
      (sum, comm) => sum + parseFloat(comm.amount.toString()),
      0
    );

    res.json({
      success: true,
      data: {
        refereeId: referee.id.toString(),
        username: referee.username || `User_${referee.id}`,
        firstName: referee.firstName,
        joinedDate: referee.createdAt.toISOString(),
        totalCommissions: parseFloat(totalCommissionAmount.toFixed(2)),
        refereeStats: {
          totalBets: betStats._count,
          totalWagered: parseFloat(betStats._sum.betAmount?.toString() || '0'),
          totalWon: parseFloat(betStats._sum.payoutAmount?.toString() || '0'),
          netProfit: parseFloat(betStats._sum.netAmount?.toString() || '0'),
        },
        commissionDetails: commissions.map((comm) => ({
          id: comm.id.toString(),
          type: comm.eventType,
          amount: parseFloat(comm.amount.toString()),
          token: comm.token.symbol,
          date: comm.createdAt.toISOString(),
        })),
      },
    });

    console.log(`✅ Referee info fetched for user ${userId}, referee ${refereeId}`);
  } catch (error) {
    console.error('❌ Error fetching referee info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;