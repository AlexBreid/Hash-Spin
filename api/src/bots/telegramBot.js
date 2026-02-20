/**
 * ✅ ПОЛНЫЙ TELEGRAM БОТ - ИСПРАВЛЕН WELCOME MESSAGE ДЛЯ РЕФЕРАЛОВ
 * 
 * ЗАМЕНИ src/bots/telegramBot.js
 */

const { Telegraf } = require('telegraf');
const prisma = require('../../prismaClient');
const { registerNewUser, generateOneTimeToken } = require('../services/authService');
const referralService = require('../services/ReferralService');
const validators = require('../utils/validators');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL;
const WELCOME_IMAGE_PATH = path.join(__dirname, '../../assets/photo_2026-02-12_13-54-34.jpg');
// ID канала для рассылки (формат: @channel_username или -1001234567890)
const BROADCAST_CHANNEL_ID = process.env.BROADCAST_CHANNEL_ID || null;

// ⭐ Telegram Stars Service
let telegramStarsService;
try {
  telegramStarsService = require('../services/telegramStarsService');
} catch (e) {
  }

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
    .replace(/[_*`[]/g, '\\$&');
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
    answer: "Перейди в веб-приложение казино, нажми на баланс и выбери 'Вывод'. Заполни форму и деньги будут отправлены на твой кошелёк."
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

    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, username: true, telegramId: true }
    });

    if (!referrer) {
      return { success: false, reason: 'Referrer not found' };
    }

    if (referrer.id === newUserId) {
      return { success: false, reason: 'Cannot refer yourself' };
    }

    await prisma.user.update({
      where: { id: newUserId },
      data: { referredById: referrer.id }
    });

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
    const userDisplay = newUserUsername ? `@${escapeMarkdown(newUserUsername)}` : 'новый пользователь';
    await bot.telegram.sendMessage(
      referrerTelegramId,
      `🎉 *Новый реферал!*\n\n` +
      `👤 ${userDisplay} присоединился к вашей сети!\n\n` +
      `💰 Когда он пополнит счёт - вы получите комиссию.`,
      { parse_mode: 'Markdown' }
    );
    } catch (error) {
    }
}

// ====================================
// СОСТОЯНИЯ (Maps)
// ====================================

const waitingForTicketMessage = new Map();
// const supportTickets = new Map(); // REMOVED: Using DB now
const adminWaitingForReply = new Map();
const adminWaitingForBroadcast = new Map(); // Состояние ожидания рассылки: userId -> { text: null, photo: null }
const adminWaitingForBonus = new Map(); // Состояние создания бонуса: userId -> { step, data }

// ====================================
// 🛡️ АНТИСПАМ СИСТЕМА
// ====================================

const ANTISPAM_CONFIG = {
  maxMessages: 8,           // Максимум сообщений за период
  timeWindow: 10 * 1000,    // Период отслеживания (10 секунд)
  warnThreshold: 5,         // Порог для предупреждения
  banDuration: 60 * 1000,   // Длительность бана (1 минута)
  cleanupInterval: 60 * 1000, // Интервал очистки (1 минута)
};

// Map: telegramId -> { messages: [timestamps], warned: boolean, bannedUntil: number }
const userMessageHistory = new Map();

// Очистка старой истории сообщений
setInterval(() => {
  const now = Date.now();
  for (const [telegramId, data] of userMessageHistory.entries()) {
    // Удаляем старые сообщения из истории
    data.messages = data.messages.filter(ts => now - ts < ANTISPAM_CONFIG.timeWindow * 2);
    
    // Снимаем бан если истёк
    if (data.bannedUntil && now > data.bannedUntil) {
      data.bannedUntil = null;
      data.warned = false;
      logger.info('ANTISPAM', `Ban lifted for user ${telegramId}`);
    }
    
    // Удаляем запись если пустая
    if (data.messages.length === 0 && !data.bannedUntil) {
      userMessageHistory.delete(telegramId);
    }
  }
}, ANTISPAM_CONFIG.cleanupInterval);

/**
 * Проверяет спам и возвращает результат
 * @returns {{ allowed: boolean, reason?: string, remainingBan?: number }}
 */
function checkAntiSpam(telegramId) {
  const now = Date.now();
  
  // Получаем или создаём запись пользователя
  if (!userMessageHistory.has(telegramId)) {
    userMessageHistory.set(telegramId, { 
      messages: [], 
      warned: false, 
      bannedUntil: null 
    });
  }
  
  const userData = userMessageHistory.get(telegramId);
  
  // Проверяем бан
  if (userData.bannedUntil && now < userData.bannedUntil) {
    const remainingSeconds = Math.ceil((userData.bannedUntil - now) / 1000);
    return { 
      allowed: false, 
      reason: 'banned', 
      remainingBan: remainingSeconds 
    };
  }
  
  // Очищаем старые сообщения из окна
  userData.messages = userData.messages.filter(ts => now - ts < ANTISPAM_CONFIG.timeWindow);
  
  // Добавляем текущее сообщение
  userData.messages.push(now);
  
  const messageCount = userData.messages.length;
  
  // Проверяем превышение лимита -> бан
  if (messageCount > ANTISPAM_CONFIG.maxMessages) {
    userData.bannedUntil = now + ANTISPAM_CONFIG.banDuration;
    userData.warned = false;
    logger.warn('ANTISPAM', `User ${telegramId} banned for spam (${messageCount} messages)`);
    return { 
      allowed: false, 
      reason: 'spam_banned', 
      remainingBan: Math.ceil(ANTISPAM_CONFIG.banDuration / 1000) 
    };
  }
  
  // Проверяем порог предупреждения
  if (messageCount >= ANTISPAM_CONFIG.warnThreshold && !userData.warned) {
    userData.warned = true;
    return { 
      allowed: true, 
      reason: 'warning' 
    };
  }
  
  return { allowed: true };
}

/**
 * Middleware для антиспама
 */
function antiSpamMiddleware() {
  return async (ctx, next) => {
    // Пропускаем callback queries (они обычно не спамятся)
    if (ctx.callbackQuery) {
      return next();
    }
    
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) {
      return next();
    }
    
    const spamCheck = checkAntiSpam(telegramId);
    
    if (!spamCheck.allowed) {
      if (spamCheck.reason === 'banned' || spamCheck.reason === 'spam_banned') {
        // Отправляем сообщение о бане только при первом сообщении в бане
        if (spamCheck.reason === 'spam_banned') {
          try {
            await ctx.reply(
              `🚫 Слишком много сообщений!\n\n` +
              `Вы временно заблокированы на ${spamCheck.remainingBan} сек.\n` +
              `Пожалуйста, подождите и не спамьте.`,
              { parse_mode: 'HTML' }
            );
          } catch (e) {
            // Игнорируем ошибки отправки
          }
        }
        return; // Не обрабатываем сообщение
      }
    }
    
    // Показываем предупреждение
    if (spamCheck.reason === 'warning') {
      try {
        await ctx.reply(
          `⚠️ <b>Внимание!</b>\n\n` +
          `Вы отправляете сообщения слишком быстро.\n` +
          `Замедлитесь, иначе будете временно заблокированы.`,
          { parse_mode: 'HTML' }
        );
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    
    return next();
  };
}

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
  // 🛡️ ПОДКЛЮЧАЕМ АНТИСПАМ MIDDLEWARE
  // ====================================
  bot.use(antiSpamMiddleware());
  logger.info('BOT', 'AntiSpam middleware enabled');

  // ====================================
  // 🔵 СИНЯЯ КНОПКА MINI APP (Menu Button)
  // ====================================
  if (FRONTEND_URL && FRONTEND_URL.startsWith('https://')) {
    bot.telegram.setChatMenuButton({
      menuButton: {
        type: 'web_app',
        text: 'Казино',
        web_app: { url: FRONTEND_URL }
      }
    }).then(() => {
      logger.info('BOT', `Menu button set to: ${FRONTEND_URL}`);
    }).catch(err => {
      logger.warn('BOT', 'Failed to set menu button', { error: err.message });
    });
  } else {
    logger.warn('BOT', 'FRONTEND_URL is not HTTPS, menu button not set');
  }

  // ====================================
  // КЛАВИАТУРЫ
  // ====================================

  const getMainMenuKeyboard = (isAdmin = false) => {
    const baseButtons = [
      [{ text: 'ℹ️ Инфо' }]
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
  // ДЕПОЗИТЫ ЧЕРЕЗ ВЕБ-ПРИЛОЖЕНИЕ
  // ====================================
  // Все депозиты (Stars и Crypto) теперь обрабатываются через веб-приложение
  // и depositRoutes.js

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
        }

      if (!user) {
        const { user: newUser, rawPassword: pwd } = await registerNewUser(ctx.from);
        user = newUser;
        rawPassword = pwd;
        isNewUser = true;
        
        logger.info('BOT', `New user registered`, { userId: user.id, telegramId });

        if (referralCode) {
          try {
            referrerInfo = await applyReferrer(user.id, referralCode);
            
            if (referrerInfo.success) {
              referralApplied = true;
              logger.info('BOT', `Referral link applied`, {
                newUserId: user.id,
                referrerId: referrerInfo.referrerId
              });
              
              if (referrerInfo.referrerTelegramId) {
                try {
                  await notifyReferrerAboutNewReferee(
                    bot,
                    referrerInfo.referrerTelegramId,
                    user.username
                  );
                } catch (notifyError) {
                  logger.warn('BOT', `Failed to notify referrer`, { 
                    error: notifyError.message,
                    referrerTelegramId: referrerInfo.referrerTelegramId 
                  });
                }
              }
            } else {
              }
          } catch (referralError) {
            logger.error('BOT', `Error applying referrer`, { 
              error: referralError.message,
              referralCode 
            });
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // ✅ ИСПРАВЛЕНО: Welcome message БЕЗ Markdown для избежания ошибок
      // ═══════════════════════════════════════════════════════════════

      const commonSlogan = `🎰 Добро пожаловать в SafariUp — Казино будущего! 🌍

🚀 Здесь каждый спин — шаг к выигрышу!
💎 Крипто-ставки без границ
⚡ Мгновенные выплаты
🎁 Ежедневные бонусы и турниры

🔥 Играй. Выигрывай. Наслаждайся.`;

      let credentialsBlock = '';
      if (isNewUser) {
        const username = ctx.from.username;
        const loginDisplay = username ? `@${username}` : `ID: ${user.id}`;
        
        credentialsBlock = `\n\n✨ Ваши данные для входа:\n` +
          `🔑 Логин: ${loginDisplay}\n` +
          `🔐 Пароль: ${rawPassword}\n\n` +
          `⚠️ Сохраните пароль! Он показывается только один раз.`;
        
        if (referralApplied) {
          // Безопасное отображение реферера без спецсимволов
          const referrerDisplay = referrerInfo.referrerUsername 
            ? referrerInfo.referrerUsername.replace(/[_*`]/g, '')
            : `ID${referrerInfo.referrerId}`;
          
          credentialsBlock += `\n\n🎁 Бонус активирован!\n` +
            `✅ Реферер: ${referrerDisplay}\n` +
            `💰 При первом депозите вы получите +100% бонус!`;
        }
      }

      const fullMessage = commonSlogan + credentialsBlock;

      // Отправляем welcome сообщение
      let welcomeSent = false;
      
      // Попытка 1: с картинкой
      try {
        if (fs.existsSync(WELCOME_IMAGE_PATH)) {
          await ctx.replyWithPhoto(
            { source: fs.createReadStream(WELCOME_IMAGE_PATH) },
            { caption: fullMessage }
          );
          welcomeSent = true;
          }
      } catch (imageError) {
        }

      // Попытка 2: без картинки
      if (!welcomeSent) {
        try {
          await ctx.reply(fullMessage);
          welcomeSent = true;
          } catch (textError) {
          }
      }

      // Попытка 3: минимальное сообщение
      if (!welcomeSent) {
        try {
          await ctx.reply('🎰 Добро пожаловать в SafariUp! Используйте меню для навигации.');
          } catch (fallbackError) {
          }
      }

      // Отправляем меню
      try {
        const menu = getMainMenuKeyboard(user.isAdmin);
        await ctx.reply('📋 Выберите действие:', menu);
        } catch (menuError) {
        }

    } catch (error) {
      logger.error('BOT', `Error in /start command`, { error: error.message, stack: error.stack });
      
      try {
        const existingUser = await prisma.user.findUnique({ where: { telegramId } });
        if (existingUser) {
          const menu = getMainMenuKeyboard(existingUser.isAdmin);
          await ctx.reply('🎰 Добро пожаловать в SafariUp! Используйте меню для навигации.', menu);
        } else {
          await ctx.reply('Произошла ошибка при регистрации. Попробуйте позже.');
        }
      } catch (finalError) {
        logger.error('BOT', `Failed to send error message`, { error: finalError.message });
      }
    }
  });

  // ====================================
  // MESSAGE HANDLER
  // ====================================

  bot.on('message', async (ctx) => {
    const text = ctx.message?.text?.trim() || '';
    
    // Пропускаем если нет текста и нет фото (кроме обработки рассылки)
    if (!text && !ctx.message?.photo) return;

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

      // Обработка массовой рассылки
      if (adminWaitingForBroadcast.has(user.id)) {
        const broadcastData = adminWaitingForBroadcast.get(user.id);
        
        // Сохраняем message_id и chat_id для копирования сообщения со всем форматированием
        broadcastData.messageId = ctx.message.message_id;
        broadcastData.chatId = ctx.chat.id;
        
        // Если это фото
        if (ctx.message.photo && ctx.message.photo.length > 0) {
          const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Берем самое большое фото
          broadcastData.photoFileId = photo.file_id;
          broadcastData.photoCaption = ctx.message.caption || '';
          
          await ctx.reply(
            `✅ Сообщение получено!\n\n` +
            `📝 Текст: ${broadcastData.photoCaption || '(нет текста)'}\n` +
            `🖼️ Фото: есть\n\n` +
            `Готово к отправке! (сохраняется форматирование и цитаты)`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ Отправить рассылку', callback_data: 'admin_broadcast_send' }],
                  [{ text: '❌ Отменить', callback_data: 'admin_broadcast_cancel' }]
                ]
              }
            }
          );
          return;
        }
        
        // Если это текст
        if (text && !text.startsWith('/')) {
          broadcastData.text = text;
          
          const preview = `📢 ПРЕВЬЮ РАССЫЛКИ:\n\n`;
          const previewText = broadcastData.text ? `📝 Текст: ${broadcastData.text}\n\n` : '';
          const previewPhoto = broadcastData.photoFileId ? `🖼️ Фото: есть\n` : '';
          const hasReply = ctx.message.reply_to_message ? `💬 Цитата: есть\n` : '';
          
          await ctx.reply(
            preview + previewText + previewPhoto + hasReply + `\nГотовы отправить? (сохраняется форматирование и цитаты)`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ Отправить рассылку', callback_data: 'admin_broadcast_send' }],
                  [{ text: '❌ Отменить', callback_data: 'admin_broadcast_cancel' }]
                ]
              }
            }
          );
          return;
        }
      }

      if (adminWaitingForReply.has(user.id)) {
        const ticketId = adminWaitingForReply.get(user.id);
        adminWaitingForReply.delete(user.id);

        try {
          // Сохраняем ответ админа
          await prisma.supportMessage.create({
            data: {
              ticketId,
              sender: 'ADMIN',
              text: text
            }
          });

          // Обновляем статус тикета
          const ticket = await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status: 'ANSWERED' },
            include: { user: true }
          });

          // Уведомляем пользователя
          if (ticket.user.telegramId) {
            try {
              await bot.telegram.sendMessage(
                ticket.user.telegramId,
                `💬 *Ответ от поддержки*\n\n` +
                `🎫 Тикет #${ticketId}: ${ticket.subject}\n\n` +
                `${text}`,
                { parse_mode: 'Markdown' }
              );
            } catch (e) {
              logger.warn('BOT', `Failed to send reply to user`, { error: e.message });
            }
          }

          await ctx.reply(
            `✅ Ответ отправлен в тикет #${ticketId}`,
            getMainMenuKeyboard(user.isAdmin)
          );

          logger.info('BOT', `Admin replied to ticket`, { ticketId, adminId: user.id });
        } catch (e) {
          logger.error('BOT', `Error saving admin reply`, { error: e.message });
          await ctx.reply('❌ Ошибка при отправке ответа.');
        }
        return;
      }

      // 🎁 WIZARD СОЗДАНИЯ БОНУСА
      if (adminWaitingForBonus.has(user.id)) {
        const state = adminWaitingForBonus.get(user.id);
        
        switch (state.step) {
          case 'NAME':
            state.data.name = text;
            state.step = 'CODE';
            await ctx.reply('Введите код бонуса (например: WELCOME100):');
            break;
            
          case 'CODE':
            state.data.code = text.toUpperCase();
            state.step = 'PERCENTAGE';
            await ctx.reply('Введите процент бонуса (число, например: 100):');
            break;
            
          case 'PERCENTAGE':
            const percent = parseInt(text);
            if (isNaN(percent) || percent < 0) {
              await ctx.reply('❌ Пожалуйста, введите корректное число.');
              return;
            }
            state.data.percentage = percent;
            state.step = 'WAGER';
            await ctx.reply('Введите вейджер (множитель отыгрыша, например: 10):');
            break;
            
          case 'WAGER':
            const wager = parseInt(text);
            if (isNaN(wager) || wager < 0) {
              await ctx.reply('❌ Пожалуйста, введите корректное число.');
              return;
            }
            state.data.wagerMultiplier = wager;
            state.step = 'MIN_DEPOSIT';
            await ctx.reply('Введите минимальный депозит для активации (например: 10):');
            break;
            
          case 'MIN_DEPOSIT':
            const minDep = parseFloat(text);
            if (isNaN(minDep) || minDep < 0) {
              await ctx.reply('❌ Пожалуйста, введите корректное число.');
              return;
            }
            state.data.minDeposit = minDep;
            
            // Финализация: Создаем бонус в БД
            try {
              const bonus = await prisma.bonusTemplate.create({
                data: {
                  name: state.data.name,
                  code: state.data.code,
                  percentage: state.data.percentage,
                  wagerMultiplier: state.data.wagerMultiplier,
                  minDeposit: state.data.minDeposit,
                  isActive: true
                }
              });
              
              adminWaitingForBonus.delete(user.id);
              
              await ctx.reply(
                `✅ Бонус успешно создан!\n\n` +
                `📌 Название: ${bonus.name}\n` +
                `🔑 Код: ${bonus.code}\n` +
                `💰 Процент: ${bonus.percentage}%\n` +
                `🔄 Вейджер: x${bonus.wagerMultiplier}\n` +
                `💵 Мин. депозит: ${bonus.minDeposit}`,
                getMainMenuKeyboard(user.isAdmin)
              );
              
            } catch (error) {
              logger.error('BOT', `Error creating bonus`, { error: error.message });
              await ctx.reply('❌ Ошибка при сохранении бонуса. Возможно, такой код уже существует.');
              adminWaitingForBonus.delete(user.id);
            }
            break;
        }
        return;
      }

      if (waitingForTicketMessage.has(user.id)) {
        const ticketType = waitingForTicketMessage.get(user.id);
        const messageText = text;

        const typeLabels = {
          'GENERAL': 'Общая поддержка',
          'CONTACT': 'От пользователя'
        };

        const typeLabel = typeLabels[ticketType] || ticketType;

        // Создаем тикет в БД
        const ticket = await prisma.supportTicket.create({
          data: {
            userId: user.id,
            subject: `Запрос из бота (${typeLabel})`,
            status: 'OPEN',
            messages: {
              create: {
                sender: 'USER',
                text: messageText
              }
            }
          }
        });

        waitingForTicketMessage.delete(user.id);

        logger.info('BOT', `Support ticket created`, { 
          ticketId: ticket.id, 
          userId: user.id, 
          type: ticketType 
        });

        await ctx.reply(
          `✅ Заявка создана!\n\n` +
          `🎫 Номер: #${ticket.id}\n` +
          `📝 Тип: ${typeLabel}\n` +
          `⏳ Статус: На рассмотрении\n\n` +
          `Администратор рассмотрит вашу заявку в ближайшее время и напишет вам в чат.`,
          getMainMenuKeyboard(user.isAdmin)
        );

        const admins = await prisma.user.findMany({ where: { isAdmin: true } });
        for (const admin of admins) {
          if (admin.telegramId) {
            try {
              await bot.telegram.sendMessage(
                admin.telegramId,
                `🎫 НОВАЯ ЗАЯВКА ПОДДЕРЖКИ\n\n` +
                `🎫 Номер: #${ticket.id}\n` +
                `👤 От пользователя: ${user.id}\n` +
                `📝 Тип: ${typeLabel}\n\n` +
                `📄 Сообщение:\n${messageText}`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: `✍️ Ответить`, callback_data: `reply_ticket_${ticket.id}` }]
                        ]
                    }
                }
              );
            } catch (e) {
              logger.warn('BOT', `Failed to notify admin about ticket`, { error: e.message });
            }
          }
        }
        return;
      }

      // Все депозиты и выводы через веб-приложение
      // Пропускаем switch если нет текста (только фото)
      if (!text) {
        return;
      }

      switch (text) {
        case 'ℹ️ Инфо': {
          const infoMessage = `ℹ️ Информация о проекте\n\n` +
            `📧 Контакты:\n` +
            `Email: safariuptech@gmail.com\n` +
            `Telegram: @Safariup_support\n\n` +
            `📋 О проекте:\n` +
            `SafariUp — это современная платформа для криптовалютных игр с мгновенными выплатами и прозрачной системой бонусов.\n\n` +
            `🎮 Наши игры:\n` +
            `• Сапёр — классическая игра на логику с настраиваемым количеством мин\n` +
            `• Краш — динамичная игра на удачу с растущим множителем\n` +
            `• Плинко — захватывающая игра с физикой и случайными траекториями\n\n` +
            `💎 Преимущества:\n` +
            `• Мгновенные депозиты и выводы\n` +
            `• Безопасные криптовалютные транзакции\n` +
            `• Реферальная программа с бонусами\n` +
            `• Честная игра с прозрачными правилами`;


          await ctx.reply(infoMessage, getMainMenuKeyboard(user.isAdmin));
          break;
        }

        case '⚙️ Админ Панель': {
          if (!user.isAdmin) {
            await ctx.reply('❌ У вас нет доступа.');
            return;
          }

          await ctx.reply(
            `⚙️ Админ Панель\n\nВыберите действие:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🎫 Заявки поддержки', callback_data: 'admin_show_tickets' }],
                  [{ text: '🎁 Бонусы', callback_data: 'admin_bonuses' }],
                  [{ text: '📢 Массовая рассылка', callback_data: 'admin_broadcast' }],
                  [{ text: '◀️ Назад', callback_data: 'back_to_menu' }]
                ]
              }
            }
          );
          break;
        }

        default: {
          // Пропускаем обработку если это фото без текста и не в режиме рассылки
          if (!text && ctx.message?.photo) {
            return;
          }
          const menu = getMainMenuKeyboard(user.isAdmin);
          await ctx.reply('📋 Выберите действие:', menu);
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
    try {
      await ctx.deleteMessage();
    } catch (e) {}
    
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    const menu = getMainMenuKeyboard(user?.isAdmin || false);
    
    await ctx.reply('📋 Выберите действие:', menu);
    await ctx.answerCbQuery();
  });

  // Все депозиты и выводы теперь через веб-приложение

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
            [{ text: '🎫 Поддержка', callback_data: 'admin_show_tickets' }],
            [{ text: '🎁 Бонусы', callback_data: 'admin_bonuses' }],
            [{ text: '📢 Массовая рассылка', callback_data: 'admin_broadcast' }],
            [{ text: '◀️ Назад', callback_data: 'back_to_menu' }]
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

    // Получаем открытые тикеты из БД
    const tickets = await prisma.supportTicket.findMany({
      where: { status: { in: ['OPEN', 'ANSWERED'] } },
      include: { user: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    if (tickets.length === 0) {
      await ctx.editMessageText('Нет открытых тикетов.');
      await ctx.answerCbQuery();
      return;
    }

    let msg = `ПОДДЕРЖКА (${tickets.length}):\n\n`;
    const buttons = [];

    for (const ticket of tickets) {
        const lastMsg = ticket.messages[0]?.text || '(нет сообщений)';
        const shortMsg = lastMsg.substring(0, 30) + (lastMsg.length > 30 ? '...' : '');
        const username = ticket.user?.username || 'No username';
        
        msg += `🎫 #${ticket.id} User: ${username} (ID: ${ticket.userId})\n` +
               `📝 ${ticket.subject}\n` +
               `💬 ${shortMsg}\n\n`;

        buttons.push([
            { text: `✍️ Ответить #${ticket.id}`, callback_data: `reply_ticket_${ticket.id}` },
            { text: `🔒 Закрыть`, callback_data: `close_ticket_${ticket.id}` }
        ]);
    }
    
    buttons.push([{ text: 'Назад', callback_data: 'back_to_admin_menu' }]);

    await ctx.editMessageText(msg, {
      reply_markup: { inline_keyboard: buttons }
    });
    await ctx.answerCbQuery();
  });

  bot.action(/reply_ticket_(\d+)/, async (ctx) => {
    const user = await prisma.user.findUnique({ 
        where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
        await ctx.answerCbQuery('Нет доступа');
        return;
    }

    const ticketId = parseInt(ctx.match[1]);
    
    adminWaitingForReply.set(user.id, ticketId);
    
    await ctx.reply(
        `✍️ Введите ответ для тикета #${ticketId}:`,
        { reply_markup: { force_reply: true } }
    );
    await ctx.answerCbQuery();
  });

  bot.action(/close_ticket_(\d+)/, async (ctx) => {
    const user = await prisma.user.findUnique({ 
        where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
        await ctx.answerCbQuery('Нет доступа');
        return;
    }

    const ticketId = parseInt(ctx.match[1]);

    try {
      const ticket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'CLOSED' },
        include: { user: true }
      });

      // Уведомляем пользователя
      if (ticket.user.telegramId) {
        try {
          await bot.telegram.sendMessage(
            ticket.user.telegramId,
            `🔒 *Тикет #${ticketId} закрыт*\n\n` +
            `Если у вас остались вопросы, вы можете создать новый тикет.`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {
          // ignore
        }
      }

      await ctx.reply(`🔒 Тикет #${ticketId} закрыт.`);
      await ctx.answerCbQuery('Тикет закрыт');
      
      // Обновляем сообщение с кнопками (убираем кнопки)
      try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      } catch (e) {}

    } catch (error) {
      logger.error('BOT', `Error closing ticket`, { error: error.message });
      await ctx.answerCbQuery('Ошибка при закрытии');
    }
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

      const result = await withdrawalService.processWithdrawal(bot, withdrawalId, true);

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

      const result = await withdrawalService.processWithdrawal(bot, withdrawalId, false);

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
  // 📢 МАССОВАЯ РАССЫЛКА
  // ====================================

  bot.action('admin_broadcast', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    await ctx.answerCbQuery();
    
    // Инициализируем состояние рассылки
    adminWaitingForBroadcast.set(user.id, {
      text: null,
      photoFileId: null,
      photoCaption: null,
      messageId: null,
      chatId: null
    });

    await ctx.reply(
      `📢 Массовая рассылка\n\n` +
      `Просто отправьте:\n` +
      `• Фото с текстом (текст в подписи к фото)\n` +
      `• Или просто текст\n\n` +
      `После этого нажмите "Отправить рассылку"`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Отменить', callback_data: 'admin_broadcast_cancel' }]
          ]
        }
      }
    );
  });

  bot.action('admin_broadcast_send', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    const broadcastData = adminWaitingForBroadcast.get(user.id);
    
    if (!broadcastData || (!broadcastData.text && !broadcastData.photoFileId)) {
      await ctx.answerCbQuery('Нет данных для рассылки');
      return;
    }

    await ctx.answerCbQuery('Начинаю рассылку...');

    try {
      // Получаем всех пользователей с telegramId
      const allUsersRaw = await prisma.user.findMany({
        where: {
          isBlocked: false
        },
        select: {
          id: true,
          telegramId: true,
          username: true
        }
      });
      
      // Фильтруем только тех, у кого есть telegramId
      const allUsers = allUsersRaw.filter(user => user.telegramId !== null && user.telegramId !== undefined);
      
      const skippedUsers = allUsersRaw.length - allUsers.length;

      let successCount = 0;
      let failCount = 0;
      const totalUsers = allUsers.length;

      await ctx.reply(
        `📢 Начинаю рассылку...\n\n` +
        `👥 Всего пользователей: ${allUsersRaw.length}\n` +
        `✅ С telegramId: ${totalUsers}\n` +
        `⏭️ Пропущено (без telegramId): ${skippedUsers}`
      );

      // Отправляем сообщения всем пользователям
      // Используем copyMessage для сохранения форматирования и цитат
      if (broadcastData.messageId && broadcastData.chatId) {
        // Копируем сообщение со всем форматированием (включая цитаты)
        for (const targetUser of allUsers) {
          try {
            await bot.telegram.copyMessage(
              targetUser.telegramId,  // Куда копируем
              broadcastData.chatId,   // Откуда копируем (чат админа)
              broadcastData.messageId // ID сообщения для копирования
            );
            
            successCount++;
            
            // Небольшая задержка чтобы не превысить лимиты Telegram (30 сообщений в секунду)
            if (successCount % 25 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            failCount++;
            logger.warn('BOT', `Failed to send broadcast to user ${targetUser.id}`, { 
              error: error.message,
              telegramId: targetUser.telegramId 
            });
          }
        }
      } else {
        // Fallback на старый способ, если нет messageId (для совместимости)
        for (const targetUser of allUsers) {
          try {
            if (broadcastData.photoFileId) {
              const caption = broadcastData.text || broadcastData.photoCaption || '';
              await bot.telegram.sendPhoto(
                targetUser.telegramId,
                broadcastData.photoFileId,
                caption ? { caption, parse_mode: 'HTML' } : {}
              );
            } else if (broadcastData.text) {
              await bot.telegram.sendMessage(
                targetUser.telegramId,
                broadcastData.text,
                { parse_mode: 'HTML' }
              );
            }
            
            successCount++;
            
            if (successCount % 25 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            failCount++;
            logger.warn('BOT', `Failed to send broadcast to user ${targetUser.id}`, { 
              error: error.message,
              telegramId: targetUser.telegramId 
            });
          }
        }
      }

      // Очищаем состояние
      adminWaitingForBroadcast.delete(user.id);

      await ctx.reply(
        `✅ Рассылка завершена!\n\n` +
        `📊 Статистика:\n` +
        `✅ Успешно: ${successCount}\n` +
        `❌ Ошибок: ${failCount}\n` +
        `📈 Отправлено: ${totalUsers}\n` +
        (skippedUsers > 0 ? `⏭️ Пропущено (без telegramId): ${skippedUsers}` : ''),
        getMainMenuKeyboard(user.isAdmin)
      );

      logger.info('BOT', `Broadcast completed`, { 
        adminId: user.id,
        successCount,
        failCount,
        totalUsers
      });

    } catch (error) {
      logger.error('BOT', `Error in broadcast`, { error: error.message });
      adminWaitingForBroadcast.delete(user.id);
      await ctx.reply(
        `❌ Ошибка при рассылке:\n\n${error.message}`,
        getMainMenuKeyboard(user.isAdmin)
      );
    }
  });

  bot.action('admin_broadcast_cancel', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    await ctx.answerCbQuery();
    adminWaitingForBroadcast.delete(user.id);

    await ctx.reply(
      '❌ Рассылка отменена',
      getMainMenuKeyboard(user.isAdmin)
    );
  });

  // ====================================
  // 🎁 БОНУСЫ (АДМИН)
  // ====================================

  bot.action('admin_bonuses', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    const bonuses = await prisma.bonusTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });

    let msg = `🎁 БОНУСЫ (${bonuses.length}):\n\n`;
    const buttons = [];

    if (bonuses.length === 0) {
      msg += 'Нет активных бонусных программ.';
    } else {
      for (const bonus of bonuses) {
        msg += `🔹 *${escapeMarkdown(bonus.name)}*\n` +
               `   Код: \`${escapeMarkdown(bonus.code)}\`\n` +
               `   Бонус: ${bonus.percentage}%\n` +
               `   Вейджер: x${bonus.wagerMultiplier}\n` +
               `   Мин. деп: ${bonus.minDeposit}\n\n`;
        
        buttons.push([{ text: `❌ Удалить ${bonus.code}`, callback_data: `admin_delete_bonus_${bonus.id}` }]);
      }
    }

    buttons.push([{ text: '➕ Создать новый бонус', callback_data: 'admin_create_bonus' }]);
    buttons.push([{ text: '◀️ Назад', callback_data: 'back_to_admin_menu' }]);

    try {
      await ctx.editMessageText(msg, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      // Fallback if markdown fails
      await ctx.editMessageText(msg.replace(/\*/g, '').replace(/`/g, ''), {
        reply_markup: { inline_keyboard: buttons }
      });
    }
    await ctx.answerCbQuery();
  });

  bot.action('admin_create_bonus', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    adminWaitingForBonus.set(user.id, { step: 'NAME', data: {} });

    await ctx.reply(
      '🎁 Создание нового бонуса\n\n' +
      'Введите название бонуса (например: Welcome Bonus):',
      {
        reply_markup: {
          inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'admin_cancel_bonus' }]]
        }
      }
    );
    await ctx.answerCbQuery();
  });

  bot.action('admin_cancel_bonus', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    
    if (user) {
      adminWaitingForBonus.delete(user.id);
      await ctx.reply('❌ Создание бонуса отменено.');
      // Return to bonus list
      // We can trigger the admin_bonuses logic manually or just show menu
    }
    await ctx.answerCbQuery();
  });

  bot.action(/admin_delete_bonus_(\d+)/, async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });

    if (!user || !user.isAdmin) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    const bonusId = parseInt(ctx.match[1]);

    try {
      await prisma.bonusTemplate.delete({ where: { id: bonusId } });
      await ctx.answerCbQuery('Бонус удален');
      
      // Refresh list
      // We can't easily call the handler function, so we just edit the message or send a new one.
      // Simpler to just send a success message and let them navigate back.
      await ctx.reply('✅ Бонус успешно удален.');
      
      // Ideally we would refresh the list, but for now let's just show the menu
    } catch (error) {
      logger.error('BOT', `Error deleting bonus`, { error: error.message });
      await ctx.answerCbQuery('Ошибка при удалении');
    }
  });

  // ====================================
  // ⭐ TELEGRAM STARS PAYMENT HANDLERS
  // ====================================

  // Обработка pre_checkout_query (валидация перед оплатой)
  bot.on('pre_checkout_query', async (ctx) => {
    try {
      const query = ctx.preCheckoutQuery;
      
      logger.info('BOT', 'Pre-checkout query received', {
        id: query.id,
        currency: query.currency,
        total_amount: query.total_amount,
        invoice_payload: query.invoice_payload
      });
      
      if (!telegramStarsService) {
        await ctx.answerPreCheckoutQuery(false, 'Stars платежи временно недоступны');
        return;
      }
      
      // Валидация payload
      const validation = telegramStarsService.validatePreCheckout(query);
      
      if (!validation.valid) {
        logger.warn('BOT', 'Pre-checkout validation failed', { error: validation.error });
        await ctx.answerPreCheckoutQuery(false, validation.error || 'Ошибка валидации');
        return;
      }
      
      // Подтверждаем оплату
      await ctx.answerPreCheckoutQuery(true);
      logger.info('BOT', 'Pre-checkout approved', { payload: validation.payload });
      
    } catch (error) {
      logger.error('BOT', 'Error in pre_checkout_query', { error: error.message });
      try {
        await ctx.answerPreCheckoutQuery(false, 'Внутренняя ошибка');
      } catch (e) {}
    }
  });

  // Обработка успешного платежа Stars
  bot.on('successful_payment', async (ctx) => {
    try {
      const payment = ctx.message.successful_payment;
      
      logger.info('BOT', 'Successful payment received', {
        currency: payment.currency,
        total_amount: payment.total_amount,
        invoice_payload: payment.invoice_payload,
        telegram_payment_charge_id: payment.telegram_payment_charge_id
      });
      
      if (!telegramStarsService) {
        await ctx.reply('⚠️ Ошибка обработки платежа. Обратитесь в поддержку.');
        return;
      }
      
      // Парсим payload
      const payload = telegramStarsService.parseInvoicePayload(payment.invoice_payload);
      
      if (!payload || payload.type !== 'deposit') {
        logger.error('BOT', 'Invalid payment payload', { payload: payment.invoice_payload });
        await ctx.reply('⚠️ Ошибка обработки платежа. Обратитесь в поддержку.');
        return;
      }
      
      // Обрабатываем платёж
      const result = await telegramStarsService.processStarsPayment({
        userId: payload.userId,
        amount: payment.total_amount,
        invoiceId: payment.telegram_payment_charge_id,
        telegramPaymentId: payment.telegram_payment_charge_id
      });
      
      if (result.success) {
        // Отправляем подтверждение
        const bonusText = payload.withBonus ? `\n🎁 Бонус +100% будет начислен!` : '';
        
        await ctx.reply(
          `✅ Пополнение успешно!\n\n` +
          `⭐ Сумма: ${payment.total_amount} Stars\n` +
          `💵 Эквивалент: $${result.amountUSD.toFixed(2)}\n` +
          `💰 Новый баланс: ${result.balance} Stars${bonusText}\n\n` +
          `🎮 Удачной игры!`,
          getMainMenuKeyboard()
        );
        
        logger.info('BOT', 'Stars payment processed successfully', {
          userId: payload.userId,
          starsAmount: payment.total_amount,
          transactionId: result.transactionId
        });
      } else {
        await ctx.reply(
          '⚠️ Платёж получен, но возникла ошибка при зачислении.\n' +
          'Пожалуйста, обратитесь в поддержку с ID платежа:\n' +
          `${payment.telegram_payment_charge_id}`,
          getMainMenuKeyboard()
        );
      }
      
    } catch (error) {
      logger.error('BOT', 'Error processing successful payment', { 
        error: error.message,
        stack: error.stack 
      });
      
      try {
        await ctx.reply(
          '⚠️ Возникла ошибка при обработке платежа.\n' +
          'Пожалуйста, обратитесь в поддержку.',
          getMainMenuKeyboard()
        );
      } catch (e) {}
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
    supportTickets: new Map(), // Dummy map for export compatibility if needed elsewhere
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
