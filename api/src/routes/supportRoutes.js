const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const { authenticateToken } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const telegramBot = require('../bots/telegramBot');

// ====================================================
// 1. GET ALL TICKETS FOR USER
// ====================================================
router.get('/my-tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Get last message for preview
        }
      }
    });

    res.json(tickets);
  } catch (error) {
    logger.error('SUPPORT', 'Error fetching tickets', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ====================================================
// 2. GET SINGLE TICKET DETAILS
// ====================================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const ticketId = parseInt(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(ticket);
  } catch (error) {
    logger.error('SUPPORT', 'Error fetching ticket details', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
});

// ====================================================
// 3. CREATE NEW TICKET
// ====================================================
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        status: 'OPEN',
        messages: {
          create: {
            sender: 'USER',
            text: message
          }
        }
      }
    });

    // Notify Admins via Telegram
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const admins = await prisma.user.findMany({ where: { isAdmin: true } });
      
      for (const admin of admins) {
        if (admin.telegramId) {
          try {
            // Экранирование спецсимволов для MarkdownV2 (если используется) или просто Markdown
            // Для обычного Markdown экранирование менее строгое, но _ * ` [ ] ( ) нужно экранировать
            // В данном случае используем HTML для надежности или убираем parse_mode если не уверены
            
            const dateJoined = new Date(user.createdAt).toLocaleDateString('ru-RU');
            
            await telegramBot.botInstance.telegram.sendMessage(
              admin.telegramId,
              `🎫 *НОВЫЙ ТИКЕТ #${ticket.id}*\n\n` +
              `👤 Пользователь: ${user.username || 'No username'} (ID: ${userId})\n` +
              `📅 Регистрация: ${dateJoined}\n` +
              `📝 Тема: ${subject}\n\n` +
              `💬 Сообщение:\n${message}`,
              {
                // parse_mode: 'Markdown', 
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: `✍️ Ответить`, callback_data: `reply_ticket_${ticket.id}` },
                      { text: `🔒 Закрыть`, callback_data: `close_ticket_${ticket.id}` }
                    ]
                  ]
                }
              }
            );
          } catch (sendError) {
             logger.warn('SUPPORT', `Failed to send to admin ${admin.id}`, { error: sendError.message });
          }
        }
      }
    } catch (notifyError) {
      logger.warn('SUPPORT', 'Failed to notify admins', { error: notifyError.message });
    }

    res.status(201).json(ticket);
  } catch (error) {
    logger.error('SUPPORT', 'Error creating ticket', { error: error.message });
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// ====================================================
// 4. REPLY TO TICKET (USER)
// ====================================================
router.post('/:id/reply', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const ticketId = parseInt(req.params.id);
    const { message } = req.body;

    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add message
    const newMessage = await prisma.supportMessage.create({
      data: {
        ticketId,
        sender: 'USER',
        text: message
      }
    });

    // Update ticket status to OPEN if it was closed/answered
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'OPEN' }
    });

    // Notify Admins
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const admins = await prisma.user.findMany({ where: { isAdmin: true } });
      
      for (const admin of admins) {
        if (admin.telegramId) {
          try {
            const dateJoined = new Date(user.createdAt).toLocaleDateString('ru-RU');

            await telegramBot.botInstance.telegram.sendMessage(
              admin.telegramId,
              `💬 *НОВОЕ СООБЩЕНИЕ В ТИКЕТЕ #${ticketId}*\n\n` +
              `👤 Пользователь: ${user.username || 'No username'} (ID: ${userId})\n` +
              `📅 Регистрация: ${dateJoined}\n` +
              `📝 Сообщение:\n${message}`,
              {
                // parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: `✍️ Ответить`, callback_data: `reply_ticket_${ticketId}` },
                      { text: `🔒 Закрыть`, callback_data: `close_ticket_${ticketId}` }
                    ]
                  ]
                }
              }
            );
          } catch (sendError) {
             logger.warn('SUPPORT', `Failed to send reply notification to admin ${admin.id}`, { error: sendError.message });
          }
        }
      }
    } catch (notifyError) {
        // ignore
    }

    res.json(newMessage);
  } catch (error) {
    logger.error('SUPPORT', 'Error replying to ticket', { error: error.message });
    res.status(500).json({ error: 'Failed to reply' });
  }
});

module.exports = router;

