/**
 * ✅ ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ telegramBot.js
 * КОПИРУЙ ВЕСЬ КОД В src/routes/telegramBot.js
 * 
 * ✅ ИСПРАВЛЕНИЯ:
 * 1. ✅ После выбора бонуса сообщение удаляется
 * 2. ✅ Сразу создается инвойс
 * 3. ✅ Нет зацикливания
 * 4. ✅ Правильная обработка всех callback'ов
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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL;
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;
const CRYPTO_PAY_API = 'https://pay.crypt.bot/api';

const WELCOME_IMAGE_PATH = path.join(__dirname, '../../assets/photo_2025-12-04_19-25-39.jpg');

// ====================================
// ВРЕМЕННЫЕ ХРАНИЛИЩА СОСТОЯНИЙ
// ====================================
const waitingForDeposit = new Map();
const waitingForWithdrawAmount = new Map();
const waitingForWithdrawAddress = new Map();
const waitingForTicketMessage = new Map();
const supportTickets = new Map();
const adminWaitingForReply = new Map();
const adminWaitingForWithdrawalReply = new Map();

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

// ====================================
// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ С ПОЛНЫМ ЛОГИРОВАНИЕМ
// ====================================
async function scheduleDepositCheck(bot, userId, invoiceId, amount, asset = 'USDT') {
  console.log(`\n📋 [DEPOSIT CHECK] Starting deposit check...`);
  console.log(`   userId: ${userId} (${typeof userId})`);
  console.log(`   invoiceId: ${invoiceId} (${typeof invoiceId})`);
  console.log(`   amount: ${amount} (${typeof amount})`);
  console.log(`   asset: ${asset}`);
  
  try {
    // ✅ СТРОГАЯ ВАЛИДАЦИЯ
    if (!userId || !invoiceId || !amount || !asset) {
      const missingParams = {
        userId: !userId ? '❌ MISSING' : '✅',
        invoiceId: !invoiceId ? '❌ MISSING' : '✅',
        amount: !amount ? '❌ MISSING' : '✅',
        asset: !asset ? '❌ MISSING' : '✅'
      };
      console.error(`❌ [DEPOSIT CHECK] Missing parameters:`, missingParams);
      logger.error('BOT', 'Missing parameters for scheduleDepositCheck', missingParams);
      return;
    }

    // ✅ ПРЕОБРАЗОВАНИЕ ТИПОВ
    let userIdNum, invoiceIdNum, amountNum;

    try {
      userIdNum = parseInt(String(userId).trim());
      if (isNaN(userIdNum) || userIdNum <= 0) throw new Error(`Invalid userId: ${userId} -> ${userIdNum}`);
      console.log(`   ✅ userId converted: ${userIdNum}`);
    } catch (e) {
      console.error(`❌ Failed to convert userId:`, e.message);
      logger.error('BOT', 'Failed to convert userId', { userId, error: e.message });
      return;
    }

    try {
      invoiceIdNum = parseInt(String(invoiceId).trim());
      if (isNaN(invoiceIdNum) || invoiceIdNum <= 0) throw new Error(`Invalid invoiceId: ${invoiceId} -> ${invoiceIdNum}`);
      console.log(`   ✅ invoiceId converted: ${invoiceIdNum}`);
    } catch (e) {
      console.error(`❌ Failed to convert invoiceId:`, e.message);
      logger.error('BOT', 'Failed to convert invoiceId', { invoiceId, error: e.message });
      return;
    }

    try {
      amountNum = parseFloat(String(amount).trim());
      if (isNaN(amountNum) || amountNum <= 0) throw new Error(`Invalid amount: ${amount} -> ${amountNum}`);
      console.log(`   ✅ amount converted: ${amountNum.toFixed(8)}`);
    } catch (e) {
      console.error(`❌ Failed to convert amount:`, e.message);
      logger.error('BOT', 'Failed to convert amount', { amount, error: e.message });
      return;
    }

    const assetStr = String(asset).toUpperCase().trim();
    if (assetStr.length === 0) {
      console.error(`❌ Invalid asset: ${asset}`);
      logger.error('BOT', 'Invalid asset', { asset });
      return;
    }
    console.log(`   ✅ asset validated: ${assetStr}`);

    // ✅ СОХРАНЕНИЕ В БД
    try {
      const pendingDeposit = await prisma.pendingDeposit.upsert({
        where: { invoiceId: invoiceIdNum.toString() },
        create: {
          userId: userIdNum,
          invoiceId: invoiceIdNum.toString(),
          amount: amountNum.toFixed(8),
          asset: assetStr,
          status: 'pending',
          createdAt: new Date()
        },
        update: { updatedAt: new Date(), status: 'pending' }
      });
      console.log(`   ✅ Saved to DB: id = ${pendingDeposit.id}`);
    } catch (dbError) {
      console.error(`❌ Database error:`, dbError.message);
      logger.error('BOT', 'Failed to save pending deposit', { error: dbError.message });
    }

    console.log(`✅ Parameters validated, starting polling...\n`);
    logger.info('BOT', `Scheduled deposit check`, { 
      userId: userIdNum, invoiceId: invoiceIdNum, amount: amountNum.toFixed(8), asset: assetStr
    });

    let checkCount = 0;
    const maxChecks = 12;
    const checkInterval = 30 * 1000;

    const checkDeposit = async () => {
      checkCount++;
      try {
        console.log(`🔍 [CHECK #${checkCount}/${maxChecks}] Checking invoice ${invoiceIdNum}...`);

        let response;
        try {
          response = await axios.get(`${CRYPTO_PAY_API}/getInvoices`, {
            headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN },
            params: { invoiceIds: invoiceIdNum.toString() },
            timeout: 5000
          });
          console.log(`   ✅ API Response: status=${response.status}`);
        } catch (apiError) {
          console.error(`   ❌ API Error: ${apiError.message}`);
          if (checkCount < maxChecks) {
            console.log(`   ⏳ Retrying in 30s...`);
            setTimeout(checkDeposit, checkInterval);
          }
          return;
        }

        if (!response?.data) {
          console.warn(`⚠️ No response data`);
          if (checkCount < maxChecks) setTimeout(checkDeposit, checkInterval);
          return;
        }

        if (!response.data.ok) {
          console.warn(`⚠️ API error:`, response.data);
          if (checkCount < maxChecks) setTimeout(checkDeposit, checkInterval);
          return;
        }

        if (!response.data.result?.items || response.data.result.items.length === 0) {
          console.log(`⏳ Invoice not in response yet (check #${checkCount})`);
          if (checkCount < maxChecks) setTimeout(checkDeposit, checkInterval);
          return;
        }

        const invoice = response.data.result.items[0];
        console.log(`✅ Got invoice: status=${invoice.status}, amount=${invoice.amount}`);

        const statusLower = String(invoice.status).toLowerCase();
        const isPaid = ['paid', 'completed'].includes(statusLower);

        if (!isPaid) {
          console.log(`⏳ Not paid yet. Status: ${invoice.status}`);
          if (checkCount < maxChecks) setTimeout(checkDeposit, checkInterval);
          return;
        }

        console.log(`\n🎉 INVOICE PAID! Creating transaction...\n`);
        
        // ✅ ПОЛУЧАЕМ ТОКЕН ПЕРЕД ИСПОЛЬЗОВАНИЕМ
        let token = await prisma.cryptoToken.findUnique({ where: { symbol: assetStr } });
        
        if (!token) {
          console.warn(`⚠️ Token not found, creating...`);
          try {
            token = await prisma.cryptoToken.create({
              data: { symbol: assetStr, name: assetStr, decimals: 8 }
            });
            console.log(`✅ Created token: ${token.id}`);
          } catch (e) {
            console.error(`❌ Failed to create token:`, e.message);
            return;
          }
        }
        
        await handleDepositWithToken(token, userIdNum, invoiceIdNum, amountNum, assetStr, bot);

      } catch (checkError) {
        console.error(`❌ Check error:`, checkError.message);
        if (checkCount < maxChecks) {
          setTimeout(checkDeposit, checkInterval);
        } else {
          console.error(`❌ Max checks reached`);
          await prisma.pendingDeposit.update({
            where: { invoiceId: invoiceIdNum.toString() },
            data: { status: 'failed' }
          }).catch(e => console.warn(`⚠️ Mark failed:`, e.message));
        }
      }
    };

    console.log(`⏳ Scheduling first check in 5s...\n`);
    setTimeout(checkDeposit, 5000);
    
  } catch (outerError) {
    console.error(`❌ CRITICAL ERROR:`, outerError.message);
    logger.error('BOT', `Critical error scheduling deposit check`, { error: outerError.message, stack: outerError.stack });
  }
}

/**
 * ✅ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
 */
async function handleDepositWithToken(token, userIdNum, invoiceIdNum, amountNum, asset, bot) {
  console.log(`💾 Creating transaction...`);
  console.log(`   userId: ${userIdNum}, amount: ${amountNum.toFixed(8)}`);
  
  try {
    const result = await prisma.$transaction(async (tx) => {
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
      console.log(`   ✅ Transaction created: ${newTx.id}`);

      const updatedBalance = await tx.balance.upsert({
        where: { userId_tokenId_type: { userId: userIdNum, tokenId: token.id, type: 'MAIN' } },
        create: { userId: userIdNum, tokenId: token.id, type: 'MAIN', amount: amountNum.toFixed(8) },
        update: { amount: { increment: amountNum } }
      });
      console.log(`   ✅ Balance updated: ${updatedBalance.amount}`);

      if (asset === 'USDT') {
        try {
          const bonusResult = await referralService.grantDepositBonus(userIdNum, amountNum, token.id);
          if (bonusResult) console.log(`   ✅ Bonus granted: ${bonusResult.bonusAmount}`);
        } catch (e) {
          console.warn(`⚠️ Bonus failed:`, e.message);
        }
      }

      return newTx;
    }, { timeout: 30000 });

    console.log(`✅ Transaction completed: ${result.id}\n`);

    try {
      const user = await prisma.user.findUnique({ where: { id: userIdNum }, select: { telegramId: true } });
      if (user?.telegramId) {
        await bot.telegram.sendMessage(user.telegramId, `✅ *Пополнение успешно!*\n\n💰 +${amountNum.toFixed(8)} ${asset}`, { parse_mode: 'Markdown' });
        console.log(`   ✅ Notification sent`);
      }
    } catch (e) {
      console.warn(`⚠️ Notification failed:`, e.message);
    }

    try {
      await prisma.pendingDeposit.update({ where: { invoiceId: invoiceIdNum.toString() }, data: { status: 'processed' } });
    } catch (e) {
      console.warn(`⚠️ Mark processed:`, e.message);
    }

  } catch (error) {
    console.error(`❌ Transaction error:`, error.message);
    logger.error('BOT', `Error handling deposit`, { error: error.message, stack: error.stack });
    
    try {
      await prisma.pendingDeposit.update({ where: { invoiceId: invoiceIdNum.toString() }, data: { status: 'failed' } });
    } catch (e) {
      console.warn(`⚠️ Mark failed:`, e.message);
    }
    
    throw error;
  }
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
      [{ text: '📥 Мои выводы' }],
      [{ text: '👥 Рефералы' }, { text: '👤 Профиль' }]
    ];

    if (isAdmin) {
      baseButtons.push([{ text: '⚙️ Админ Панель' }]);
    }

    baseButtons.push([{ text: '❓ Помощь' }]);

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
        if (isNaN(amountNum) || amountNum <= 0) {
          logger.warn('BOT', 'Invalid amount for invoice', { amount });
          return null;
        }
        
        if (!validators.validateAsset(asset)) {
          logger.warn('BOT', 'Invalid asset', { asset });
          return null;
        }
        
        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum)) {
          logger.warn('BOT', 'Invalid userId for invoice', { userId });
          return null;
        }
        
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
        
        logger.error('BOT', `Crypto Pay API error`, { response: response.data });
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
  // HELPERS
  // ====================================
  async function getUserBalance(userId, tokenSymbol = 'USDT') {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || !validators.validateUserId(userIdNum)) {
        return 0;
      }
      
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
  // START COMMAND
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

      const startPayload = ctx.startPayload;
      let referralCode = null;
      if (startPayload && startPayload.startsWith('ref_')) {
        referralCode = startPayload.replace('ref_', '');
      }

      if (!user) {
        const { user: newUser, rawPassword: pwd } = await registerNewUser(ctx.from);
        user = newUser;
        rawPassword = pwd;
        isNewUser = true;
        
        logger.info('BOT', `New user registered`, { userId: user.id, telegramId });

        if (referralCode) {
          const referrer = await prisma.user.findUnique({
            where: { referralCode },
            select: { id: true }
          });

          if (referrer && referrer.id !== user.id) {
            await prisma.user.update({
              where: { id: user.id },
              data: { referredById: referrer.id }
            });
            referralApplied = true;
            logger.info('BOT', `Referral applied`, { userId: user.id, referrerId: referrer.id });
          }
        }
      }

      const commonSlogan = `🎰 *Добро пожаловать в SafariX — Казино будущего!* 🌍

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
          credentialsBlock += `\n\n🎁 *Бонус активирован!*\nПри первом депозите получите +100% на бонусный баланс!`;
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
  // MAIN MESSAGE HANDLER
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

      // ✅ ОБРАБОТКА ОТВЕТОВ АДМИНИСТРАТОРА НА ТИКЕТЫ
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

      // ✅ ОБРАБОТКА СООБЩЕНИЙ ДЛЯ ТИКЕТОВ ПОДДЕРЖКИ
      if (waitingForTicketMessage.has(user.id)) {
        const ticketType = waitingForTicketMessage.get(user.id);
        const ticketId = generateTicketId();
        const messageText = text;

        const typeLabels = {
          'GENERAL': '📋 Общая поддержка',
          'BUG': '⚠️ Ошибка',
          'CONTACT': '💬 От пользователя'
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
                `👤 От пользователя: ${user.id} (${user.username ? '@' + user.username : 'ID'})\n` +
                `📝 Тип: ${typeLabel}\n` +
                `⏰ Время: ${new Date().toLocaleString()}\n\n` +
                `📄 Сообщение:\n\`\`\`\n${messageText}\n\`\`\`\n\n` +
                `Команда для ответа: /reply_ticket ${ticketId}`,
                { parse_mode: 'Markdown' }
              );
            } catch (e) {
              logger.warn('BOT', `Failed to notify admin about ticket`, { error: e.message });
            }
          }
        }
        return;
      }

      // ✅ ВЫВОД: ШАГ 1 - СУММА
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
        waitingForWithdrawAddress.set(user.id, amount);
        setStateTimeout(waitingForWithdrawAddress, user.id);
        
        await ctx.reply(
          `✅ Сумма: ${amount.toFixed(8)} USDT\n\nТеперь введите адрес кошелька:`,
          getBackButton()
        );
        logger.info('BOT', `User entered withdraw amount`, { userId: user.id, amount: amount.toFixed(8) });
        return;
      }

      // ✅ ВЫВОД: ШАГ 2 - АДРЕС
      if (waitingForWithdrawAddress.has(user.id)) {
        if (text === '◀️ Назад') {
          waitingForWithdrawAddress.delete(user.id);
          const menu = getMainMenuKeyboard(user.isAdmin);
          await ctx.reply('📋 *Выберите действие:*', menu);
          return;
        }

        const amount = waitingForWithdrawAddress.get(user.id);
        const walletAddress = text.trim();

        if (!validators.validateWalletAddress(walletAddress)) {
          await ctx.reply(
            '❌ Некорректный адрес кошелька. Попробуйте снова:',
            getBackButton()
          );
          logger.warn('BOT', `Invalid wallet address`, { userId: user.id, address: walletAddress });
          return;
        }

        waitingForWithdrawAddress.delete(user.id);

        const currentBalance = await getUserBalance(user.id);
        if (currentBalance < amount) {
          await ctx.reply('❌ Недостаточно средств для вывода.');
          return;
        }

        const usdtToken = await prisma.cryptoToken.findFirst({ 
          where: { symbol: 'USDT' } 
        });
        
        if (!usdtToken) {
          await ctx.reply('❌ Ошибка: USDT не найден.');
          return;
        }

        const withdrawal = await prisma.transaction.create({
          data: {
            userId: user.id,
            tokenId: usdtToken.id,
            type: 'WITHDRAW',
            status: 'PENDING',
            amount: amount.toFixed(8).toString(),
            walletAddress,
            txHash: null
          }
        });

        await prisma.balance.update({
          where: { 
            userId_tokenId_type: { userId: user.id, tokenId: usdtToken.id, type: 'MAIN' } 
          },
          data: { amount: { decrement: amount } }
        });

        logger.info('BOT', `Withdrawal created`, { userId: user.id, amount: amount.toFixed(8), walletAddress });

        await ctx.reply(
          `✅ *Заявка на вывод создана!*\n\n` +
          `💰 Сумма: ${amount.toFixed(8)} USDT\n` +
          `📍 Адрес: \`${walletAddress}\`\n` +
          `⏳ Статус: На обработке\n\n` +
          `Администратор рассмотрит заявку в ближайшее время.`,
          { parse_mode: 'Markdown', ...getMainMenuKeyboard(user.isAdmin) }
        );

        const admins = await prisma.user.findMany({ where: { isAdmin: true } });
        for (const admin of admins) {
          if (admin.telegramId) {
            try {
              await bot.telegram.sendMessage(
                admin.telegramId,
                `💸 НОВАЯ ЗАЯВКА НА ВЫВОД\n\n` +
                `ID: #${withdrawal.id}\n` +
                `👤 Пользователь: ${user.id}\n` +
                `💰 Сумма: ${amount.toFixed(8)} USDT\n` +
                `📍 Адрес: ${walletAddress}\n\n` +
                `Команды:\n` +
                `/approve_withdraw ${withdrawal.id}\n` +
                `/reject_withdraw ${withdrawal.id}`,
                { parse_mode: 'Markdown' }
              );
            } catch (e) {
              logger.warn('BOT', `Failed to send withdrawal notification to admin`, { error: e.message });
            }
          }
        }
        return;
      }

      // ✅ ПОПОЛНЕНИЕ: ШАГ 1 - СУММА
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
        
        const existingDeposit = await prisma.transaction.findFirst({
          where: {
            userId: user.id,
            type: 'DEPOSIT',
            status: 'COMPLETED'
          }
        });
        
        if (user.referredById && !existingDeposit) {
          await ctx.reply(
            `💰 *Пополнение на ${amount.toFixed(8)} USDT*\n\n🎁 Использовать бонус +100%?`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "✅ С БОНУСОМ +100%", callback_data: `confirm_deposit_${amount}_yes` }],
                  [{ text: "💎 БЕЗ БОНУСА", callback_data: `confirm_deposit_${amount}_no` }]
                ]
              },
              parse_mode: "Markdown"
            }
          );
        } else {
          const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);
          if (!invoice) {
            await ctx.reply("❌ Ошибка при создании инвойса.", getMainMenuKeyboard(user.isAdmin));
            return;
          }
          
          scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT');
          
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

      // ✅ ОСНОВНЫЕ КОМАНДЫ
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
          waitingForWithdrawAddress.delete(user.id);
          
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
          waitingForWithdrawAddress.delete(user.id);
          
          const balance = await getUserBalance(user.id);
          if (balance < 1) {
            await ctx.reply('❌ Минимальный баланс для вывода — 1 USDT.');
            return;
          }
          
          waitingForWithdrawAmount.set(user.id, true);
          setStateTimeout(waitingForWithdrawAmount, user.id);
          
          await ctx.reply(
            `💸 *Выберите сумму для вывода:*`,
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
                   `ID: #${tx.id}\n\n`;
          }

          await ctx.reply(msg, { parse_mode: 'Markdown', ...getMainMenuKeyboard(user.isAdmin) });
          break;
        }

        case '👥 Рефералы': {
          try {
            const stats = await referralService.getReferrerStats(user.id);
            const userInfo = await prisma.user.findUnique({
              where: { id: user.id },
              select: { referralCode: true, referrerType: true }
            });
            
            const referralLink = `https://t.me/${ctx.botInfo.username}?start=ref_${userInfo.referralCode}`;
            const typeEmoji = userInfo.referrerType === 'WORKER' ? '👷' : '👤';
            
            const refMsg = `${typeEmoji} *Реферальная программа*\n\n` +
              `🔗 Ваша ссылка:\n\`${referralLink}\`\n\n` +
              `📊 *Статистика:*\n` +
              `👥 Рефералов: ${stats.referralsCount}\n` +
              `💰 Оборот: ${stats.totalTurnover} USDT\n` +
              `✅ Выплачено: ${stats.totalCommissionPaid} USDT\n` +
              `⏳ Накоплено: ${stats.potentialCommission} USDT\n\n` +
              `💎 Ваша комиссия: *${stats.commissionRate}%*`;
            
            await ctx.reply(refMsg, { parse_mode: 'Markdown', ...getMainMenuKeyboard(user.isAdmin) });
          } catch (error) {
            logger.error('BOT', `Error in referrals command`, { error: error.message });
            await ctx.reply('❌ Ошибка при получении информации о рефералах.', getMainMenuKeyboard(user.isAdmin));
          }
          break;
        }

        case '👤 Профиль': {
          const userBal = await getUserBalance(user.id);
          const badges = [];
          if (user.isAdmin) badges.push('👑 АДМИН');
          if (user.referrerType === 'WORKER') badges.push('👷 ВОРКЕР');
          
          await ctx.reply(
            `👤 *Профиль*\n\n` +
            `${user.username ? '@' + user.username : 'ID: ' + user.id}\n` +
            `💰 Баланс: ${userBal.toFixed(8)} USDT` +
            (badges.length ? `\n${badges.join(' | ')}` : ''),
            { parse_mode: 'Markdown', ...getMainMenuKeyboard(user.isAdmin) }
          );
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

        case '❓ Помощь': {
          waitingForDeposit.delete(user.id);
          waitingForWithdrawAmount.delete(user.id);
          waitingForWithdrawAddress.delete(user.id);
          
          await ctx.reply(
            `❓ *Помощь и поддержка*\n\nВыберите тип заявки:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📋 Общая поддержка', callback_data: 'support_general' }],
                  [{ text: '⚠️ Сообщить об ошибке', callback_data: 'support_bug' }],
                  [{ text: '💬 Связаться с админом', callback_data: 'support_contact' }],
                  [{ text: '◀️ Назад', callback_data: 'back_to_menu' }]
                ]
              },
              parse_mode: 'Markdown'
            }
          );
          break;
        }

        case '◀️ Назад': {
          waitingForDeposit.delete(user.id);
          waitingForWithdrawAmount.delete(user.id);
          waitingForWithdrawAddress.delete(user.id);
          await ctx.reply('📋 Выберите действие:', getMainMenuKeyboard(user.isAdmin));
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
    waitingForWithdrawAddress.delete(userId);
    
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
    waitingForWithdrawAddress.delete(userId);
    
    try {
      await ctx.deleteMessage();
    } catch (e) {}
    
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    
    await ctx.reply('❌ Пополнение отменено.', getMainMenuKeyboard(user?.isAdmin || false));
    await ctx.answerCbQuery();
  });

  // ====================================
  // CONFIRM DEPOSIT CALLBACK - ✅ ИСПРАВЛЕНО
  // ====================================
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

      // ✅ ИСПРАВЛЕНИЕ: Удаляем старое сообщение ПЕРЕД созданием инвойса
      try {
        await ctx.deleteMessage();
      } catch (e) {
        logger.debug('BOT', `Failed to delete message`, { error: e.message });
      }

      const description = useBonus 
        ? `Deposit User #${user.id} WITH BONUS +100%`
        : `Deposit User #${user.id}`;

      const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", description, user.id);
      if (!invoice) {
        await ctx.reply("❌ Ошибка создания инвойса.", getMainMenuKeyboard(user.isAdmin));
        await ctx.answerCbQuery("❌ Ошибка");
        return;
      }

      scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT');

      const bonusText = useBonus 
        ? `\n\n🎁 *С БОНУСОМ:*\n• +${amount.toFixed(8)} USDT бонуса\n• Отыграй в 10x\n• Действует 7 дней`
        : `\n\n💎 *БЕЗ БОНУСА:*\n• Сразу на счёт`;

      // ✅ ИСПРАВЛЕНИЕ: Отправляем НОВОЕ сообщение вместо старого
      await ctx.reply(
        `✅ *Инвойс создан*\n\nСумма: ${amount.toFixed(8)} USDT${bonusText}`,
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
      
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('BOT', `Error in confirm_deposit callback`, { error: error.message });
      await ctx.answerCbQuery(`❌ Ошибка: ${error.message}`);
    }
  });

  // ====================================
  // DEPOSIT QUICK AMOUNTS
  // ====================================
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

      const existingDeposit = await prisma.transaction.findFirst({
        where: { userId: user.id, type: 'DEPOSIT', status: 'COMPLETED' }
      });

      // ✅ ИСПРАВЛЕНИЕ: Удаляем сообщение ПЕРЕД отправкой нового
      try {
        await ctx.deleteMessage();
      } catch (e) {}

      if (user.referredById && !existingDeposit) {
        await ctx.reply(
          `💰 *Пополнение на ${amount.toFixed(8)} USDT*\n\n🎁 Использовать бонус +100%?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ С БОНУСОМ +100%", callback_data: `confirm_deposit_${amount}_yes` }],
                [{ text: "💎 БЕЗ БОНУСА", callback_data: `confirm_deposit_${amount}_no` }]
              ]
            },
            parse_mode: "Markdown"
          }
        );
      } else {
        const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);
        if (!invoice) {
          await ctx.reply("❌ Ошибка создания инвойса.", getMainMenuKeyboard(user.isAdmin));
          return await ctx.answerCbQuery();
        }
        
        scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT');
        
        await ctx.reply(
          `✅ *Инвойс создан*\n\n💰 Сумма: ${amount.toFixed(8)} USDT\n⏳ Статус: Ожидание оплаты`,
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
      
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('BOT', `Error in deposit callback`, { error: error.message });
      await ctx.answerCbQuery('❌ Ошибка');
    }
  });

  // ====================================
  // CHECK INVOICE
  // ====================================
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
        await ctx.editMessageText('ℹ️ Инвойс не найден.', { parse_mode: 'Markdown' });
        return;
      }
      
      const invoice = result.items[0];
      
      logger.info('BOT', `Invoice check requested`, { invoiceId, status: invoice.status });
      
      if (invoice.status === 'paid') {
        try {
          await ctx.editMessageText(
            `✅ *Оплата получена!*\n\nДеньги поступают на ваш счёт...`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {
          if (!e.description?.includes('message is not modified')) {
            await ctx.reply('✅ Оплата подтверждена! Деньги зачислены.');
          }
        }
      } else if (invoice.status === 'active') {
        await ctx.editMessageText(
          `⏳ *Инвойс ожидает оплаты*`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '💳 Оплатить', url: invoice.bot_invoice_url }],
                [{ text: '🔄 Проверить снова', callback_data: `check_invoice_${invoiceId}` }],
                [{ text: '◀️ Назад', callback_data: `back_to_menu` }]
              ]
            },
            parse_mode: 'Markdown'
          }
        );
      } else {
        await ctx.editMessageText(
          `❌ Инвойс ${invoice.status}. Попробуйте создать новый.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '◀️ Назад', callback_data: `back_to_menu` }]
              ]
            },
            parse_mode: 'Markdown'
          }
        );
      }
      
    } catch (error) {
      logger.error('BOT', `Error in check_invoice callback`, { error: error.message });
      await ctx.answerCbQuery('⚠️ Ошибка при проверке');
    }
  });

  // ====================================
  // WITHDRAW AMOUNTS
  // ====================================
  bot.action(/withdraw_(\d+)/, async (ctx) => {
    try {
      const amount = parseFloat(ctx.match[1]);
      
      if (!validators.validateWithdrawAmount(amount)) {
        await ctx.answerCbQuery('❌ Некорректная сумма');
        return;
      }
      
      const user = await prisma.user.findUnique({ 
        where: { telegramId: ctx.from.id.toString() } 
      });
      
      if (!user) {
        return await ctx.answerCbQuery('Пользователь не найден.');
      }

      const balance = await getUserBalance(user.id);
      if (balance < amount) {
        await ctx.answerCbQuery('❌ Недостаточно средств.');
        return;
      }

      waitingForWithdrawAddress.set(user.id, amount);
      setStateTimeout(waitingForWithdrawAddress, user.id);
      
      try {
        await ctx.deleteMessage();
      } catch (e) {}
      
      await ctx.reply(
        `✅ Сумма: ${amount.toFixed(8)} USDT\n\nТеперь введите адрес кошелька:`,
        getBackButton()
      );
    } catch (error) {
      logger.error('BOT', `Error in withdraw callback`, { error: error.message });
      await ctx.answerCbQuery('❌ Ошибка');
    }
  });

  bot.action('withdraw_custom', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    
    if (!user) {
      return await ctx.answerCbQuery('Пользователь не найден.');
    }

    const balance = await getUserBalance(user.id);
    waitingForWithdrawAmount.set(user.id, true);
    setStateTimeout(waitingForWithdrawAmount, user.id);
    
    try {
      await ctx.deleteMessage();
    } catch (e) {}
    
    await ctx.reply(
      `Введите сумму вывода (минимум 1 USDT, максимум ${balance.toFixed(8)} USDT):`,
      getBackButton()
    );
  });

  // ====================================
  // ADMIN PANEL CALLBACKS
  // ====================================
  bot.action('admin_show_withdrawals', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('❌ Нет доступа');
      return;
    }

    const pendingWithdrawals = await prisma.transaction.findMany({
      where: { type: 'WITHDRAW', status: 'PENDING' },
      select: { id: true, userId: true, amount: true, walletAddress: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (pendingWithdrawals.length === 0) {
      await ctx.editMessageText('✅ Нет заявок на вывод.', { parse_mode: 'Markdown' });
      await ctx.answerCbQuery();
      return;
    }

    let msg = `💸 *ЗАЯВКИ НА ВЫВОД (${pendingWithdrawals.length}):*\n\n`;
    
    for (const w of pendingWithdrawals) {
      const amount = parseFloat(w.amount.toString());
      const shortAddr = w.walletAddress.length > 15 ? `${w.walletAddress.slice(0,10)}...` : w.walletAddress;
      
      msg += `ID: #${w.id}\n` +
             `👤 User: ${w.userId}\n` +
             `💰 ${amount.toFixed(8)} USDT\n` +
             `📍 ${shortAddr}\n` +
             `⏰ ${new Date(w.createdAt).toLocaleString()}\n\n`;
    }

    const buttons = [];
    for (const w of pendingWithdrawals) {
      buttons.push([
        { text: `✅ #${w.id}`, callback_data: `approve_withdrawal_${w.id}` },
        { text: `❌ #${w.id}`, callback_data: `reject_withdrawal_${w.id}` }
      ]);
    }

    buttons.push([{ text: '◀️ Назад', callback_data: 'back_to_menu' }]);

    await ctx.editMessageText(msg, {
      reply_markup: { inline_keyboard: buttons },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  });

  bot.action('admin_show_tickets', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('❌ Нет доступа');
      return;
    }

    if (supportTickets.size === 0) {
      await ctx.editMessageText('✅ Нет открытых тикетов.', { parse_mode: 'Markdown' });
      await ctx.answerCbQuery();
      return;
    }

    let msg = `🎫 *ПОДДЕРЖКА (${supportTickets.size}):*\n\n`;
    let ticketsList = [];

    for (const [userId, ticket] of supportTickets.entries()) {
      if (ticket.status === 'OPEN' || ticket.status === 'REPLIED') {
        const typeLabel = {
          'GENERAL': '📋',
          'BUG': '⚠️',
          'CONTACT': '💬'
        }[ticket.type] || '❓';

        ticketsList.push({
          id: ticket.ticketId,
          userId,
          type: typeLabel,
          message: ticket.message.substring(0, 40) + (ticket.message.length > 40 ? '...' : '')
        });
      }
    }

    if (ticketsList.length === 0) {
      await ctx.editMessageText('✅ Нет открытых тикетов.', { parse_mode: 'Markdown' });
      await ctx.answerCbQuery();
      return;
    }

    for (const t of ticketsList) {
      msg += `${t.type} ${t.id}\n` +
             `👤 User: ${t.userId}\n` +
             `📝 ${t.message}\n\n`;
    }

    const buttons = [];
    for (const t of ticketsList) {
      buttons.push([
        { text: `💬 ${t.id}`, callback_data: `reply_ticket_action_${t.id}` }
      ]);
    }
    buttons.push([{ text: '◀️ Назад', callback_data: 'back_to_menu' }]);

    await ctx.editMessageText(msg, {
      reply_markup: { inline_keyboard: buttons },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  });

  bot.action(/approve_withdrawal_(\d+)/, async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('❌ Нет доступа');
      return;
    }

    const withdrawalId = parseInt(ctx.match[1]);

    const withdrawal = await prisma.transaction.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      await ctx.answerCbQuery('❌ Заявка не найдена');
      return;
    }

    await prisma.transaction.update({
      where: { id: withdrawalId },
      data: { status: 'COMPLETED', txHash: `APPROVED_${Date.now()}` }
    });

    const userRecord = await prisma.user.findUnique({ 
      where: { id: withdrawal.userId }, 
      select: { telegramId: true } 
    });

    if (userRecord?.telegramId) {
      try {
        await bot.telegram.sendMessage(
          userRecord.telegramId,
          `✅ *Вывод одобрен!*\n\n` +
          `💰 ${parseFloat(withdrawal.amount.toString()).toFixed(8)} USDT\n` +
          `📍 ${withdrawal.walletAddress}\n` +
          `⏰ Средства поступят в течение 24 часов.`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        logger.warn('BOT', `Failed to notify user`, { error: e.message });
      }
    }

    await ctx.answerCbQuery('✅ Вывод одобрен');
    await ctx.reply('✅ Заявка #' + withdrawalId + ' одобрена');
  });

  bot.action(/reject_withdrawal_(\d+)/, async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('❌ Нет доступа');
      return;
    }

    const withdrawalId = parseInt(ctx.match[1]);

    const withdrawal = await prisma.transaction.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      await ctx.answerCbQuery('❌ Заявка не найдена');
      return;
    }

    const token = await prisma.cryptoToken.findUnique({ where: { symbol: 'USDT' } });

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: withdrawalId },
        data: { status: 'REJECTED' }
      });

      if (token) {
        await tx.balance.update({
          where: { 
            userId_tokenId_type: { 
              userId: withdrawal.userId, 
              tokenId: token.id, 
              type: 'MAIN' 
            } 
          },
          data: { amount: { increment: parseFloat(withdrawal.amount.toString()) } }
        });
      }
    });

    const userRecord = await prisma.user.findUnique({ 
      where: { id: withdrawal.userId }, 
      select: { telegramId: true } 
    });

    if (userRecord?.telegramId) {
      try {
        await bot.telegram.sendMessage(
          userRecord.telegramId,
          `❌ *Вывод отклонен*\n\n` +
          `💰 ${parseFloat(withdrawal.amount.toString()).toFixed(8)} USDT\n` +
          `💬 Средства вернулись на ваш счет.\n\n` +
          `Свяжитесь с поддержкой для уточнения деталей.`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        logger.warn('BOT', `Failed to notify user`, { error: e.message });
      }
    }

    await ctx.answerCbQuery('✅ Вывод отклонен');
    await ctx.reply('❌ Заявка #' + withdrawalId + ' отклонена');
  });

  bot.action(/reply_ticket_action_(.+)/, async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('❌ Нет доступа');
      return;
    }

    const ticketId = ctx.match[1];
    adminWaitingForReply.set(user.id, ticketId);

    await ctx.editMessageText(
      `🎫 Тикет: \`${ticketId}\`\n\n` +
      `Напишите ответ для пользователя:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Отмена', callback_data: 'admin_show_tickets' }]
          ]
        },
        parse_mode: 'Markdown'
      }
    );
    await ctx.answerCbQuery();
  });

  // ====================================
  // SUPPORT TICKET CALLBACKS
  // ====================================
  bot.action('support_general', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    if (!user) return;
    
    waitingForTicketMessage.set(user.id, 'GENERAL');
    
    await ctx.editMessageText(
      '📋 *Опишите вашу проблему:*\n\nНапишите подробное описание того, что вам нужно:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '◀️ Назад', callback_data: 'support_back' }]
          ]
        },
        parse_mode: 'Markdown'
      }
    );
    await ctx.answerCbQuery();
  });

  bot.action('support_bug', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    if (!user) return;
    
    waitingForTicketMessage.set(user.id, 'BUG');
    
    await ctx.editMessageText(
      '⚠️ *Сообщить об ошибке*\n\nОпишите ошибку как можно подробнее:\n• Что вы делали\n• Что произошло\n• Какую ошибку вы видели',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '◀️ Назад', callback_data: 'support_back' }]
          ]
        },
        parse_mode: 'Markdown'
      }
    );
    await ctx.answerCbQuery();
  });

  bot.action('support_contact', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    if (!user) return;
    
    waitingForTicketMessage.set(user.id, 'CONTACT');
    
    await ctx.editMessageText(
      '💬 *Связаться с администратором*\n\nНапишите ваше сообщение. Администратор ответит вам в ближайшее время:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '◀️ Назад', callback_data: 'support_back' }]
          ]
        },
        parse_mode: 'Markdown'
      }
    );
    await ctx.answerCbQuery();
  });

  bot.action('support_back', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    if (!user) return;
    
    waitingForTicketMessage.delete(user.id);
    
    await ctx.editMessageText(
      `❓ *Помощь и поддержка*\n\nВыберите тип заявки:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Общая поддержка', callback_data: 'support_general' }],
            [{ text: '⚠️ Сообщить об ошибке', callback_data: 'support_bug' }],
            [{ text: '💬 Связаться с админом', callback_data: 'support_contact' }],
            [{ text: '◀️ Назад', callback_data: 'back_to_menu' }]
          ]
        },
        parse_mode: 'Markdown'
      }
    );
    await ctx.answerCbQuery();
  });

  module.exports = {
    start: () => {
      bot.launch();
      logger.info('BOT', 'Telegram Bot started successfully');
    },
    botInstance: bot,
    cryptoPayAPI
  };
}