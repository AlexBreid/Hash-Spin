/**
 * Скрипт генерации фейковых пользователей и лидерборда
 * 
 * - 300 пользователей с рандомными никами
 * - Рандомная валюта для каждого
 * - Топ-3: ~$50k, ~$20k, ~$10k
 * - Остальные: $9k-$1k
 * - Ежедневное обновление через cron
 */

const prisma = require('../prismaClient');

// Курсы валют (для конвертации USD → крипта)
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

// Список валют
const CURRENCIES = Object.keys(CURRENCY_RATES);

// Рандомные имена для пользователей
const FIRST_NAMES = [
  'Alex', 'Max', 'John', 'Mike', 'Chris', 'David', 'James', 'Robert', 'Daniel', 'Andrew',
  'Ryan', 'Justin', 'Brandon', 'Tyler', 'Kevin', 'Jason', 'Nathan', 'Adam', 'Brian', 'Eric',
  'Steven', 'Mark', 'Paul', 'Jeff', 'Scott', 'Aaron', 'Josh', 'Nick', 'Sean', 'Tim',
  'Crypto', 'Lucky', 'Winner', 'Pro', 'Master', 'King', 'Lord', 'Boss', 'Rich', 'Golden',
  'Dark', 'Shadow', 'Night', 'Star', 'Moon', 'Sun', 'Fire', 'Ice', 'Storm', 'Thunder',
  'Dragon', 'Wolf', 'Tiger', 'Lion', 'Eagle', 'Hawk', 'Bear', 'Shark', 'Snake', 'Phoenix',
  'Ninja', 'Samurai', 'Warrior', 'Knight', 'Hunter', 'Sniper', 'Ghost', 'Phantom', 'Ace', 'Joker',
  'Дима', 'Саша', 'Макс', 'Влад', 'Никита', 'Артём', 'Иван', 'Кирилл', 'Даня', 'Миша',
  'Илья', 'Егор', 'Рома', 'Денис', 'Паша', 'Серёжа', 'Андрей', 'Олег', 'Игорь', 'Вова',
];

const SUFFIXES = [
  '', '_777', '_pro', '_win', '_bet', '_play', '_game', '_cash', '_rich', '_top',
  '2024', '2025', '99', '88', '77', '666', '1337', '_x', '_v2', '_og',
  '_king', '_boss', '_god', '_master', '_legend', '_vip', '_elite', '_alpha', '_prime', '',
];

// Генерация уникального username
function generateUsername(index) {
  const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  const number = Math.random() > 0.5 ? Math.floor(Math.random() * 9999) : '';
  return `${name}${suffix}${number}`.toLowerCase().slice(0, 20);
}

// Генерация уникального telegramId
function generateTelegramId() {
  return `fake_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

// Конвертация USD в крипту
function usdToCrypto(usdAmount, currency) {
  const rate = CURRENCY_RATES[currency] || 1;
  return usdAmount / rate;
}

// Рандомная сумма в диапазоне
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Получить токен по символу
async function getToken(symbol) {
  return await prisma.cryptoToken.findFirst({
    where: { symbol: symbol }
  });
}

/**
 * Создать фейкового пользователя
 */
async function createFakeUser(index) {
  const username = generateUsername(index);
  const telegramId = generateTelegramId();
  
  try {
    const user = await prisma.user.create({
      data: {
        telegramId,
        username: `${username}_${index}`,
        firstName: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
        isAdmin: false,
        isBlocked: false,
      }
    });
    return user;
  } catch (error) {
    // Если username занят, добавляем рандом
    const user = await prisma.user.create({
      data: {
        telegramId: generateTelegramId(),
        username: `${username}_${index}_${Math.floor(Math.random() * 9999)}`,
        firstName: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
      }
    });
    return user;
  }
}

// Типы игр
const GAME_TYPES = ['crash', 'minesweeper', 'plinko'];

/**
 * Создать запись Crash игры
 */
async function createCrashRecord(userId, tokenId, amountInCrypto, multiplier) {
  const betAmount = amountInCrypto / multiplier;
  
  const round = await prisma.crashRound.create({
    data: {
      gameId: `fake_game_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
      crashPoint: multiplier,
      totalPlayers: 1,
      winnersCount: 1,
      totalWagered: betAmount,
      totalPayouts: amountInCrypto,
      serverSeedHash: `fake_hash_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
      clientSeed: `fake_client_${Math.floor(Math.random() * 1000000)}`,
      nonce: Math.floor(Math.random() * 1000000),
    }
  });
  
  await prisma.crashBet.create({
    data: {
      exitMultiplier: multiplier,
      result: 'won',
      betAmount: betAmount,
      winnings: amountInCrypto,
      roundId: round.id,
      userId: userId,
      tokenId: tokenId,
    }
  });
}

/**
 * Создать запись Minesweeper игры
 */
async function createMinesweeperRecord(userId, tokenId, amountInCrypto, multiplier) {
  const betAmount = amountInCrypto / multiplier;
  
  // Получаем случайную сложность
  const difficulties = await prisma.minesweeperDifficulty.findMany();
  const difficulty = difficulties.length > 0 
    ? difficulties[Math.floor(Math.random() * difficulties.length)]
    : null;
  
  if (!difficulty) {
    // Создаём дефолтную сложность если нет
    const defaultDiff = await prisma.minesweeperDifficulty.create({
      data: {
        name: 'Easy',
        minesCount: 3,
        gridSize: 5,
        multiplier: 1.2
      }
    });
    
    await prisma.minesweeperGame.create({
      data: {
        userId: userId,
        tokenId: tokenId,
        difficultyId: defaultDiff.id,
        gameState: JSON.stringify({ completed: true }),
        minesPositions: JSON.stringify([1, 5, 10]),
        status: 'WON',
        revealedCells: 22,
        betAmount: betAmount,
        winAmount: amountInCrypto,
        multiplier: multiplier,
      }
    });
  } else {
    await prisma.minesweeperGame.create({
      data: {
        userId: userId,
        tokenId: tokenId,
        difficultyId: difficulty.id,
        gameState: JSON.stringify({ completed: true }),
        minesPositions: JSON.stringify([1, 5, 10]),
        status: 'WON',
        revealedCells: 22,
        betAmount: betAmount,
        winAmount: amountInCrypto,
        multiplier: multiplier,
      }
    });
  }
}

/**
 * Создать запись Plinko игры
 */
async function createPlinkoRecord(userId, tokenId, amountInCrypto, multiplier) {
  const betAmount = amountInCrypto / multiplier;
  
  await prisma.plinkoGame.create({
    data: {
      userId: userId,
      tokenId: tokenId,
      betAmount: betAmount,
      winAmount: amountInCrypto,
      ballPath: JSON.stringify([0, 1, 0, 1, 0, 1, 0, 1]),
      finalPosition: Math.floor(Math.random() * 15),
      multiplier: multiplier,
      status: 'COMPLETED',
    }
  });
}

/**
 * Создать запись в лидерборде (рандомный тип игры)
 */
async function createWinRecord(userId, tokenId, currency, amountInCrypto, multiplier = null) {
  const mult = multiplier || randomInRange(2, 50);
  const gameType = GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];
  
  switch (gameType) {
    case 'crash':
      await createCrashRecord(userId, tokenId, amountInCrypto, mult);
      break;
    case 'minesweeper':
      await createMinesweeperRecord(userId, tokenId, amountInCrypto, mult);
      break;
    case 'plinko':
      await createPlinkoRecord(userId, tokenId, amountInCrypto, mult);
      break;
  }
}

/**
 * Главная функция генерации
 */
async function generateFakeLeaderboard() {
  console.log('🎮 Генерация фейкового лидерборда...\n');

  // Получаем токены
  const tokens = {};
  for (const currency of CURRENCIES) {
    const token = await getToken(currency);
    if (token) {
      tokens[currency] = token;
      console.log(`✅ Токен ${currency}: ID ${token.id}`);
    }
  }

  if (Object.keys(tokens).length === 0) {
    console.error('❌ Токены не найдены! Сначала синхронизируйте валюты.');
    return;
  }

  console.log('\n📊 Создаю 300 пользователей с рандомными позициями...\n');

  // Создаём всех 300 пользователей сначала
  const users = [];
  for (let i = 1; i <= 300; i++) {
    const user = await createFakeUser(i);
    users.push(user);
    
    if (i % 50 === 0) {
      console.log(`👤 Создано ${i} пользователей...`);
    }
  }

  console.log(`\n✅ Создано ${users.length} пользователей`);
  console.log('\n🎰 Генерирую рандомные выигрыши...\n');

  // Перемешиваем для рандомных позиций
  const shuffled = users.sort(() => Math.random() - 0.5);

  // Топ-3 с большими суммами
  const topAmounts = [
    randomInRange(40000, 60000),  // #1
    randomInRange(15000, 25000),  // #2
    randomInRange(8000, 12000),   // #3
  ];

  for (let i = 0; i < 3; i++) {
    const user = shuffled[i];
    const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const token = tokens[currency];
    
    if (!token) continue;
    
    const amountInCrypto = usdToCrypto(topAmounts[i], currency);
    const multiplier = randomInRange(10, 100);
    
    await createWinRecord(user.id, token.id, currency, amountInCrypto, multiplier);
    
    console.log(`🏆 #${i + 1}: ${user.username} - ${amountInCrypto.toFixed(4)} ${currency}`);
  }

  // Остальные с разбросом от $100 до $8000
  for (let i = 3; i < shuffled.length; i++) {
    const user = shuffled[i];
    const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const token = tokens[currency];
    
    if (!token) continue;
    
    // Рандомная сумма с разбросом
    const usdAmount = randomInRange(100, 8000);
    const amountInCrypto = usdToCrypto(usdAmount, currency);
    const multiplier = randomInRange(1.5, 50);
    
    await createWinRecord(user.id, token.id, currency, amountInCrypto, multiplier);
    
    if ((i + 1) % 50 === 0) {
      console.log(`🎰 Обработано ${i + 1} записей...`);
    }
  }

  console.log('\n✅ Генерация завершена!');
  console.log('📊 Создано 300 фейковых игроков');
  console.log('🔄 Позиции будут меняться каждый день автоматически');
}

/**
 * Ежедневное обновление - добавление новых ставок существующим фейк-пользователям
 */
async function dailyUpdate() {
  console.log('🔄 Ежедневное обновление лидерборда...\n');

  // Получаем фейковых пользователей (по telegramId начинающемуся с fake_)
  const fakeUsers = await prisma.user.findMany({
    where: {
      telegramId: { startsWith: 'fake_' }
    },
    take: 50 // Обновляем 50 рандомных пользователей
  });

  if (fakeUsers.length === 0) {
    console.log('❌ Фейковые пользователи не найдены. Сначала запустите generateFakeLeaderboard()');
    return;
  }

  // Получаем токены
  const tokens = {};
  for (const currency of CURRENCIES) {
    const token = await getToken(currency);
    if (token) tokens[currency] = token;
  }

  // Добавляем новые ставки
  for (const user of fakeUsers) {
    const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const token = tokens[currency];
    
    if (!token) continue;
    
    // Рандомная сумма от $100 до $5000
    const usdAmount = randomInRange(100, 5000);
    const amountInCrypto = usdToCrypto(usdAmount, currency);
    const multiplier = randomInRange(1.5, 20);
    
    await createWinRecord(user.id, token.id, currency, amountInCrypto, multiplier);
  }

  console.log(`✅ Обновлено ${fakeUsers.length} записей`);
}

/**
 * Очистка всех фейковых данных
 */
async function cleanupFakeData() {
  console.log('🗑️ Удаление фейковых данных...\n');

  // Находим фейковых пользователей
  const fakeUsers = await prisma.user.findMany({
    where: {
      telegramId: { startsWith: 'fake_' }
    },
    select: { id: true }
  });

  const userIds = fakeUsers.map(u => u.id);

  // Удаляем фейковые CrashRounds (и связанные CrashBets каскадно)
  const deletedRounds = await prisma.crashRound.deleteMany({
    where: { gameId: { startsWith: 'fake_' } }
  });
  console.log(`🗑️ Удалено ${deletedRounds.count} фейковых Crash раундов`);

  if (userIds.length === 0) {
    console.log('ℹ️ Фейковые пользователи не найдены');
    console.log('\n✅ Очистка завершена!');
    return;
  }

  // Удаляем Crash ставки фейковых пользователей
  const deletedCrashBets = await prisma.crashBet.deleteMany({
    where: { userId: { in: userIds } }
  });
  console.log(`🗑️ Удалено ${deletedCrashBets.count} Crash ставок`);

  // Удаляем Minesweeper игры фейковых пользователей
  const deletedMinesweeper = await prisma.minesweeperGame.deleteMany({
    where: { userId: { in: userIds } }
  });
  console.log(`🗑️ Удалено ${deletedMinesweeper.count} Minesweeper игр`);

  // Удаляем Plinko игры фейковых пользователей
  const deletedPlinko = await prisma.plinkoGame.deleteMany({
    where: { userId: { in: userIds } }
  });
  console.log(`🗑️ Удалено ${deletedPlinko.count} Plinko игр`);

  // Удаляем пользователей
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: userIds } }
  });
  console.log(`🗑️ Удалено ${deletedUsers.count} пользователей`);

  console.log('\n✅ Очистка завершена!');
}

// CLI интерфейс
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case 'generate':
        await generateFakeLeaderboard();
        break;
      case 'daily':
        await dailyUpdate();
        break;
      case 'cleanup':
        await cleanupFakeData();
        break;
      default:
        console.log(`
🎮 Скрипт генерации фейкового лидерборда

Использование:
  node generateFakeLeaderboard.js generate  - Создать 300 фейковых пользователей
  node generateFakeLeaderboard.js daily     - Ежедневное обновление (добавить ставки)
  node generateFakeLeaderboard.js cleanup   - Удалить все фейковые данные
        `);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

module.exports = {
  generateFakeLeaderboard,
  dailyUpdate,
  cleanupFakeData
};

