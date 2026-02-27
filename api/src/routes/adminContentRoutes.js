const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../../prismaClient');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// ====================================================
// FILE UPLOAD CONFIG
// ====================================================
const uploadsDir = path.join(__dirname, '../../uploads/banners');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `banner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения (jpg, png, gif, webp, svg)'));
    }
  }
});

// Upload Banner Image
router.post('/upload-banner-image', authenticateToken, isAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }
    const imageUrl = `/uploads/banners/${req.file.filename}`;
    res.json({ success: true, data: { imageUrl } });
  } catch (error) {
    logger.error('ADMIN', 'Error uploading banner image', { error: error.message });
    res.status(500).json({ success: false, error: 'Ошибка загрузки файла' });
  }
});

// ====================================================
// BANNER MANAGEMENT
// ====================================================

// Create Banner
router.post('/banners', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { imageUrl, title, text, buttonText, linkUrl, actionType, bonusId, isActive, priority } = req.body;

    // Баннер должен иметь либо картинку, либо текст
    if (!imageUrl && !title && !text) {
      return res.status(400).json({ success: false, error: 'Баннер должен содержать изображение или текст' });
    }

    const banner = await prisma.banner.create({
      data: {
        imageUrl: imageUrl || '',
        title: title || null,
        text: text || null,
        buttonText: buttonText || null,
        linkUrl: linkUrl || null,
        actionType: actionType || 'NONE', // 'LINK', 'BONUS', 'NONE', 'DAILY_CASE'
        bonusId: (actionType === 'BONUS' && bonusId) ? parseInt(bonusId) : null,
        isActive: isActive !== undefined ? isActive : true,
        priority: priority ? parseInt(priority) : 0
      },
      include: {
        bonus: {
          select: {
            id: true,
            code: true,
            name: true,
            percentage: true,
            wagerMultiplier: true
          }
        }
      }
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    logger.error('ADMIN', 'Error creating banner', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create banner' });
  }
});

// Update Banner Priorities (Reordering)
router.put('/banners/reorder', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { bannerIds } = req.body; // Array of IDs in new order

    if (!Array.isArray(bannerIds)) {
      return res.status(400).json({ success: false, error: 'bannerIds must be an array' });
    }

    // Use a transaction to update all priorities
    await prisma.$transaction(
      bannerIds.map((id, index) => 
        prisma.banner.update({
          where: { id: parseInt(id) },
          data: { priority: bannerIds.length - index } // Higher priority first
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('ADMIN', 'Error reordering banners', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to reorder banners' });
  }
});

// Update Banner
router.put('/banners/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Clean up data
    if (data.bonusId) data.bonusId = parseInt(data.bonusId);
    if (data.priority) data.priority = parseInt(data.priority);

    const banner = await prisma.banner.update({
      where: { id: parseInt(id) },
      data,
      include: {
        bonus: {
          select: {
            id: true,
            code: true,
            name: true,
            percentage: true,
            wagerMultiplier: true
          }
        }
      }
    });

    res.json({ success: true, data: banner });
  } catch (error) {
    logger.error('ADMIN', 'Error updating banner', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update banner' });
  }
});

// Delete Banner
router.delete('/banners/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.banner.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    logger.error('ADMIN', 'Error deleting banner', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to delete banner' });
  }
});

// Get All Banners (Admin view)
router.get('/banners', authenticateToken, isAdmin, async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { priority: 'desc' },
      include: {
        bonus: {
          select: {
            id: true,
            code: true,
            name: true,
            percentage: true,
            wagerMultiplier: true,
            isFreebet: true,
            freebetAmount: true
          }
        }
      }
    });
    res.json({ success: true, data: banners });
  } catch (error) {
    logger.error('ADMIN', 'Error fetching banners', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch banners' });
  }
});

// ====================================================
// BONUS TEMPLATE MANAGEMENT
// ====================================================

// Create Bonus Template
router.post('/bonuses', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { code, name, description, minDeposit, maxDeposit, percentage, wagerMultiplier, maxUsages, isActive, expiresAt, isFreebet, freebetAmount } = req.body;

    const bonus = await prisma.bonusTemplate.create({
      data: {
        code: code.toUpperCase().trim(),
        name,
        description: description || null,
        isFreebet: isFreebet === true,
        freebetAmount: isFreebet && freebetAmount ? parseFloat(freebetAmount) : null,
        minDeposit: isFreebet ? 0 : (minDeposit || 0),
        maxDeposit: isFreebet ? null : (maxDeposit || null),
        percentage: isFreebet ? 0 : (parseInt(percentage) || 100),
        wagerMultiplier: (wagerMultiplier !== undefined && wagerMultiplier !== '' && !isNaN(Number(wagerMultiplier))) ? parseInt(wagerMultiplier) : 10,
        maxUsages: maxUsages ? parseInt(maxUsages) : null,
        isActive: isActive !== undefined ? isActive : true,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    res.status(201).json({ success: true, data: bonus });
  } catch (error) {
    logger.error('ADMIN', 'Error creating bonus template', { error: error.message });
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Промокод с таким кодом уже существует' });
    }
    res.status(500).json({ success: false, error: 'Failed to create bonus template' });
  }
});

// Update Bonus Template
router.put('/bonuses/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    if (data.percentage !== undefined) data.percentage = parseInt(data.percentage);
    if (data.wagerMultiplier !== undefined) data.wagerMultiplier = isNaN(Number(data.wagerMultiplier)) ? 10 : parseInt(data.wagerMultiplier);
    if (data.maxUsages !== undefined) data.maxUsages = data.maxUsages ? parseInt(data.maxUsages) : null;
    if (data.expiresAt !== undefined) data.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.code) data.code = data.code.toUpperCase().trim();
    if (data.isFreebet !== undefined) data.isFreebet = data.isFreebet === true;
    if (data.freebetAmount !== undefined) {
      data.freebetAmount = data.freebetAmount ? parseFloat(data.freebetAmount) : null;
    }
    
    // Если это фрибет, обнуляем поля депозита
    if (data.isFreebet === true) {
      data.minDeposit = 0;
      data.maxDeposit = null;
      data.percentage = 0;
    }
    // Если это обычный бонус, обнуляем фрибет
    if (data.isFreebet === false) {
      data.freebetAmount = null;
    }

    const bonus = await prisma.bonusTemplate.update({
      where: { id: parseInt(id) },
      data
    });

    res.json({ success: true, data: bonus });
  } catch (error) {
    logger.error('ADMIN', 'Error updating bonus template', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update bonus template' });
  }
});

// Delete Bonus Template
router.delete('/bonuses/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.bonusTemplate.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    logger.error('ADMIN', 'Error deleting bonus template', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to delete bonus template' });
  }
});

// Get All Bonus Templates (admin — includes usage stats)
router.get('/bonuses', authenticateToken, isAdmin, async (req, res) => {
  try {
    const bonuses = await prisma.bonusTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { usages: true } }
      }
    });
    res.json({ success: true, data: bonuses });
  } catch (error) {
    logger.error('ADMIN', 'Error fetching bonus templates', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch bonus templates' });
  }
});

// ====================================================
// DAILY CASE REWARDS (Ежедневный бесплатный кейс)
// ====================================================

router.get('/daily-case/rewards', authenticateToken, isAdmin, async (req, res) => {
  try {
    const rewards = await prisma.dailyCaseReward.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        token: { select: { id: true, symbol: true, name: true } },
        bonusTemplate: { select: { id: true, code: true, name: true, percentage: true, wagerMultiplier: true, isFreebet: true, freebetAmount: true } },
      },
    });
    res.json({ success: true, data: rewards });
  } catch (error) {
    logger.error('ADMIN', 'Error fetching daily case rewards', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch rewards' });
  }
});

router.post('/daily-case/rewards', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rewardType, label, dropWeight, sortOrder, isActive, amount, tokenId, bonusTemplateId } = req.body;

    if (!rewardType || !label) {
      return res.status(400).json({ success: false, error: 'Укажите тип награды и название' });
    }

    if (rewardType !== 'BALANCE_TOPUP' && rewardType !== 'DEPOSIT_BONUS') {
      return res.status(400).json({ success: false, error: 'Тип награды: BALANCE_TOPUP или DEPOSIT_BONUS' });
    }

    if (rewardType === 'BALANCE_TOPUP' && (!amount || parseFloat(amount) <= 0)) {
      return res.status(400).json({ success: false, error: 'Укажите сумму пополнения на счёт' });
    }

    if (rewardType === 'DEPOSIT_BONUS' && !bonusTemplateId) {
      return res.status(400).json({ success: false, error: 'Укажите промокод (бонус к пополнению)' });
    }

    const reward = await prisma.dailyCaseReward.create({
      data: {
        rewardType,
        label: String(label).trim(),
        dropWeight: Math.max(0, parseInt(dropWeight) || 10),
        sortOrder: parseInt(sortOrder) || 0,
        isActive: isActive !== false,
        amount: rewardType === 'BALANCE_TOPUP' && amount ? parseFloat(amount) : null,
        tokenId: tokenId ? parseInt(tokenId) : null,
        bonusTemplateId: rewardType === 'DEPOSIT_BONUS' && bonusTemplateId ? parseInt(bonusTemplateId) : null,
      },
      include: {
        token: { select: { id: true, symbol: true } },
        bonusTemplate: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: reward });
  } catch (error) {
    logger.error('ADMIN', 'Error creating daily case reward', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create reward' });
  }
});

router.put('/daily-case/rewards/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;

    const data = {};
    if (body.rewardType !== undefined) data.rewardType = body.rewardType;
    if (body.label !== undefined) data.label = String(body.label).trim();
    if (body.dropWeight !== undefined) data.dropWeight = Math.max(0, parseInt(body.dropWeight) || 0);
    if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder) || 0;
    if (body.isActive !== undefined) data.isActive = body.isActive !== false;
    if (body.amount !== undefined) data.amount = body.amount ? parseFloat(body.amount) : null;
    if (body.tokenId !== undefined) data.tokenId = body.tokenId ? parseInt(body.tokenId) : null;
    if (body.bonusTemplateId !== undefined) data.bonusTemplateId = body.bonusTemplateId ? parseInt(body.bonusTemplateId) : null;

    const reward = await prisma.dailyCaseReward.update({
      where: { id },
      data,
      include: {
        token: { select: { id: true, symbol: true } },
        bonusTemplate: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ success: true, data: reward });
  } catch (error) {
    logger.error('ADMIN', 'Error updating daily case reward', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update reward' });
  }
});

router.delete('/daily-case/rewards/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.dailyCaseReward.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('ADMIN', 'Error deleting daily case reward', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to delete reward' });
  }
});

module.exports = router;

