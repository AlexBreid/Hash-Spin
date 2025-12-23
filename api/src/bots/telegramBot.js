/**
 * ✅ ПОЛНЫЙ TELEGRAM БОТ - АДМИН ПАНЕЛЬ ИСПРАВЛЕНА НА РУССКОМ
 * МЕНЮ ОЧИЩЕНО: УДАЛЕНЫ КНОПКИ ПРОФИЛЬ, РЕФЕРАЛЫ, ПОМОЩЬ
 * 
 * ЗАМЕНИ src/bots/telegramBot.js
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const prisma = require('../../prismaClient');
const { registerNewUser, generateOneTimeToken } = require('../services/authService');
const referralService = require('../services/ReferralService');
const validators = require('../utils/validators');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const withdrawalService = require('../services/withdrawalService');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL;
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;
const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';
const WELCOME_IMAGE_PATH = path.join(__dirname, '../../assets/photo_2025-12-04_19-25-39.jpg');

// ════════════════════════════════════════════════════════════════════════════════
// ⭐ ФУНКЦИИ ЭКРАНИРОВАНИЯ MARKDOWN
// ════════════════════════════════════════════════════════════════════════════════

function escapeMarkdownV2(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\\_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function escapeMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/[*_`[]/g, '\\$&');
}

// 🎁 FAQ DATA
const faqData = [
  {
    question: "Как играть в Сапёр?",
    answer: "Цель игры - найти все мины на игровом поле, не наступив на них. Нажимайте на клетки, чтобы открыть их. Числа показывают количество мин в соседних клетках."
  },
  {
    question: "Что такое игра Краш?",
    answer: "Краш - это игра на удачу, где нужно вовремя забрать выигрыш до того, как график упадёт. Чем дольше ждёте, тем больше множитель, но и больше риск."
  },
  {
    question: "Как вывести деньги?",
    answer: "Перейди в бота, нажми Вывести, выбери сумму и подтверди операцию. Средства будут отправлены прямо на твой кошелёк."
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// 🎁 ФУНКЦИИ РЕФЕРАЛКИ
// ════════════════════════════════════════════════════════════════════════════════

function parseReferralCode(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const trimmed = payload.trim();
  if (trimmed.startsWith('ref_')) {
    return trimmed.substring(4).trim();
  }
  if (trimmed.length > 0 && trimmed.length <= 50) {
    return trimmed;
  }
  return null;
}

function generateReferralLink(botUsername, referralCode) {
  return `https://t.me/${botUsername}?start=ref_${referralCode}`;
}

async function applyReferrer(newUserId, referralCode) {
  try {
    if (!referralCode || typeof referralCode !== 'string') {
      return { success: false, reason: 'Invalid referral code format' };
    }

    console.log(`[REFERRAL] 🔍 Searching for referrer with code: ${referralCode}`);

    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, username: true, telegramId: true }
    });

    if (!referrer) {
      console.log(`[REFERRAL] ❌ Referrer not found with code: ${referralCode}`);
      return { success: false, reason: 'Referrer not found' };
    }

    if (referrer.id === newUserId) {
      console.log(`[REFERRAL] ⚠️ User tried to refer himself`);
      return { success: false, reason: 'Cannot refer yourself' };
    }

    await prisma.user.update({
      where: { id: newUserId },
      data: { referredById: referrer.id }
    });

    console.log(`[REFERRAL] ✅ Successfully applied referrer ${referrer.id} to user ${newUserId}`);
    logger.info('REFERRAL', 'Referrer applied to new user', {
      newUserId,
      referrerId: referrer.id,
      referrerUsername: referrer.username
    });

    return {
      success: true,
      referrerId: referrer.id,
      referrerUsername: referrer.username,
      referrerTelegramId: referrer.telegramId
    };

  } catch (error) {
    console.error(`[REFERRAL] ❌ Error applying referrer: ${error.message}`);
    logger.error('REFERRAL', 'Error applying referrer', {
      newUserId,
      referralCode,
      error: error.message
    });
    return { success: false, reason: error.message };
  }
}

async function notifyReferrerAboutNewReferee(bot, referrerTelegramId, newUserUsername) {
  try {
    const userDisplay = newUserUsername ? `@${newUserUsername}` : 'новый пользователь';
    await bot.telegram.sendMessage(
      referrerTelegramId,
      `🎉 *Новый реферал!*\n\n` +
      `👤 ${escapeMarkdown(userDisplay)} присоединился к вашей сети!\n\n` +
      `💰 Когда он пополнит счёт - вы получите комиссию.`,
      { parse_mode: 'Markdown' }
    );
    console.log(`[REFERRAL] ✅ Notification sent to referrer ${referrerTelegramId}`);
  } catch (error) {
    console.warn(`[REFERRAL] ⚠️ Failed to notify referrer: ${error.message}`);
  }
}

// ====================================
// СОСТОЯНИЯ (Maps)
// ====================================

const waitingForDeposit = new Map();
const waitingForWithdrawAmount = new Map();
const waitingForTicketMessage = new Map();
const supportTickets = new Map();
const adminWaitingForReply = new Map();

function setStateTimeout(map, userId, timeoutMs = 10 * 60 * 1000) {
  setTimeout(() => {
    if (map.has(userId)) {
      map.delete(userId);
      logger.debug('BOT', `Cleaned up state for user ${userId}`);
    }
  }, timeoutMs);
}

function generateTicketId() {
  return 'TK-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

if (!BOT_TOKEN) {
  logger.error('BOT', 'TELEGRAM_BOT_TOKEN is not set');
  module.exports = { start: () => {} };
} else {
  const bot = new Telegraf(BOT_TOKEN);

  // ====================================
  // КЛАВИАТУРЫ
  // ====================================

  const getMainMenuKeyboard = (isAdmin = false) => {
    const baseButtons = [
      [{ text: '🎰 Казино' }],
      [{ text: '💰 Пополнить' }, { text: '💸 Вывести' }],
      [{ text: '📥 Мои выводы' }]
    ];

    if (isAdmin) {
      baseButtons.push([{ text: '⚙️ Админ Панель' }]);
    }

    return {
      reply_markup: {
        keyboard: baseButtons,
        resize_keyboard: true,
        one_time_keyboard: false
      }
    };
  };

  const getBackButton = () => ({
    reply_markup: {
      keyboard: [
        [{ text: '◀️ Назад' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });

  // ====================================
  // CRYPTO PAY API
  // ====================================

  const cryptoPayAPI = {
    async createInvoice(amount, asset, description, userId) {
      try {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) return null;
        if (!validators.validateAsset(asset)) return null;
        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum)) return null;
        
        const response = await axios.post(
          `${CRYPTO_PAY_API}/createInvoice`,
          {
            asset: String(asset),
            amount: amountNum.toFixed(8).toString(),
            description: String(description),
            payload: userIdNum.toString(),
            allow_comments: false,
            allow_anonymous: false
          },
          {
            headers: {
              'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.ok) {
          logger.info('BOT', `Invoice created`, { 
            invoiceId: response.data.result.invoice_id, 
            amount: amountNum.toFixed(8) 
          });
          return response.data.result;
        }
        return null;
      } catch (error) {
        logger.error('BOT', `Error creating invoice`, { error: error.message });
        return null;
      }
    },

    async getInvoices(invoiceIds) {
      try {
        const response = await axios.get(
          `${CRYPTO_PAY_API}/getInvoices`,
          {
            headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN },
            params: { invoiceIds: invoiceIds.join(',') }
          }
        );
        return response.data.ok ? response.data.result : null;
      } catch (error) {
        logger.error('BOT', `Error getting invoices`, { error: error.message });
        return null;
      }
    }
  };

  // ====================================
  // HELPER ФУНКЦИИ
  // ====================================

  async function getUserBalance(userId, tokenSymbol = 'USDT') {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || !validators.validateUserId(userIdNum)) return 0;
      
      const balance = await prisma.balance.findFirst({
        where: { userId: userIdNum, token: { symbol: tokenSymbol }, type: 'MAIN' }
      });
      
      return balance ? parseFloat(balance.amount.toString()) : 0;
    } catch (error) {
      logger.error('BOT', `Error getting user balance`, { error: error.message });
      return 0;
    }
  }

  // ====================================
  // ПРОВЕРКА ПЛАТЕЖЕЙ
  // ====================================

  async function scheduleDepositCheck(bot, userId, invoiceId, amount, asset = 'USDT', withBonus = false) {
    console.log(`\n📋 [DEPOSIT CHECK] Starting for user ${userId}, invoice ${invoiceId}, amount ${amount}, bonus ${withBonus}`);
    
    try {
      if (!userId || !invoiceId || !amount || !asset) {
        console.error(`❌ Missing parameters`);
        return;
      }

      const userIdNum = parseInt(String(userId).trim());
      const invoiceIdNum = parseInt(String(invoiceId).trim());
      const amountNum = parseFloat(String(amount).trim());

      if (isNaN(userIdNum) || isNaN(invoiceIdNum) || isNaN(amountNum)) {
        console.error(`❌ Invalid parameter conversion`);
        return;
      }

      const assetStr = String(asset).toUpperCase().trim();

      try {
        await prisma.pendingDeposit.upsert({
          where: { invoiceId: invoiceIdNum.toString() },
          create: {
            userId: userIdNum,
            invoiceId: invoiceIdNum.toString(),
            amount: amountNum,
            asset: assetStr,
            status: 'pending',
            withBonus: withBonus,
            createdAt: new Date()
          },
          update: { updatedAt: new Date(), status: 'pending', withBonus: withBonus }
        });
        console.log(`✅ Saved to DB`);
      } catch (dbError) {
        console.error(`❌ Database error: ${dbError.message}`);
      }

      let checkCount = 0;
      const maxChecks = 12;
      const checkInterval = 30 * 1000;

      const checkDeposit = async () => {
        checkCount++;
        try {
          console.log(`🔍 [CHECK #${checkCount}/${maxChecks}]`);

          const response = await axios.get(`${CRYPTO_PAY_API}/getInvoices`, {
            headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN },
            params: { invoiceIds: invoiceIdNum.toString() },
            timeout: 5000
          });

          if (!response?.data?.ok || !response.data.result?.items?.length) {
            console.log(`⏳ Invoice not ready yet`);
            if (checkCount < maxChecks) setTimeout(checkDeposit, checkInterval);
            return;
          }

          const invoice = response.data.result.items.find(inv => inv.invoice_id === invoiceIdNum);
          
          if (!invoice) {
            console.log(`⏳ Invoice not found`);
            if (checkCount < maxChecks) setTimeout(checkDeposit, checkInterval);
            return;
          }

          const invoiceAmount = parseFloat(String(invoice.amount).trim());
          if (invoiceAmount !== amountNum) {
            console.error(`❌ Amount mismatch: expected ${amountNum}, got ${invoiceAmount}`);
            if (checkCount < maxChecks) setTimeout(checkDeposit, checkInterval);
            return;
          }

          const statusLower = String(invoice.status).toLowerCase();
          const isPaid = ['paid', 'completed'].includes(statusLower);

          if (!isPaid) {
            console.log(`⏳ Status: ${invoice.status}`);
            if (checkCount < maxChecks) setTimeout(checkDeposit, checkInterval);
            return;
          }

          console.log(`\n🎉 INVOICE PAID!`);
          
          let token = await prisma.cryptoToken.findUnique({ where: { symbol: assetStr } });
          
          if (!token) {
            token = await prisma.cryptoToken.create({
              data: { symbol: assetStr, name: assetStr, decimals: 8 }
            });
          }
          
          await handleDepositWithToken(token, userIdNum, invoiceIdNum, amountNum, assetStr, bot, withBonus);

        } catch (checkError) {
          console.error(`❌ Check error: ${checkError.message}`);
          if (checkCount < maxChecks) {
            setTimeout(checkDeposit, checkInterval);
          } else {
            await prisma.pendingDeposit.update({
              where: { invoiceId: invoiceIdNum.toString() },
              data: { status: 'failed' }
            }).catch(e => console.warn(`⚠️ Mark failed: ${e.message}`));
          }
        }
      };

      setTimeout(checkDeposit, 5000);
      
    } catch (outerError) {
      console.error(`❌ CRITICAL ERROR: ${outerError.message}`);
      logger.error('BOT', `Critical error scheduling deposit check`, { error: outerError.message });
    }
  }

  // ====================================
  // ОБРАБОТКА ДЕПОЗИТА
  // ====================================

  async function handleDepositWithToken(token, userIdNum, invoiceIdNum, amountNum, asset, bot, bonusWasSelected = false) {
    console.log(`💾 Creating transaction for user ${userIdNum}, amount ${amountNum.toFixed(8)}, bonus ${bonusWasSelected}`);
    
    try {
      const pendingDepositInfo = await prisma.pendingDeposit.findUnique({
        where: { invoiceId: invoiceIdNum.toString() }
      });

      if (!pendingDepositInfo || pendingDepositInfo.userId !== userIdNum) {
        console.error(`❌ SECURITY: Pending deposit mismatch`);
        return;
      }

      const dbAmount = parseFloat(String(pendingDepositInfo.amount).trim());
      if (dbAmount !== amountNum) {
        console.error(`❌ SECURITY: Amount mismatch`);
        return;
      }

      if (pendingDepositInfo.status !== 'pending') {
        console.error(`❌ SECURITY: Invalid deposit status`);
        return;
      }

      console.log(`✅ All validations passed`);
      
      const result = await prisma.$transaction(async (tx) => {
        const freshRecord = await tx.pendingDeposit.findUnique({
          where: { invoiceId: invoiceIdNum.toString() }
        });

        if (freshRecord?.status !== 'pending') {
          throw new Error(`Deposit already processed`);
        }

        await tx.pendingDeposit.update({
          where: { invoiceId: invoiceIdNum.toString() },
          data: { status: 'processing' }
        });

        const newTx = await tx.transaction.create({
          data: {
            userId: userIdNum,
            tokenId: token.id,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            amount: amountNum.toFixed(8),
            txHash: invoiceIdNum.toString(),
            createdAt: new Date()
          }
        });

        const updatedBalance = await tx.balance.upsert({
          where: { userId_tokenId_type: { userId: userIdNum, tokenId: token.id, type: 'MAIN' } },
          create: { userId: userIdNum, tokenId: token.id, type: 'MAIN', amount: amountNum.toFixed(8) },
          update: { amount: { increment: amountNum } }
        });

        return newTx;
      }, { timeout: 30000 });

      console.log(`✅ Transaction completed`);

      if (bonusWasSelected && asset === 'USDT') {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userIdNum },
            select: { referredById: true }
          });
          
          if (user?.referredById) {
            console.log(`\n🎁 Granting bonus`);
            
            const bonusInfo = await referralService.grantDepositBonus(
              userIdNum,
              amountNum,
              token.id,
              user.referredById
            );
            
            if (bonusInfo) {
              console.log(`✅ Bonus granted: ${bonusInfo.bonusAmount}`);
            } else {
              console.log(`⚠️ Bonus not granted (not available)`);
            }
          }
        } catch (bonusError) {
          console.error(`❌ Error granting bonus: ${bonusError.message}`);
        }
      }

      try {
        const user = await prisma.user.findUnique({ 
          where: { id: userIdNum }, 
          select: { telegramId: true } 
        });
        
        if (user?.telegramId) {
          let message;
          
          if (bonusWasSelected) {
            const activeBonus = await prisma.userBonus.findFirst({
              where: {
                userId: userIdNum,
                isActive: true,
                isCompleted: false
              }
            });
            
            if (activeBonus) {
              const depositAmount = parseFloat(amountNum.toFixed(8));
              const bonusAmount = parseFloat(activeBonus.grantedAmount.toString());
              
              message = `✅ *Пополнение с БОНУСОМ успешно!*\n\n` +
                `💰 Пополнено: ${depositAmount.toFixed(8)} ${asset}\n` +
                `🎁 Бонус: +100%\n\n` +
                `⚡ Требуется отыграть: 10x`;
            } else {
              message = `✅ *Пополнение успешно!*\n\n💰 +${amountNum.toFixed(8)} ${asset}\n\nℹ️ Бонус был выбран, но оказался недоступен.`;
            }
          } else {
            message = `✅ *Пополнение успешно!*\n\n💰 +${amountNum.toFixed(8)} ${asset}`;
          }
          
          await bot.telegram.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' });
          console.log(`✅ Notification sent`);
        }
      } catch (e) {
        console.warn(`⚠️ Notification failed: ${e.message}`);
      }

      try {
        await prisma.pendingDeposit.update({ 
          where: { invoiceId: invoiceIdNum.toString() }, 
          data: { status: 'processed' } 
        });
      } catch (e) {
        console.warn(`⚠️ Mark processed: ${e.message}`);
      }

    } catch (error) {
      console.error(`❌ Transaction error: ${error.message}`);
      logger.error('BOT', `Error handling deposit`, { error: error.message });
      
      try {
        await prisma.pendingDeposit.update({ 
          where: { invoiceId: invoiceIdNum.toString() }, 
          data: { status: 'failed' } 
        });
      } catch (e) {
        console.warn(`⚠️ Mark failed: ${e.message}`);
      }
    }
  }

  // ====================================
  // /start КОМАНДА
  // ====================================

  bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();

    try {
      let user = await prisma.user.findUnique({ where: { telegramId } });

      if (user && user.isBlocked) {
        logger.warn('BOT', `Blocked user tried to start bot`, { userId: user.id });
        await ctx.reply('🚫 Ваш аккаунт заблокирован.');
        return;
      }

      let isNewUser = false;
      let rawPassword = null;
      let referralApplied = false;
      let referrerInfo = null;

      const startPayload = ctx.startPayload;
      let referralCode = null;
      
      if (startPayload) {
        referralCode = parseReferralCode(startPayload);
        console.log(`[START] 📋 Parsed referral code: ${referralCode}`);
      }

      if (!user) {
        const { user: newUser, rawPassword: pwd } = await registerNewUser(ctx.from);
        user = newUser;
        rawPassword = pwd;
        isNewUser = true;
        
        console.log(`[START] ✅ New user registered: ${user.id}`);
        logger.info('BOT', `New user registered`, { userId: user.id, telegramId });

        if (referralCode) {
          console.log(`[START] 🎁 Applying referrer with code: ${referralCode}`);
          
          referrerInfo = await applyReferrer(user.id, referralCode);
          
          if (referrerInfo.success) {
            referralApplied = true;
            console.log(`[START] ✅ Referrer applied: ${referrerInfo.referrerId}`);
            logger.info('BOT', `Referral link applied`, {
              newUserId: user.id,
              referrerId: referrerInfo.referrerId
            });
            
            if (referrerInfo.referrerTelegramId) {
              await notifyReferrerAboutNewReferee(
                bot,
                referrerInfo.referrerTelegramId,
                user.username
              );
            }
          } else {
            console.warn(`[START] ⚠️ Failed to apply referrer: ${referrerInfo.reason}`);
          }
        }
      }

      const commonSlogan = `🎰 *Добро пожаловать в SafariUp — Казино будущего!* 🌍

🚀 Здесь каждый спин — шаг к выигрышу!  
💎 Крипто-ставки без границ  
⚡ Мгновенные выплаты  
🎁 Ежедневные бонусы и турниры

🔥 *Играй. Выигрывай. Наслаждайся.*`;

      let credentialsBlock = '';
      if (isNewUser) {
        const username = ctx.from.username;
        credentialsBlock = `\n\n✨ *Ваши данные для входа:*\n` +
          `🔑 Логин: \`${username ? `@${username}` : `ID: ${user.id}`}\`\n` +
          `🔐 Пароль: \`${rawPassword}\`\n\n` +
          `⚠️ *Сохраните пароль! Он показывается только один раз.*`;
        
        if (referralApplied) {
          credentialsBlock += `\n\n🎁 *Бонус активирован!*\n` +
            `✅ Реферер: ${referrerInfo.referrerUsername || `ID${referrerInfo.referrerId}`}\n` +
            `💰 При первом депозите вы получите +100% бонус!`;
        }
      }

      const fullMessage = commonSlogan + credentialsBlock;

      try {
        if (fs.existsSync(WELCOME_IMAGE_PATH)) {
          await ctx.replyWithPhoto(
            { source: fs.createReadStream(WELCOME_IMAGE_PATH) },
            { caption: fullMessage, parse_mode: 'Markdown' }
          );
        } else {
          await ctx.reply(fullMessage, { parse_mode: 'Markdown' });
        }
      } catch (imageError) {
        logger.warn('BOT', `Error sending welcome image`, { error: imageError.message });
        await ctx.reply(fullMessage, { parse_mode: 'Markdown' });
      }

      const menu = getMainMenuKeyboard(user.isAdmin);
      await ctx.reply('📋 *Выберите действие:*', menu);
    } catch (error) {
      logger.error('BOT', `Error in /start command`, { error: error.message });
      await ctx.reply("Произошла ошибка. Попробуйте позже.");
    }
  });

  // ====================================
  // MESSAGE HANDLER
  // ====================================

  bot.on('message', async (ctx) => {
    if (!ctx.message?.text) return;
    const text = ctx.message.text.trim();
    if (!text) return;

    try {
      const user = await prisma.user.findUnique({ 
        where: { telegramId: ctx.from.id.toString() } 
      });
      
      if (!user) {
        await ctx.reply('Пожалуйста, нажмите /start для регистрации');
        return;
      }
      
      if (user.isBlocked) {
        logger.warn('BOT', `Blocked user sent message`, { userId: user.id });
        await ctx.reply('🚫 Ваш аккаунт заблокирован.');
        return;
      }

      if (adminWaitingForReply.has(user.id)) {
        const ticketId = adminWaitingForReply.get(user.id);
        let ticketUser = null;

        for (const [userId, ticket] of supportTickets.entries()) {
          if (ticket.ticketId === ticketId) {
            ticketUser = userId;
            break;
          }
        }

        if (ticketUser) {
          const ticket = supportTickets.get(ticketUser);
          adminWaitingForReply.delete(user.id);

          const ticketUser_ = await prisma.user.findUnique({ 
            where: { id: ticketUser }, 
            select: { telegramId: true } 
          });

          if (ticketUser_?.telegramId) {
            try {
              await bot.telegram.sendMessage(
                ticketUser_.telegramId,
                `💬 *Ответ администратора*\n\n` +
                `🎫 Тикет: \`${ticketId}\`\n\n` +
                `📝 Ваше сообщение:\n\`\`\`\n${ticket.message}\n\`\`\`\n\n` +
                `✅ Ответ:\n\`\`\`\n${text}\n\`\`\``,
                { parse_mode: 'Markdown' }
              );

              ticket.status = 'RESOLVED';

              await ctx.reply(
                `✅ Ответ отправлен пользователю ${ticketUser}`,
                getMainMenuKeyboard(user.isAdmin)
              );

              logger.info('BOT', `Admin replied to ticket`, { ticketId, adminId: user.id });
            } catch (e) {
              logger.warn('BOT', `Failed to send reply to user`, { error: e.message });
              await ctx.reply('❌ Ошибка при отправке ответа.');
            }
          }
        }
        return;
      }

      if (waitingForTicketMessage.has(user.id)) {
        const ticketType = waitingForTicketMessage.get(user.id);
        const ticketId = generateTicketId();
        const messageText = text;

        const typeLabels = {
          'GENERAL': 'Общая поддержка',
          'CONTACT': 'От пользователя'
        };

        const typeLabel = typeLabels[ticketType] || ticketType;

        supportTickets.set(user.id, {
          ticketId,
          type: ticketType,
          status: 'OPEN',
          message: messageText,
          createdAt: new Date()
        });

        waitingForTicketMessage.delete(user.id);

        logger.info('BOT', `Support ticket created`, { 
          ticketId, 
          userId: user.id, 
          type: ticketType 
        });

        await ctx.reply(
          `✅ *Заявка создана!*\n\n` +
          `🎫 Номер: \`${ticketId}\`\n` +
          `📝 Тип: ${typeLabel}\n` +
          `⏳ Статус: На рассмотрении\n\n` +
          `Администратор рассмотрит вашу заявку в ближайшее время и напишет вам в чат.`,
          { parse_mode: 'Markdown', ...getMainMenuKeyboard(user.isAdmin) }
        );

        const admins = await prisma.user.findMany({ where: { isAdmin: true } });
        for (const admin of admins) {
          if (admin.telegramId) {
            try {
              await bot.telegram.sendMessage(
                admin.telegramId,
                `🎫 НОВАЯ ЗАЯВКА ПОДДЕРЖКИ\n\n` +
                `🎫 Номер: \`${ticketId}\`\n` +
                `👤 От пользователя: ${user.id}\n` +
                `📝 Тип: ${typeLabel}\n\n` +
                `📄 Сообщение:\n\`\`\`\n${messageText}\n\`\`\``,
                { parse_mode: 'Markdown' }
              );
            } catch (e) {
              logger.warn('BOT', `Failed to notify admin about ticket`, { error: e.message });
            }
          }
        }
        return;
      }

      if (waitingForWithdrawAmount.has(user.id)) {
        if (text === '◀️ Назад') {
          waitingForWithdrawAmount.delete(user.id);
          const menu = getMainMenuKeyboard(user.isAdmin);
          await ctx.reply('📋 *Выберите действие:*', menu);
          return;
        }

        const amount = parseFloat(text);
        const balance = await getUserBalance(user.id);
        
        if (!validators.validateWithdrawAmount(amount) || amount > balance) {
          await ctx.reply(
            `❌ Некорректная сумма. Доступно: ${balance.toFixed(8)} USDT.\n\nПопробуйте снова:`,
            getBackButton()
          );
          return;
        }
        
        waitingForWithdrawAmount.delete(user.id);
        
        console.log(`\n💸 User ${user.id} requested withdrawal of ${amount.toFixed(8)} USDT`);
        
        await ctx.reply(
          `💰 *Ваша заявка на вывод*\n\n` +
          `Сумма: ${amount.toFixed(8)} USDT\n` +
          `Способ: Прямой перевод на ваш кошелёк\n\n` +
          `⏳ Подтвердите операцию:`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Подтвердить', callback_data: `confirm_withdraw_${amount.toFixed(8)}` }],
                [{ text: '❌ Отмена', callback_data: 'back_to_menu' }]
              ]
            },
            parse_mode: 'Markdown'
          }
        );
        
        logger.info('BOT', `User entered withdraw amount`, { userId: user.id, amount: amount.toFixed(8) });
        return;
      }

      if (waitingForDeposit.has(user.id)) {
        if (text === '◀️ Назад') {
          waitingForDeposit.delete(user.id);
          const menu = getMainMenuKeyboard(user.isAdmin);
          await ctx.reply('📋 *Выберите действие:*', menu);
          return;
        }

        const amount = parseFloat(text);
        
        if (!validators.validateDepositAmount(amount)) {
          await ctx.reply(
            `❌ Введите корректную сумму (от 0.01 до 1000000 USDT).\n\nПример: 10.5`,
            getBackButton()
          );
          return;
        }
        
        waitingForDeposit.delete(user.id);
        logger.info('BOT', `User entered deposit amount`, { userId: user.id, amount: amount.toFixed(8) });
        
        const bonusAvailability = await referralService.checkBonusAvailability(user.id);
        
        console.log(`\n💰 [DEPOSIT] User ${user.id} entered amount: ${amount.toFixed(8)}, bonus available: ${bonusAvailability.canUseBonus}`);

        if (bonusAvailability.canUseBonus) {
          await ctx.reply(
            `💰 *Пополнение на ${amount.toFixed(8)} USDT*\n\n` +
            `🎁 У вас доступен бонус +100%!\n\n` +
            `Использовать бонус при этом пополнении?`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "✅ С БОНУСОМ +100%", callback_data: `show_bonus_conditions_${amount.toFixed(8)}` }],
                  [{ text: "💎 БЕЗ БОНУСА", callback_data: `confirm_deposit_${amount.toFixed(8)}_no` }]
                ]
              },
              parse_mode: "Markdown"
            }
          );
        } else {
          console.log(`   ℹ️ Bonus not available: ${bonusAvailability.reason}`);
          
          const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);
          if (!invoice) {
            await ctx.reply("❌ Ошибка при создании инвойса.", getMainMenuKeyboard(user.isAdmin));
            return;
          }
          
          scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT', false);
          
          await ctx.reply(
            `✅ *Инвойс создан*\n\n` +
            `💰 Сумма: ${amount.toFixed(8)} USDT\n` +
            `⏳ Статус: Ожидание оплаты\n\n` +
            `🔗 Кликните ниже для оплаты или проверьте статус:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "💳 Оплатить", url: invoice.bot_invoice_url }],
                  [{ text: "🔄 Проверить статус", callback_data: `check_invoice_${invoice.invoice_id}` }],
                  [{ text: "◀️ Отменить", callback_data: `cancel_deposit` }]
                ]
              },
              parse_mode: "Markdown"
            }
          );
        }
        return;
      }

      switch (text) {
        case '🎰 Казино': {
          const oneTimeToken = await generateOneTimeToken(user.id);
          const authUrl = `${FRONTEND_URL}/login?token=${oneTimeToken}`;
          if (FRONTEND_URL.startsWith('https://')) {
            await ctx.reply('🚀 *Открываем казино...*', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🚀 Открыть Казино', web_app: { url: authUrl } }]
                ]
              }
            });
          } else {
            await ctx.reply(`🔗 Ссылка для входа:\n${authUrl}`);
          }
          break;
        }

        case '💰 Пополнить': {
          waitingForDeposit.delete(user.id);
          waitingForWithdrawAmount.delete(user.id);
          
          waitingForDeposit.set(user.id, true);
          setStateTimeout(waitingForDeposit, user.id);
          
          await ctx.reply(
            `💰 *Пополнение счета*\n\nВыберите сумму или введите свою:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '10 USDT', callback_data: 'deposit_10' }, { text: '50 USDT', callback_data: 'deposit_50' }],
                  [{ text: '100 USDT', callback_data: 'deposit_100' }, { text: '500 USDT', callback_data: 'deposit_500' }],
                  [{ text: 'Другая сумма', callback_data: 'deposit_custom' }],
                  [{ text: '◀️ Назад', callback_data: 'back_to_menu' }]
                ]
              },
              parse_mode: 'Markdown'
            }
          );
          break;
        }

        case '💸 Вывести': {
          waitingForDeposit.delete(user.id);
          waitingForWithdrawAmount.delete(user.id);
          
          const balance = await getUserBalance(user.id);
          if (balance < 1) {
            await ctx.reply('❌ Минимальный баланс для вывода — 1 USDT.');
            return;
          }
          
          waitingForWithdrawAmount.set(user.id, true);
          setStateTimeout(waitingForWithdrawAmount, user.id);
          
          await ctx.reply(
            `💸 *Выберите сумму для вывода:*\n\n💡 Средства будут отправлены прямо на ваш кошелёк!`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '10 USDT', callback_data: 'withdraw_10' }],
                  [{ text: '50 USDT', callback_data: 'withdraw_50' }],
                  [{ text: '100 USDT', callback_data: 'withdraw_100' }],
                  [{ text: 'Другая сумма', callback_data: 'withdraw_custom' }],
                  [{ text: '◀️ Назад', callback_data: 'back_to_menu' }]
                ]
              },
              parse_mode: 'Markdown'
            }
          );
          break;
        }

        case '📥 Мои выводы': {
          const userTx = await prisma.transaction.findMany({
            where: { userId: user.id, type: 'WITHDRAW' },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, amount: true, status: true, walletAddress: true, createdAt: true }
          });

          if (userTx.length === 0) {
            await ctx.reply('У вас пока нет заявок на вывод.', getMainMenuKeyboard(user.isAdmin));
            return;
          }

          let msg = `📥 *Ваши последние заявки на вывод:*\n\n`;
          for (const tx of userTx) {
            const statusEmoji = tx.status === 'PENDING' ? '⏳' : tx.status === 'COMPLETED' ? '✅' : '❌';
            const statusText = tx.status === 'PENDING' ? 'В обработке' : tx.status === 'COMPLETED' ? 'Выполнен' : 'Отклонён';
            const txAmount = parseFloat(tx.amount.toString());
            const addr = tx.walletAddress || '—';
            const shortAddr = addr.length > 10 ? `${addr.slice(0,6)}...${addr.slice(-4)}` : addr;

            msg += `${statusEmoji} *${txAmount.toFixed(8)} USDT*\n` +
                   `Адрес: \`${shortAddr}\`\n` +
                   `Статус: ${statusText}\n` +
                   `ID: ${tx.id}\n\n`;
          }

          await ctx.reply(msg, { parse_mode: 'Markdown', ...getMainMenuKeyboard(user.isAdmin) });
          break;
        }

        case '⚙️ Админ Панель': {
          if (!user.isAdmin) {
            await ctx.reply('❌ У вас нет доступа.');
            return;
          }

          await ctx.reply(
            `⚙️ *Админ Панель*\n\nВыберите действие:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💸 Заявки на вывод', callback_data: 'admin_show_withdrawals' }],
                  [{ text: '🎫 Заявки поддержки', callback_data: 'admin_show_tickets' }],
                  [{ text: '◀️ Назад', callback_data: 'back_to_menu' }]
                ]
              },
              parse_mode: 'Markdown'
            }
          );
          break;
        }

        default: {
          const menu = getMainMenuKeyboard(user.isAdmin);
          await ctx.reply('📋 *Выберите действие:*', menu);
        }
      }
    } catch (error) {
      logger.error('BOT', `Error handling message`, { error: error.message });
      await ctx.reply('❌ Ошибка. Попробуйте еще раз.');
    }
  });

  // ====================================
  // CALLBACK HANDLERS
  // ====================================

  bot.action('back_to_menu', async (ctx) => {
    const userId = parseInt(ctx.from.id);
    waitingForDeposit.delete(userId);
    waitingForWithdrawAmount.delete(userId);
    
    try {
      await ctx.deleteMessage();
    } catch (e) {}
    
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    const menu = getMainMenuKeyboard(user?.isAdmin || false);
    
    await ctx.reply('📋 *Выберите действие:*', menu);
    await ctx.answerCbQuery();
  });

  bot.action('cancel_deposit', async (ctx) => {
    const userId = parseInt(ctx.from.id);
    waitingForDeposit.delete(userId);
    waitingForWithdrawAmount.delete(userId);
    
    try {
      await ctx.deleteMessage();
    } catch (e) {}
    
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    
    await ctx.reply('❌ Пополнение отменено.', getMainMenuKeyboard(user?.isAdmin || false));
    await ctx.answerCbQuery();
  });

  bot.action(/show_bonus_conditions_(\d+(?:\.\d+)?)/, async (ctx) => {
    try {
      const amountStr = ctx.match[1];
      const amount = parseFloat(amountStr);
      
      if (!validators.validateDepositAmount(amount)) {
        await ctx.answerCbQuery("❌ Некорректная сумма");
        return;
      }
      
      const user = await prisma.user.findUnique({ 
        where: { telegramId: ctx.from.id.toString() } 
      });
      
      if (!user) {
        await ctx.answerCbQuery("❌ Пользователь не найден.");
        return;
      }

      let bonusAmount = amount * (referralService.constructor.CONFIG.DEPOSIT_BONUS_PERCENT / 100);
      const maxBonus = referralService.constructor.CONFIG.MAX_BONUS_AMOUNT;
      
      if (bonusAmount > maxBonus) {
        bonusAmount = maxBonus;
      }

      const conditionsText = `🎁 УСЛОВИЯ ВАШЕГО БОНУСА\n\nРазмер:\n- Депозит: ${amount.toFixed(8)} USDT\n- Бонус: +100% (макс ${maxBonus} USDT)\n- Ваш бонус: ${bonusAmount.toFixed(8)} USDT\n\nТребования:\n- Отыграть: 10x от суммы\n- Действует: 7 дней\n- Выигрыш: до 3x от суммы\n\nКак получить деньги:\n1. Пополни баланс\n2. Играй и ставь обычно\n3. Отыграй 10x суммы\n4. Выиграешь - деньги на вывод`;

      try {
        await ctx.deleteMessage();
      } catch (e) {}

      await ctx.reply(
        conditionsText,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ ПРИНИМАЮ УСЛОВИЯ", callback_data: `confirm_deposit_${amount.toFixed(8)}_yes` }],
              [{ text: "❌ ОТКАЗАТЬСЯ", callback_data: `confirm_deposit_${amount.toFixed(8)}_no` }]
            ]
          }
        }
      );
      
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('BOT', `Error showing bonus conditions`, { error: error.message });
      await ctx.answerCbQuery(`❌ Ошибка: ${error.message}`);
    }
  });

  bot.action(/confirm_deposit_(\d+(?:\.\d+)?)_(yes|no)/, async (ctx) => {
    try {
      const amountStr = ctx.match[1];
      const useBonus = ctx.match[2] === 'yes';
      const amount = parseFloat(amountStr);
      
      if (!validators.validateDepositAmount(amount)) {
        await ctx.answerCbQuery("❌ Некорректная сумма");
        return;
      }
      
      const user = await prisma.user.findUnique({ 
        where: { telegramId: ctx.from.id.toString() } 
      });
      
      if (!user) {
        await ctx.answerCbQuery("❌ Пользователь не найден.");
        return;
      }

      try {
        await ctx.deleteMessage();
      } catch (e) {}

      const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);
      if (!invoice) {
        await ctx.reply("❌ Ошибка создания инвойса.", getMainMenuKeyboard(user.isAdmin));
        await ctx.answerCbQuery("❌ Ошибка");
        return;
      }

      scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT', useBonus);

      const bonusText = useBonus 
        ? `\n\nС БОНУСОМ:\n- +100% к пополнению\n- Отыграй 10x\n- Выигрыш до 3x`
        : `\n\nБЕЗ БОНУСА:\n- Сразу на счёт`;

      await ctx.reply(
        `Инвойс создан\n\nСумма: ${amount.toFixed(8)} USDT${bonusText}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "💳 Оплатить", url: invoice.bot_invoice_url }],
              [{ text: "🔄 Проверить статус", callback_data: `check_invoice_${invoice.invoice_id}` }],
              [{ text: "◀️ Отменить", callback_data: `cancel_deposit` }]
            ]
          }
        }
      );
      
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('BOT', `Error in confirm_deposit callback`, { error: error.message });
      await ctx.answerCbQuery(`❌ Ошибка: ${error.message}`);
    }
  });

  bot.action('deposit_custom', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    if (!user) return;
    
    waitingForDeposit.set(user.id, true);
    setStateTimeout(waitingForDeposit, user.id);
    
    try {
      await ctx.deleteMessage();
    } catch (e) {}
    
    await ctx.reply("Введите сумму в USDT (пример: 15.25):", getBackButton());
    await ctx.answerCbQuery();
  });

  bot.action(/deposit_(\d+)/, async (ctx) => {
    try {
      const amount = parseFloat(ctx.match[1]);
      
      if (!validators.validateDepositAmount(amount)) {
        await ctx.answerCbQuery("❌ Некорректная сумма");
        return;
      }
      
      const user = await prisma.user.findUnique({ 
        where: { telegramId: ctx.from.id.toString() } 
      });
      
      if (!user) return;

      try {
        await ctx.deleteMessage();
      } catch (e) {}

      const bonusAvailability = await referralService.checkBonusAvailability(user.id);
      
      if (bonusAvailability.canUseBonus) {
        await ctx.reply(
          `Пополнение на ${amount.toFixed(8)} USDT\n\nУ вас доступен бонус +100%!\n\nИспользовать бонус?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ С БОНУСОМ +100%", callback_data: `show_bonus_conditions_${amount.toFixed(8)}` }],
                [{ text: "БЕЗ БОНУСА", callback_data: `confirm_deposit_${amount.toFixed(8)}_no` }]
              ]
            }
          }
        );
      } else {
        const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);
        if (!invoice) {
          await ctx.reply("❌ Ошибка создания инвойса.", getMainMenuKeyboard(user.isAdmin));
          return await ctx.answerCbQuery();
        }
        
        scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT', false);
        
        await ctx.reply(
          `Инвойс создан\n\nСумма: ${amount.toFixed(8)} USDT\nСтатус: Ожидание оплаты`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "💳 Оплатить", url: invoice.bot_invoice_url }],
                [{ text: "🔄 Проверить статус", callback_data: `check_invoice_${invoice.invoice_id}` }],
                [{ text: "◀️ Отменить", callback_data: `cancel_deposit` }]
              ]
            }
          }
        );
      }
      
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('BOT', `Error in deposit callback`, { error: error.message });
      await ctx.answerCbQuery('❌ Ошибка');
    }
  });

  bot.action(/check_invoice_(\d+)/, async (ctx) => {
    try {
      const invoiceId = parseInt(ctx.match[1]);
      if (isNaN(invoiceId)) {
        await ctx.answerCbQuery('❌ Некорректный ID инвойса');
        return;
      }
      
      await ctx.answerCbQuery('🔍 Проверяем статус...');
      const result = await cryptoPayAPI.getInvoices([invoiceId]);
      
      if (!result?.items?.length) {
        await ctx.editMessageText('Инвойс не найден.');
        return;
      }
      
      const invoice = result.items[0];
      
      if (invoice.status === 'paid') {
        try {
          await ctx.editMessageText(
            `✅ Оплата получена!\n\nДеньги поступают на ваш счёт...`
          );
        } catch (e) {
          if (!e.description?.includes('message is not modified')) {
            await ctx.reply('✅ Оплата подтверждена! Деньги зачислены.');
          }
        }
      } else if (invoice.status === 'active') {
        await ctx.editMessageText(
          `Инвойс ожидает оплаты`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '💳 Оплатить', url: invoice.bot_invoice_url }],
                [{ text: '🔄 Проверить снова', callback_data: `check_invoice_${invoiceId}` }],
                [{ text: '◀️ Назад', callback_data: `back_to_menu` }]
              ]
            }
          }
        );
      } else {
        await ctx.editMessageText(
          `Инвойс ${invoice.status}. Попробуйте создать новый.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '◀️ Назад', callback_data: `back_to_menu` }]
              ]
            }
          }
        );
      }
      
    } catch (error) {
      logger.error('BOT', `Error in check_invoice callback`, { error: error.message });
      await ctx.answerCbQuery('Ошибка при проверке');
    }
  });

  bot.action(/confirm_withdraw_(.+)/, async (ctx) => {
    try {
      const amountStr = ctx.match[1];
      if (!amountStr || amountStr.trim() === '') {
        await ctx.answerCbQuery('Ошибка: пустая сумма');
        return;
      }
      
      const amount = parseFloat(amountStr.trim());
      if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
        await ctx.answerCbQuery(`Некорректная сумма`);
        return;
      }
      
      if (!validators.validateWithdrawAmount(amount)) {
        await ctx.answerCbQuery('Сумма вне допустимого диапазона');
        return;
      }
      
      const user = await prisma.user.findUnique({ 
        where: { telegramId: ctx.from.id.toString() } 
      });
      
      if (!user) {
        await ctx.answerCbQuery('Пользователь не найден');
        return;
      }

      const balance = await getUserBalance(user.id);
      if (balance < amount) {
        await ctx.answerCbQuery('Недостаточно средств');
        await ctx.reply(`Доступно только ${balance.toFixed(8)} USDT`);
        return;
      }

      try {
        await ctx.deleteMessage();
      } catch (deleteError) {}

      await ctx.answerCbQuery('Обработка...', false);

      console.log(`\n💸 Creating withdrawal request for user ${user.id}, amount ${amount.toFixed(8)}`);
      
      const result = await withdrawalService.createWithdrawalRequest(bot, user.id, amount, 'USDT');

      if (!result.success) {
        console.error(`Withdrawal creation failed: ${result.error}`);
        
        let userMessage = result.userMessage || 'Ошибка при создании заявки на вывод';
        
        await ctx.reply(
          userMessage + '\n\nПопробуйте позже.',
          getMainMenuKeyboard(user.isAdmin)
        );
        
        logger.error('BOT', 'Withdrawal creation failed', { 
          userId: user.id,
          amount: amount.toFixed(8),
          error: result.error 
        });
        return;
      }

      console.log(`✅ Withdrawal request created: ${result.withdrawalId}`);

      await ctx.reply(
        `Заявка на вывод ${amount.toFixed(8)} USDT создана.\n\nID: ${result.withdrawalId}\nСтатус: На рассмотрении\n\nАдминистратор одобрит её в течение нескольких минут.`,
        getMainMenuKeyboard(user.isAdmin)
      );
      
      logger.info('BOT', 'Withdrawal request created successfully', { 
        withdrawalId: result.withdrawalId,
        userId: user.id,
        username: user.username || 'no_username',
        amount: amount.toFixed(8)
      });

    } catch (error) {
      console.error(`CRITICAL ERROR in confirm_withdraw: ${error.message}`);
      
      logger.error('BOT', 'Critical error in confirm_withdraw callback', { 
        error: error.message,
        stack: error.stack
      });
      
      try {
        await ctx.answerCbQuery('Внутренняя ошибка сервера', false);
      } catch (e) {}
      
      try {
        await ctx.reply(
          'Произошла ошибка при обработке вывода.\n\nПожалуйста, попробуйте позже или обратитесь в поддержку.',
          getMainMenuKeyboard(false)
        );
      } catch (e) {}
    }
  });

  bot.action('withdraw_custom', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    if (!user) return;
    
    waitingForWithdrawAmount.set(user.id, true);
    setStateTimeout(waitingForWithdrawAmount, user.id);
    
    try {
      await ctx.deleteMessage();
    } catch (e) {}
    
    await ctx.reply("Введите сумму в USDT (пример: 15.25):", getBackButton());
    await ctx.answerCbQuery();
  });

  bot.action(/withdraw_(\d+)/, async (ctx) => {
    try {
      const amount = parseFloat(ctx.match[1]);
      
      if (!validators.validateWithdrawAmount(amount)) {
        await ctx.answerCbQuery('Некорректная сумма');
        return;
      }
      
      const user = await prisma.user.findUnique({ 
        where: { telegramId: ctx.from.id.toString() } 
      });
      
      if (!user) return;

      const balance = await getUserBalance(user.id);
      if (balance < amount) {
        await ctx.answerCbQuery('Недостаточно средств');
        await ctx.reply(`Доступно только ${balance.toFixed(8)} USDT`);
        return;
      }

      try {
        await ctx.deleteMessage();
      } catch (e) {}

      await ctx.reply(
        `Ваша заявка на вывод\n\nСумма: ${amount.toFixed(8)} USDT\nСпособ: Прямой перевод на кошелёк\n\nПодтвердите операцию:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Подтвердить', callback_data: `confirm_withdraw_${amount.toFixed(8)}` }],
              [{ text: '❌ Отмена', callback_data: 'back_to_menu' }]
            ]
          }
        }
      );
      
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('BOT', `Error in withdraw callback`, { error: error.message });
      await ctx.answerCbQuery('Ошибка');
    }
  });

  // ⭐ АДМИНИСТРАТОРСКАЯ ПАНЕЛЬ
  bot.action('admin_show_withdrawals', async (ctx) => {
    try {
      const user = await prisma.user.findUnique({ 
        where: { telegramId: ctx.from.id.toString() } 
      });

      if (!user || !user.isAdmin) {
        await ctx.answerCbQuery('Нет доступа', true);
        return;
      }

      console.log(`\n📋 [ADMIN] Loading pending withdrawals...`);

      const pendingWithdrawals = await prisma.transaction.findMany({
        where: { type: 'WITHDRAW', status: 'PENDING' },
        select: { 
          id: true, 
          userId: true, 
          amount: true, 
          walletAddress: true, 
          createdAt: true,
          user: {
            select: { username: true, firstName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      console.log(`✅ Found ${pendingWithdrawals.length} pending withdrawals`);

      if (pendingWithdrawals.length === 0) {
        await ctx.editMessageText('Нет заявок на вывод. Все заявки обработаны!', { 
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Назад', callback_data: 'back_to_admin_menu' }]
            ]
          }
        });
        await ctx.answerCbQuery('Нет заявок', true);
        return;
      }

      let msg = 'ЗАЯВКИ НА ВЫВОД (' + pendingWithdrawals.length + '):\n\n';
      
      for (const w of pendingWithdrawals.slice(0, 5)) {
        const amount = parseFloat(w.amount.toString());
        const withdrawalId = String(w.id);
        
        let userDisplayName = 'Unknown';
        if (w.user?.username) {
          userDisplayName = '@' + w.user.username;
        } else if (w.user?.firstName) {
          userDisplayName = w.user.firstName;
        } else {
          userDisplayName = 'ID:' + w.userId;
        }
        
        let shortAddr = '-';
        if (w.walletAddress) {
          const addr = w.walletAddress.toString().trim();
          shortAddr = addr.length > 15 ? addr.slice(0,10) + '...' : addr;
        }
        
        const dateStr = new Date(w.createdAt).toLocaleString('ru-RU');
        
        msg += 'ID: ' + withdrawalId + '\n' +
               'User: ' + userDisplayName + '\n' +
               'Sum: ' + amount.toFixed(8) + ' USDT\n' +
               'Addr: ' + shortAddr + '\n' +
               'Date: ' + dateStr + '\n' +
               '---\n';
      }

      const buttons = [];
      
      for (const w of pendingWithdrawals.slice(0, 5)) {
        buttons.push([
          { 
            text: 'OK #' + w.id, 
            callback_data: 'approve_withdrawal_' + w.id
          },
          { 
            text: 'NO #' + w.id, 
            callback_data: 'reject_withdrawal_' + w.id
          }
        ]);
      }

      if (pendingWithdrawals.length > 5) {
        msg += '\nИ ещё ' + (pendingWithdrawals.length - 5) + ' заявок. Показаны первые 5.';
      }

      buttons.push([
        { text: 'Обновить', callback_data: 'admin_show_withdrawals' },
        { text: 'Назад', callback_data: 'back_to_admin_menu' }
      ]);

      console.log('✅ Sending message');

      try {
        await ctx.editMessageText(msg, {
          reply_markup: { inline_keyboard: buttons }
        });
        console.log('✅ Message edited');
      } catch (editError) {
        console.error('Edit error: ' + editError.message);
        
        try {
          await ctx.deleteMessage();
        } catch (e) {}
        
        await ctx.reply(msg, {
          reply_markup: { inline_keyboard: buttons }
        });
        console.log('✅ Sent as new message');
      }

      await ctx.answerCbQuery(pendingWithdrawals.length + ' заявок загружено', false);

    } catch (error) {
      console.error('CRITICAL ERROR: ' + error.message);
      console.error(error.stack);
      
      logger.error('BOT', 'Error in admin_show_withdrawals', { 
        error: error.message
      });

      try {
        await ctx.answerCbQuery('Ошибка: ' + error.message, true);
      } catch (e) {}

      try {
        await ctx.reply('Ошибка при загрузке заявок. Попробуйте позже.',
          { 
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Попробовать снова', callback_data: 'admin_show_withdrawals' }],
                [{ text: 'Назад', callback_data: 'back_to_admin_menu' }]
              ]
            }
          }
        );
      } catch (e) {}
    }
  });

  bot.action('back_to_admin_menu', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('Нет доступа', true);
      return;
    }

    try {
      await ctx.deleteMessage();
    } catch (e) {}

    await ctx.reply(
      'Админ Панель\n\nВыберите действие:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Выводы', callback_data: 'admin_show_withdrawals' }],
            [{ text: 'Поддержка', callback_data: 'admin_show_tickets' }],
            [{ text: 'Назад', callback_data: 'back_to_menu' }]
          ]
        }
      }
    );

    await ctx.answerCbQuery();
  });

  bot.action('admin_show_tickets', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    if (supportTickets.size === 0) {
      await ctx.editMessageText('Нет открытых тикетов.');
      await ctx.answerCbQuery();
      return;
    }

    let msg = 'ПОДДЕРЖКА (' + supportTickets.size + '):\n\n';
    let ticketsList = [];

    for (const [userId, ticket] of supportTickets.entries()) {
      if (ticket.status === 'OPEN' || ticket.status === 'REPLIED') {
        const typeLabel = ticket.type === 'CONTACT' ? 'ЧАТ' : 'Q';

        ticketsList.push({
          id: ticket.ticketId,
          userId,
          type: typeLabel,
          message: ticket.message.substring(0, 40) + (ticket.message.length > 40 ? '...' : '')
        });
      }
    }

    if (ticketsList.length === 0) {
      await ctx.editMessageText('Нет открытых тикетов.');
      await ctx.answerCbQuery();
      return;
    }

    for (const t of ticketsList) {
      msg += t.type + ' ' + t.id + '\n' +
             'User: ' + t.userId + '\n' +
             'Msg: ' + t.message + '\n\n';
    }

    const buttons = [];
    for (const t of ticketsList) {
      buttons.push([
        { text: 'Ответить ' + t.id, callback_data: 'reply_ticket_action_' + t.id }
      ]);
    }
    buttons.push([{ text: 'Назад', callback_data: 'back_to_admin_menu' }]);

    await ctx.editMessageText(msg, {
      reply_markup: { inline_keyboard: buttons }
    });
    await ctx.answerCbQuery();
  });

  bot.action(/approve_withdrawal_(\d+)/, async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    const withdrawalId = parseInt(ctx.match[1]);

    try {
      await ctx.answerCbQuery('Обработка...');

      console.log(`\n✅ Admin approving withdrawal ${withdrawalId}`);

      const result = await withdrawalService.processWithdrawal(bot, withdrawalId, true);

      console.log(`✅ Withdrawal approved`);
      
      const amount = parseFloat(result.amount.toString());
      
      await ctx.reply(
        `Заявка #${withdrawalId} одобрена!\n\nСумма: ${amount.toFixed(8)} ${result.asset}\nTransfer ID: ${result.transferId}\n\nСредства отправлены пользователю.`,
        getMainMenuKeyboard(user.isAdmin)
      );

    } catch (error) {
      logger.error('BOT', `Error approving withdrawal`, { error: error.message });
      
      await ctx.answerCbQuery('Ошибка');
      await ctx.reply(
        `Ошибка при одобрении заявки:\n\n${error.message}`,
        getMainMenuKeyboard(user.isAdmin)
      );
    }
  });

  bot.action(/reject_withdrawal_(\d+)/, async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    const withdrawalId = parseInt(ctx.match[1]);

    try {
      await ctx.answerCbQuery('Обработка...');

      console.log(`\n❌ Admin rejecting withdrawal ${withdrawalId}`);

      const result = await withdrawalService.processWithdrawal(bot, withdrawalId, false);

      console.log(`✅ Withdrawal rejected`);
      
      const returnedAmount = parseFloat(result.returnedAmount.toString());
      
      await ctx.reply(
        `Заявка #${withdrawalId} отклонена\n\nВозвращено: ${returnedAmount.toFixed(8)} ${result.asset} на счёт пользователя`,
        getMainMenuKeyboard(user.isAdmin)
      );

    } catch (error) {
      logger.error('BOT', `Error rejecting withdrawal`, { error: error.message });
      
      await ctx.answerCbQuery('Ошибка');
      await ctx.reply(
        `Ошибка при отклонении заявки:\n\n${error.message}`,
        getMainMenuKeyboard(user.isAdmin)
      );
    }
  });

  // ====================================
  // ЭКСПОРТ
  // ====================================

  module.exports = {
    start: () => {
      bot.launch();
      logger.info('BOT', 'Telegram Bot started successfully');
    },
    botInstance: bot,
    cryptoPayAPI,
    waitingForDeposit,
    waitingForWithdrawAmount,
    supportTickets,
    setStateTimeout,
    generateTicketId,
    parseReferralCode,
    generateReferralLink,
    applyReferrer,
    notifyReferrerAboutNewReferee,
    faqData,
    escapeMarkdownV2,
    escapeMarkdown
  };
}