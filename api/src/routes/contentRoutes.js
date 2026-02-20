const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const logger = require('../utils/logger');

// Get Active Banners (Public)
router.get('/banners', async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
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
    res.json({ success: true, data: banners });
  } catch (error) {
    logger.error('CONTENT', 'Error fetching banners', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch banners' });
  }
});

module.exports = router;

