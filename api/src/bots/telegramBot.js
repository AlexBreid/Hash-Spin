/**
 * ✅ ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ telegramBot.js
 * 
 * ✅ ИСПРАВЛЕНИЯ:
 * 1. ✅ ПРАВИЛЬНАЯ проверка статуса платежа (цикл с логированием)
 * 2. ✅ ИСПРАВЛЕН парсинг webhook
 * 3. ✅ ID mismatch ИСПРАВЛЕН
 * 4. ✅ DEDUPLICATION работает правильно
 * 5. ✅ Кнопки НАЗАД на ВСЕХ шагах
 * 6. ✅ Визуальная обратная связь о статусе
 * 7. ✅ Кнопка "Проверить статус платежа"
 * 8. ✅ Правильное логирование ВЕЗДЕ
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

// ✅ ИСПРАВЛЕНИЕ: Таймауты для очистки Map'ов
function setStateTimeout(map, userId, timeoutMs = 10 * 60 * 1000) {
  setTimeout(() => {
    if (map.has(userId)) {
      map.delete(userId);
      logger.debug('BOT', `Cleaned up state for user ${userId}`);
    }
  }, timeoutMs);
}

// ====================================
// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ ПРОВЕРКИ ПЛАТЕЖА
// ====================================
async function scheduleDepositCheck(bot, userId, invoiceId, amount, asset = 'USDT') {
  try {
    // ✅ ВАЛИДАЦИЯ
    const userIdNum = parseInt(userId);
    const invoiceIdNum = parseInt(invoiceId);
    const amountNum = parseFloat(amount);
    
    if (isNaN(userIdNum) || isNaN(invoiceIdNum) || isNaN(amountNum)) {
      logger.warn('BOT', 'Invalid parameters for scheduleDepositCheck', { userId, invoiceId, amount });
      return;
    }
    
    // ✅ СОХРАНЯЕМ PENDING (БЕЗ ПЕРЕЗАПИСИ СТАТУСА)
    await prisma.pendingDeposit.upsert({
      where: { invoiceId: invoiceIdNum.toString() },
      create: {
        userId: userIdNum,
        invoiceId: invoiceIdNum.toString(),
        amount: amountNum.toFixed(8).toString(),
        asset: String(asset),
        status: 'pending'
      },
      update: { updatedAt: new Date() } // ✅ ТОЛЬКО обновляем время, НЕ статус!
    });

    logger.info('BOT', `Scheduled deposit check`, { 
      userId: userIdNum, 
      invoiceId: invoiceIdNum,
      amount: amountNum.toFixed(8)
    });

    // ✅ ЦИКЛ ПРОВЕРКИ С ЛОГИРОВАНИЕМ
    let checkCount = 0;
    const maxChecks = 6; // Проверяем 6 раз = 3 минуты
    const checkInterval = 30 * 1000; // 30 секунд

    const checkDeposit = async () => {
      checkCount++;
      logger.debug('BOT', `Deposit check #${checkCount}/${maxChecks}`, { invoiceId: invoiceIdNum });

      try {
        const response = await axios.get(`${CRYPTO_PAY_API}/getInvoices`, {
          headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN },
          params: { invoiceIds: invoiceIdNum }
        });

        // ✅ ЛОГИРУЕМ ОТВЕТ
        if (!response.data) {
          logger.warn('BOT', `No response data`, { invoiceId: invoiceIdNum });
          if (checkCount < maxChecks) {
            setTimeout(checkDeposit, checkInterval);
          }
          return;
        }

        if (!response.data.ok) {
          logger.warn('BOT', `API not ok`, { invoiceId: invoiceIdNum, response: response.data });
          if (checkCount < maxChecks) {
            setTimeout(checkDeposit, checkInterval);
          }
          return;
        }

        if (!response.data.result?.items?.length) {
          logger.warn('BOT', `No items in response`, { invoiceId: invoiceIdNum });
          if (checkCount < maxChecks) {
            setTimeout(checkDeposit, checkInterval);
          }
          return;
        }

        const invoice = response.data.result.items[0];
        
        logger.info('BOT', `Invoice status: ${invoice.status}`, { 
          invoiceId: invoiceIdNum,
          status: invoice.status
        });

        // ✅ ЕСЛИ НЕ PAID - ПРОДОЛЖАЕМ ЖДАТЬ
        if (invoice.status !== 'paid') {
          if (checkCount < maxChecks) {
            setTimeout(checkDeposit, checkInterval);
          } else {
            logger.warn('BOT', `Max checks reached, invoice not paid`, { invoiceId: invoiceIdNum });
            
            // Уведомляем пользователя
            const user = await prisma.user.findUnique({ 
              where: { id: userIdNum }, 
              select: { telegramId: true } 
            });
            if (user?.telegramId) {
              try {
                await bot.telegram.sendMessage(
                  user.telegramId,
                  `⏱️ *Время проверки истекло*\n\nИнвойс всё ещё не оплачен. Статус: ${invoice.status}\n\nПопробуйте снова или свяжитесь с поддержкой.`,
                  { parse_mode: 'Markdown' }
                );
              } catch (e) {
                logger.warn('BOT', `Failed to notify user`, { error: e.message });
              }
            }
          }
          return;
        }

        // ✅ ПЛАТЁЖ ПРИШЁЛ! ОБРАБАТЫВАЕМ
        logger.info('BOT', `Invoice PAID! Processing...`, { invoiceId: invoiceIdNum });

        // 1. Проверяем дубликат (по txHash)
        const existingTx = await prisma.transaction.findFirst({
          where: { 
            txHash: invoiceIdNum.toString(), 
            type: 'DEPOSIT', 
            status: 'COMPLETED' 
          }
        });

        if (existingTx) {
          logger.warn('BOT', `Duplicate invoice detected`, { invoiceId: invoiceIdNum });
          return;
        }

        // 2. Получаем токен
        const token = await prisma.cryptoToken.findUnique({ where: { symbol: asset } });
        if (!token) {
          logger.warn('BOT', `Token not found`, { asset });
          return;
        }

        // 3. ✅ СОЗДАЁМ ТРАНЗАКЦИЮ И БАЛАНС (TRANSACTION)
        await prisma.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              userId: userIdNum,
              tokenId: token.id,
              type: 'DEPOSIT',
              status: 'COMPLETED',
              amount: amountNum.toFixed(8).toString(),
              txHash: invoiceIdNum.toString()
            }
          });

          await tx.balance.upsert({
            where: {
              userId_tokenId_type: { userId: userIdNum, tokenId: token.id, type: 'MAIN' }
            },
            create: { 
              userId: userIdNum, 
              tokenId: token.id, 
              type: 'MAIN', 
              amount: amountNum.toFixed(8).toString() 
            },
            update: { amount: { increment: amountNum } }
          });

          // 4. Пытаемся выдать бонус
          if (asset === 'USDT') {
            try {
              await referralService.grantDepositBonus(userIdNum, amountNum, token.id);
            } catch (e) {
              logger.warn('BOT', `Failed to grant bonus`, { error: e.message });
            }
          }
        });

        // 5. Обновляем pendingDeposit статус
        await prisma.pendingDeposit.update({
          where: { invoiceId: invoiceIdNum.toString() },
          data: { status: 'processed' }
        });

        logger.info('BOT', `Deposit PROCESSED`, {
          userId: userIdNum,
          amount: amountNum.toFixed(8),
          asset
        });

        // 6. Уведомляем пользователя
        try {
          const user = await prisma.user.findUnique({ 
            where: { id: userIdNum }, 
            select: { telegramId: true } 
          });
          if (user?.telegramId) {
            await bot.telegram.sendMessage(
              user.telegramId,
              `✅ *Пополнение успешно!*\n\n💰 +${amountNum.toFixed(8)} ${asset}\n\nДеньги зачислены на ваш счёт. 🎉`,
              { parse_mode: 'Markdown' }
            );
          }
        } catch (e) {
          logger.warn('BOT', `Failed to send deposit notification`, { error: e.message });
        }

      } catch (error) {
        logger.error('BOT', `Error checking invoice`, { invoiceId: invoiceIdNum, error: error.message });
        
        if (checkCount < maxChecks) {
          setTimeout(checkDeposit, checkInterval);
        }
      }
    };

    // Начинаем проверку
    setTimeout(checkDeposit, 5000); // Первая проверка через 5 секунд
    
  } catch (error) {
    logger.error('BOT', `Error scheduling deposit check`, { error: error.message });
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
  const getMainMenuKeyboard = () => ({
    reply_markup: {
      keyboard: [
        [{ text: '🎰 Казино' }],
        [{ text: '💰 Пополнить' }, { text: '💸 Вывести' }],
        [{ text: '📥 Мои выводы' }],
        [{ text: '👥 Рефералы' }, { text: '⚙️ Настройки' }],
        [{ text: '❓ Помощь' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });

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

      const menu = getMainMenuKeyboard();
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

      // ✅ ВЫВОД: ШАГ 1 - СУММА
      if (waitingForWithdrawAmount.has(user.id)) {
        // ✅ ОБРАБОТКА КНОПКИ НАЗАД В РЕЖИМЕ ВВОДА СУММЫ
        if (text === '◀️ Назад') {
          waitingForWithdrawAmount.delete(user.id);
          const menu = getMainMenuKeyboard();
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
        // ✅ ОБРАБОТКА КНОПКИ НАЗАД В РЕЖИМЕ ВВОДА АДРЕСА
        if (text === '◀️ Назад') {
          waitingForWithdrawAddress.delete(user.id);
          const menu = getMainMenuKeyboard();
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
          { parse_mode: 'Markdown', ...getMainMenuKeyboard() }
        );

        const admins = await prisma.user.findMany({ where: { isAdmin: true } });
        for (const admin of admins) {
          if (admin.telegramId) {
            try {
              await bot.telegram.sendMessage(
                admin.telegramId,
                `💸 НОВАЯ ЗАЯВКА НА ВЫВОД\n\nПользователь: ${user.id}\nСумма: ${amount.toFixed(8)} USDT\nАдрес: ${walletAddress}\n\nКоманда: /approve_withdraw ${withdrawal.id}`,
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
        // ✅ ОБРАБОТКА КНОПКИ НАЗАД В РЕЖИМЕ ВВОДА СУММЫ
        if (text === '◀️ Назад') {
          waitingForDeposit.delete(user.id);
          const menu = getMainMenuKeyboard();
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
        
        // Проверяем первый ли это депозит
        const existingDeposit = await prisma.transaction.findFirst({
          where: {
            userId: user.id,
            type: 'DEPOSIT',
            status: 'COMPLETED'
          }
        });
        
        if (user.referredById && !existingDeposit) {
          // ✅ ПОКАЗЫВАЕМ ВОПРОС О БОНУСЕ С КНОПКОЙ НАЗАД
          await ctx.reply(
            `💰 *Пополнение на ${amount.toFixed(8)} USDT*\n\n🎁 Использовать бонус +100%?`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "✅ С БОНУСОМ +100%", callback_data: `confirm_deposit_${amount}_yes` }],
                  [{ text: "💎 БЕЗ БОНУСА", callback_data: `confirm_deposit_${amount}_no` }],
                  [{ text: "◀️ Назад", callback_data: `back_to_menu` }]
                ]
              },
              parse_mode: "Markdown"
            }
          );
        } else {
          // ✅ СОЗДАЁМ ИНВОЙС И ПОКАЗЫВАЕМ КНОПКУ ПРОВЕРКИ
          const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);
          if (!invoice) {
            await ctx.reply("❌ Ошибка при создании инвойса.", getMainMenuKeyboard());
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
          // ✅ ОЧИЩАЕМ СТАРОЕ СОСТОЯНИЕ (если остались)
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
          // ✅ ОЧИЩАЕМ СТАРОЕ СОСТОЯНИЕ (если остались)
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
            await ctx.reply('У вас пока нет заявок на вывод.', getMainMenuKeyboard());
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

          await ctx.reply(msg, { parse_mode: 'Markdown', ...getMainMenuKeyboard() });
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
            
            await ctx.reply(refMsg, { parse_mode: 'Markdown', ...getMainMenuKeyboard() });
          } catch (error) {
            logger.error('BOT', `Error in referrals command`, { error: error.message });
            await ctx.reply('❌ Ошибка при получении информации о рефералах.', getMainMenuKeyboard());
          }
          break;
        }

        case '⚙️ Настройки': {
          const userBal = await getUserBalance(user.id);
          const badges = [];
          if (user.isAdmin) badges.push('👑 АДМИН');
          if (user.referrerType === 'WORKER') badges.push('👷 ВОРКЕР');
          
          await ctx.reply(
            `⚙️ *Настройки*\n\n` +
            `👤 ${user.username ? '@' + user.username : 'ID: ' + user.id}\n` +
            `💰 Основной: ${userBal.toFixed(8)} USDT` +
            (badges.length ? `\n${badges.join(' | ')}` : ''),
            { parse_mode: 'Markdown', ...getMainMenuKeyboard() }
          );
          break;
        }

        case '◀️ Назад': {
          waitingForDeposit.delete(user.id);
          waitingForWithdrawAmount.delete(user.id);
          waitingForWithdrawAddress.delete(user.id);
          await ctx.reply('📋 Выберите действие:', getMainMenuKeyboard());
          break;
        }

        default: {
          const menu = getMainMenuKeyboard();
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
    // ✅ ОЧИЩАЕМ ВСЕ СОСТОЯНИЯ
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
    const menu = user?.isAdmin ? getMainMenuKeyboard() : getMainMenuKeyboard();
    
    await ctx.reply('📋 *Выберите действие:*', menu);
    await ctx.answerCbQuery();
  });

  bot.action('cancel_deposit', async (ctx) => {
    // ✅ ОЧИЩАЕМ СОСТОЯНИЯ
    const userId = parseInt(ctx.from.id);
    waitingForDeposit.delete(userId);
    waitingForWithdrawAmount.delete(userId);
    waitingForWithdrawAddress.delete(userId);
    
    try {
      await ctx.deleteMessage();
    } catch (e) {}
    
    await ctx.reply('❌ Пополнение отменено.', getMainMenuKeyboard());
    await ctx.answerCbQuery();
  });

  bot.action('deposit_custom', async (ctx) => {
    const user = await prisma.user.findUnique({ 
      where: { telegramId: ctx.from.id.toString() } 
    });
    if (!user) return;
    
    waitingForDeposit.set(user.id, true);
    setStateTimeout(waitingForDeposit, user.id);
    
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

      if (user.referredById && !existingDeposit) {
        await ctx.reply(
          `💰 *Пополнение на ${amount.toFixed(8)} USDT*\n\n🎁 Использовать бонус +100%?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ С БОНУСОМ +100%", callback_data: `confirm_deposit_${amount}_yes` }],
                [{ text: "💎 БЕЗ БОНУСА", callback_data: `confirm_deposit_${amount}_no` }],
                [{ text: "◀️ Назад", callback_data: `back_to_menu` }]
              ]
            },
            parse_mode: "Markdown"
          }
        );
      } else {
        const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", `Deposit User #${user.id}`, user.id);
        if (!invoice) {
          await ctx.reply("❌ Ошибка создания инвойса.", getMainMenuKeyboard());
          return await ctx.answerCbQuery();
        }
        
        scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT');
        
        try {
          await ctx.deleteMessage();
        } catch (e) {}
        
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

      const description = useBonus 
        ? `Deposit User #${user.id} WITH BONUS +100%`
        : `Deposit User #${user.id}`;

      const invoice = await cryptoPayAPI.createInvoice(amount, "USDT", description, user.id);
      if (!invoice) {
        await ctx.answerCbQuery("❌ Ошибка создания инвойса.");
        return;
      }

      scheduleDepositCheck(bot, user.id, invoice.invoice_id, amount, 'USDT');

      const bonusText = useBonus 
        ? `\n\n🎁 *С БОНУСОМ:*\n• +${amount.toFixed(8)} USDT бонуса\n• Отыграй в 10x\n• Действует 7 дней`
        : `\n\n💎 *БЕЗ БОНУСА:*\n• Сразу на счёт`;

      try {
        await ctx.deleteMessage();
      } catch (e) {}

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
      
      await ctx.editMessageText(
        `✅ Сумма: ${amount.toFixed(8)} USDT\n\nТеперь введите адрес кошелька:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '◀️ Назад', callback_data: `back_to_menu` }]
            ]
          }
        }
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
    
    await ctx.editMessageText(
      `Введите сумму вывода (минимум 1 USDT, максимум ${balance.toFixed(8)} USDT):`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '◀️ Назад', callback_data: `back_to_menu` }]
          ]
        }
      }
    );
  });

  // ====================================
  // WEBHOOK HANDLER - ✅ ИСПРАВЛЕННЫЙ
  // ====================================
  const handleCryptoPayWebhook = async (req, res) => {
    try {
      // ✅ ПРАВИЛЬНЫЙ ПАРСИНГ WEBHOOK
      let updates = [];
      
      if (req.body.updates && Array.isArray(req.body.updates)) {
        // Формат 1: { updates: [...] }
        updates = req.body.updates;
      } else if (req.body.invoice_id) {
        // Формат 2: { invoice_id: ..., status: ..., ... }
        updates = [req.body];
      } else {
        logger.warn('BOT', `Unknown webhook format`, { body: req.body });
        res.status(200).send('OK');
        return;
      }

      for (const update of updates) {
        // ✅ ПРАВИЛЬНОЕ ИЗВЛЕЧЕНИЕ ДАННЫХ
        const invoice = update.payload || update;
        
        const invoiceId = String(invoice.invoice_id);
        const status = String(invoice.status).toLowerCase();
        const userIdStr = String(invoice.payload);
        const amount = parseFloat(invoice.amount);
        const asset = String(invoice.asset);

        // ✅ ВАЛИДАЦИЯ
        if (!invoiceId || !status || !userIdStr || isNaN(amount) || amount <= 0) {
          logger.warn('BOT', `Invalid webhook parameters`, { 
            invoiceId, status, userIdStr, amount, asset 
          });
          continue;
        }

        const userIdNum = parseInt(userIdStr);
        const invoiceIdNum = parseInt(invoiceId);
        const amountNum = parseFloat(amount);
        
        if (isNaN(userIdNum) || isNaN(invoiceIdNum) || isNaN(amountNum)) {
          logger.warn('BOT', `NaN in webhook`, { userIdNum, invoiceIdNum, amountNum });
          continue;
        }

        logger.info('BOT', `Webhook received`, { 
          invoiceId: invoiceIdNum, 
          status, 
          userId: userIdNum,
          amount: amountNum.toFixed(8)
        });

        // Только для PAID
        if (status !== 'paid') {
          logger.debug('BOT', `Invoice not paid`, { invoiceId: invoiceIdNum, status });
          continue;
        }

        // ✅ ПРОВЕРЯЕМ ДУБЛИКАТ (по txHash = invoiceId)
        const existingTx = await prisma.transaction.findFirst({
          where: {
            txHash: invoiceIdNum.toString(),
            type: 'DEPOSIT',
            status: 'COMPLETED'
          }
        });

        if (existingTx) {
          logger.warn('BOT', `Duplicate invoice`, { invoiceId: invoiceIdNum });
          continue;
        }

        // Получаем токен
        const token = await prisma.cryptoToken.findUnique({
          where: { symbol: asset }
        });

        if (!token) {
          logger.warn('BOT', `Token not found`, { asset });
          continue;
        }

        // ✅ TRANSACTION для атомарности
        await prisma.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              userId: userIdNum,
              tokenId: token.id,
              type: 'DEPOSIT',
              status: 'COMPLETED',
              amount: amountNum.toFixed(8).toString(),
              txHash: invoiceIdNum.toString()
            }
          });

          await tx.balance.upsert({
            where: {
              userId_tokenId_type: {
                userId: userIdNum,
                tokenId: token.id,
                type: 'MAIN'
              }
            },
            create: {
              userId: userIdNum,
              tokenId: token.id,
              type: 'MAIN',
              amount: amountNum.toFixed(8).toString()
            },
            update: {
              amount: { increment: amountNum }
            }
          });
        });

        logger.info('BOT', `Deposit processed from webhook`, {
          userId: userIdNum,
          amount: amountNum.toFixed(8)
        });

        // Выдаём бонус
        if (asset === 'USDT') {
          try {
            await referralService.grantDepositBonus(userIdNum, amountNum, token.id);
          } catch (e) {
            logger.warn('BOT', `Failed to grant bonus from webhook`, { error: e.message });
          }
        }

        // Уведомляем пользователя
        try {
          const userNotif = await prisma.user.findUnique({
            where: { id: userIdNum },
            select: { telegramId: true }
          });

          if (userNotif?.telegramId) {
            await bot.telegram.sendMessage(
              userNotif.telegramId,
              `🎉 *Пополнение успешно!*\n\n✅ +${amountNum.toFixed(8)} ${asset} зачислено на ваш счёт!`,
              { parse_mode: 'Markdown' }
            );
          }
        } catch (e) {
          logger.warn('BOT', `Failed to send webhook notification`, { error: e.message });
        }
      }

      res.status(200).send('OK');

    } catch (error) {
      logger.error('BOT', `Webhook error`, { error: error.message });
      res.status(200).send('OK');
    }
  };

  module.exports = {
    start: () => {
      bot.launch();
      logger.info('BOT', 'Telegram Bot started successfully');
    },
    botInstance: bot,
    cryptoPayAPI,
    handleCryptoPayWebhook
  };
}