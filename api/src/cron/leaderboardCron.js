/**
 * Cron для ежедневного обновления фейкового лидерборда
 * Запускается раз в день и добавляет новые "ставки" фейковым пользователям
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');

// Курсы валют
const CURRENCY_RATES = {
  'USDT': 1.0,
  'USDC': 1.0,
  'BTC': 100000,
  'ETH': 3300,
  'BNB': 700,
  'SOL': 200,
  'TRX': 0.25,
  'LTC': 130,
  'TON': 5.5,
};

const CURRENCIES = Object.keys(CURRENCY_RATES);

let cronInterval = null;

// Конвертация USD в крипту
function usdToCrypto(usdAmount, currency) {
  const rate = CURRENCY_RATES[currency] || 1;
  return usdAmount / rate;
}

// Рандом в диапазоне
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Получить токен
async function getToken(symbol) {
  return await prisma.cryptoToken.findFirst({
    where: { symbol }
  });
}

/**
 * Ежедневное обновление лидерборда
 * Симулирует реальных игроков - позиции постоянно меняются
 */
async function dailyLeaderboardUpdate() {
  console.log('\n' + '='.repeat(60));
  console.log('🎮 [LEADERBOARD CRON] Daily shuffle started');
  console.log('📅 Time:', new Date().toISOString());
  console.log('='.repeat(60));

  try {
    // Получаем фейковых пользователей
    const fakeUsers = await prisma.user.findMany({
      where: {
        telegramId: { startsWith: 'fake_' }
      }
    });

    if (fakeUsers.length === 0) {
      console.log('⚠️ No fake users found. Run generateFakeLeaderboard.js first.');
      return { success: false, message: 'No fake users' };
    }

    // Получаем токены
    const tokens = {};
    for (const currency of CURRENCIES) {
      const token = await getToken(currency);
      if (token) tokens[currency] = token;
    }

    // Перемешиваем пользователей
    const shuffledUsers = fakeUsers.sort(() => Math.random() - 0.5);
    
    let created = 0;

    // === НОВЫЙ ТОП-3 (большие выигрыши) ===
    const topAmounts = [
      randomInRange(40000, 60000),  // #1: $40k-$60k
      randomInRange(15000, 25000),  // #2: $15k-$25k  
      randomInRange(8000, 12000),   // #3: $8k-$12k
    ];

    for (let i = 0; i < 3 && i < shuffledUsers.length; i++) {
      const user = shuffledUsers[i];
      const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
      const token = tokens[currency];
      
      if (!token) continue;
      
      const usdAmount = topAmounts[i];
      const amountInCrypto = usdToCrypto(usdAmount, currency);
      const multiplier = randomInRange(10, 100);
      const betAmount = amountInCrypto / multiplier;
      
      await prisma.crashBet.create({
        data: {
          oddsAtBet: 1.0,
          oddsAtExit: multiplier,
          exitMultiplier: multiplier,
          result: 'won',
          betAmount: betAmount,
          winnings: amountInCrypto,
          roundId: `fake_top_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
          userId: user.id,
          tokenId: token.id,
        }
      });
      
      console.log(`🏆 New #${i + 1}: ${user.username} - ${amountInCrypto.toFixed(4)} ${currency}`);
      created++;
    }

    // === ОСТАЛЬНЫЕ ИГРОКИ (рандомные позиции #4-50) ===
    const playersToUpdate = Math.floor(randomInRange(50, 150));
    
    for (let i = 3; i < Math.min(playersToUpdate, shuffledUsers.length); i++) {
      const user = shuffledUsers[i];
      const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
      const token = tokens[currency];
      
      if (!token) continue;
      
      // Рандомная сумма от $100 до $8000 (для разнообразия позиций)
      const usdAmount = randomInRange(100, 8000);
      const amountInCrypto = usdToCrypto(usdAmount, currency);
      const multiplier = randomInRange(1.5, 50);
      const betAmount = amountInCrypto / multiplier;
      
      await prisma.crashBet.create({
        data: {
          oddsAtBet: 1.0,
          oddsAtExit: multiplier,
          exitMultiplier: multiplier,
          result: 'won',
          betAmount: betAmount,
          winnings: amountInCrypto,
          roundId: `fake_daily_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
          userId: user.id,
          tokenId: token.id,
        }
      });
      
      created++;
    }

    console.log(`✅ Created ${created} new entries (positions shuffled)`);
    console.log('='.repeat(60) + '\n');

    return { success: true, created };

  } catch (error) {
    console.error('❌ [LEADERBOARD CRON] Error:', error.message);
    logger.error('LEADERBOARD_CRON', 'Daily update failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Запустить cron (раз в 24 часа)
 */
function startLeaderboardCron(intervalMs = 24 * 60 * 60 * 1000) {
  if (cronInterval) {
    console.log('⚠️ [LEADERBOARD CRON] Already running');
    return;
  }

  console.log('🚀 [LEADERBOARD CRON] Starting (interval: 24 hours)');
  console.log('   First run: in 1 hour\n');

  // Первый запуск через час
  setTimeout(() => {
    dailyLeaderboardUpdate().catch(console.error);
  }, 60 * 60 * 1000); // 1 час

  // Регулярные запуски каждые 24 часа
  cronInterval = setInterval(() => {
    dailyLeaderboardUpdate().catch(console.error);
  }, intervalMs);

  logger.info('LEADERBOARD_CRON', 'Leaderboard cron started');
  console.log('✅ [LEADERBOARD CRON] Initialized\n');
}

/**
 * Остановить cron
 */
function stopLeaderboardCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('🛑 [LEADERBOARD CRON] Stopped');
  }
}

module.exports = {
  dailyLeaderboardUpdate,
  startLeaderboardCron,
  stopLeaderboardCron
};

