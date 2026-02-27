const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/v1/daily-case/status
 * Можно ли открыть кейс и когда следующий раз
 */
router.get('/api/v1/daily-case/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const lastClaim = await prisma.userDailyCaseClaim.findFirst({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
    });

    const now = Date.now();
    const lastAt = lastClaim ? new Date(lastClaim.claimedAt).getTime() : 0;
    const canClaim = now - lastAt >= ONE_DAY_MS;
    const nextAt = lastAt ? new Date(lastAt + ONE_DAY_MS) : null;

    const activeCount = await prisma.dailyCaseReward.count({
      where: { isActive: true },
    });

    res.json({
      success: true,
      data: {
        canClaim,
        nextAt: nextAt ? nextAt.toISOString() : null,
        hasRewards: activeCount > 0,
      },
    });
  } catch (error) {
    logger.error('DAILY_CASE', 'Error getting status', { error: error.message });
    res.status(500).json({ success: false, error: 'Ошибка получения статуса' });
  }
});

/**
 * POST /api/v1/daily-case/open
 * Открыть ежедневный кейс (раз в 24ч), выпадение по весам, начисление награды
 */
router.post('/api/v1/daily-case/open', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const lastClaim = await prisma.userDailyCaseClaim.findFirst({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
    });

    const now = Date.now();
    const lastAt = lastClaim ? new Date(lastClaim.claimedAt).getTime() : 0;
    if (now - lastAt < ONE_DAY_MS) {
      const nextAt = new Date(lastAt + ONE_DAY_MS);
      return res.status(400).json({
        success: false,
        error: 'Кейс уже открыт сегодня',
        nextAt: nextAt.toISOString(),
      });
    }

    const rewards = await prisma.dailyCaseReward.findMany({
      where: { isActive: true },
      include: {
        token: { select: { id: true, symbol: true } },
        bonusTemplate: { select: { id: true, code: true, name: true, percentage: true, wagerMultiplier: true, isFreebet: true, freebetAmount: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (rewards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Нет доступных наград. Обратитесь к администратору.',
      });
    }

    const totalWeight = rewards.reduce((s, r) => s + Math.max(0, r.dropWeight), 0);
    if (totalWeight <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Настройки наград не заданы.',
      });
    }

    let rnd = Math.random() * totalWeight;
    let chosen = rewards[0];
    for (const r of rewards) {
      const w = Math.max(0, r.dropWeight);
      if (rnd < w) {
        chosen = r;
        break;
      }
      rnd -= w;
    }

    const defaultToken = await prisma.cryptoToken.findFirst({
      where: { symbol: 'USDT' },
    });
    const tokenId = chosen.tokenId || (defaultToken && defaultToken.id);

    await prisma.$transaction(async (tx) => {
      if (chosen.rewardType === 'BALANCE_TOPUP' && chosen.amount && parseFloat(chosen.amount.toString()) > 0) {
        const amount = parseFloat(chosen.amount.toString());
        const tid = chosen.tokenId || defaultToken?.id;
        if (!tid) throw new Error('Токен не найден');
        await tx.balance.upsert({
          where: { userId_tokenId_type: { userId, tokenId: tid, type: 'MAIN' } },
          create: { userId, tokenId: tid, type: 'MAIN', amount: amount.toFixed(18) },
          update: { amount: { increment: amount } },
        });
        await tx.transaction.create({
          data: {
            userId,
            tokenId: tid,
            type: 'BONUS',
            status: 'COMPLETED',
            amount: amount.toFixed(18),
          },
        });
      } else if (chosen.rewardType === 'DEPOSIT_BONUS' && chosen.bonusTemplateId) {
        const promo = await tx.bonusTemplate.findUnique({
          where: { id: chosen.bonusTemplateId },
        });
        if (promo && promo.isActive) {
          const tid = tokenId || defaultToken?.id;
          if (!tid) throw new Error('Токен не найден');
          const bonusAmount = promo.isFreebet && promo.freebetAmount
            ? parseFloat(promo.freebetAmount.toString())
            : (promo.percentage && promo.minDeposit ? 0 : parseFloat((promo.freebetAmount || 0).toString()));
          if (bonusAmount <= 0) throw new Error('Сумма бонуса не задана в шаблоне');

          // Бонус без отыгрыша: только пополнение бонусного баланса, без UserBonus и PromoUsage
          await tx.balance.upsert({
            where: { userId_tokenId_type: { userId, tokenId: tid, type: 'BONUS' } },
            create: { userId, tokenId: tid, type: 'BONUS', amount: bonusAmount.toFixed(18) },
            update: { amount: { increment: bonusAmount } },
          });
          await tx.transaction.create({
            data: {
              userId,
              tokenId: tid,
              type: 'BONUS',
              status: 'COMPLETED',
              amount: bonusAmount.toFixed(18),
            },
          });
        }
      }

      await tx.userDailyCaseClaim.create({
        data: { userId, rewardId: chosen.id },
      });
    });

    const rewardPayload = {
      id: chosen.id,
      rewardType: chosen.rewardType,
      label: chosen.label,
      amount: chosen.amount ? parseFloat(chosen.amount.toString()) : null,
      symbol: chosen.token?.symbol || (defaultToken && defaultToken.symbol) || 'USDT',
      bonus: chosen.bonusTemplate ? {
        code: chosen.bonusTemplate.code,
        name: chosen.bonusTemplate.name,
        percentage: chosen.bonusTemplate.percentage,
        isFreebet: chosen.bonusTemplate.isFreebet,
        freebetAmount: chosen.bonusTemplate.freebetAmount ? parseFloat(chosen.bonusTemplate.freebetAmount.toString()) : null,
      } : null,
    };

    logger.info('DAILY_CASE', 'Claimed', { userId, rewardId: chosen.id, rewardType: chosen.rewardType });

    res.json({
      success: true,
      data: { reward: rewardPayload },
    });
  } catch (error) {
    logger.error('DAILY_CASE', 'Error opening case', { error: error.message });
    res.status(500).json({ success: false, error: 'Ошибка открытия кейса' });
  }
});

module.exports = router;
