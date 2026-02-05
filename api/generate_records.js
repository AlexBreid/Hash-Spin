const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

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
  'Hellstaff', 'LØV€ YØỮ', 'ᴜɴɪᴄᴏʀɴ', 'I ℓ٥ﻻ ﻉ√٥υ', 'Mr_KiLLaURa', 'Dominator', 'black coffe',
  'Ť.ħ.ê_Ĉ.õ.о.Ł', 'JOEN JUNGKOOK', 'Darkshaper', 'Āłł_Ÿøūrš', 'რฉςh', 'u n i v e r s e',
  'GAMER', 'Skillet', 'FEISKO', 'Bloodray', 'AnnyMars', 'Delan', 'Simple', 'Alien', 'Blackseeker',
  'Crazy', 'Dark_Sun', 'Kerry', 'mym Ђудęm ęгσ НuK', 'Bloodfire', 'ℓo√ﻉ', 'Black_Hawk_Down',
  'Cherry The Countess', 'Aria', 'Mr_Mix', 'Anen', 'Kirizan', 'Lightseeker', 'WOGY', 'Quemal',
  'iSlate', 'Blackstalker', 'Loni', 'Nuliax', 'GawelleN', 'Ironfire', 'Kezan', 'Kitaxe',
  'Miromice', 'breakingthesystem', 'Jay', 'Juce', 'Modar', 'Kizshura', 'Rageseeker', 'Bliss',
  'Topmen', 'Dark Devil', 'DrayLOVE', 'Kit', 'Xisyaco', 'Alsantrius', 'Envias', 'Gralinda',
  'Halloween', 'krot', 'Manesenci', 'SkyHorz', 'Blackbrand', 'Kison', 'Never mind', 'Quashant',
  'your problem', 'DART-SKRIMER', 'Do not lie', 'Dr.What', 'Ese', 'Gavirus', 'GAZANIK',
  'Kakashkaliandiia', 'Knights from Bernin', 'LOVE NEW YORK', 'Not for you', 'someone', 'Zipp↙️',
  'do not', 'Erienan', 'Error parents', 'Eyalanev', 'Fluffy Ratchet', 'Hellblade', 'HELLO',
  'hotmilk', 'JUST', 'Kamick', 'Oveley', 'Tempus', 'AfinaS', 'Azago', 'Elastic Skunk', 'Erennge',
  'Forest Hänter', 'Funny duck', 'Alex', 'Max', 'John', 'Mike', 'Chris', 'David', 'James', 'Robert',
  'Daniel', 'Andrew', 'Ryan', 'Justin', 'Brandon', 'Tyler', 'Kevin', 'Jason', 'Nathan', 'Adam',
  'Brian', 'Eric', 'Steven', 'Mark', 'Paul', 'Jeff', 'Scott', 'Aaron', 'Josh', 'Nick', 'Sean', 'Tim',
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

// Конвертация USD в крипту
function usdToCrypto(usdAmount, currency) {
  const rate = CURRENCY_RATES[currency] || 1;
  return usdAmount / rate;
}

// Рандомная сумма в диапазоне
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Генерация пути для Plinko
function generateBallPath() {
  const path = [];
  for (let i = 0; i < 10; i++) {
    path.push(Math.floor(Math.random() * 2));
  }
  return JSON.stringify(path);
}

// Получить токен по символу
async function getToken(symbol) {
  return await prisma.cryptoToken.findFirst({
    where: { symbol: symbol }
  });
}

/**
 * Удаление старых пользователей и их рекордов
 */
async function deleteOldUsers() {
  console.log('🗑️  Удаление старых пользователей с records_...');
  
  const oldUsers = await prisma.user.findMany({
    where: {
      telegramId: { startsWith: 'records_' }
    },
    select: { id: true }
  });
  
  if (oldUsers.length === 0) {
    console.log('ℹ️  Старых пользователей не найдено');
    return;
  }
  
  const userIds = oldUsers.map(u => u.id);
  
  // Удаляем связанные записи
  await prisma.crashBet.deleteMany({
    where: { userId: { in: userIds } }
  });
  
  await prisma.crashRound.deleteMany({
    where: { gameId: { startsWith: 'crash_' } }
  });
  
  await prisma.minesweeperGame.deleteMany({
    where: { userId: { in: userIds } }
  });
  
  await prisma.plinkoGame.deleteMany({
    where: { userId: { in: userIds } }
  });
  
  // Удаляем пользователей
  await prisma.user.deleteMany({
    where: { id: { in: userIds } }
  });
  
  console.log(`✅ Удалено ${oldUsers.length} старых пользователей и их записи`);
}

/**
 * Создать запись Crash игры
 */
async function createCrashRecord(userId, tokenId, amountInCrypto, multiplier, gameId = null) {
  const betAmount = amountInCrypto / multiplier;
  
  const finalGameId = gameId || `crash_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  
  const round = await prisma.crashRound.create({
    data: {
      gameId: finalGameId,
      crashPoint: multiplier,
      totalPlayers: 1,
      winnersCount: 1,
      totalWagered: betAmount,
      totalPayouts: amountInCrypto,
      serverSeedHash: `hash_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
      clientSeed: `seed_${Math.floor(Math.random() * 1000000)}`,
      nonce: Math.floor(Math.random() * 1000000),
    }
  });
  
  const bet = await prisma.crashBet.create({
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
  
  return {
    tokenId: tokenId,
    betAmount: betAmount,
    exitMultiplier: multiplier,
    winnings: amountInCrypto,
    result: 'won',
    gameId: finalGameId,
    roundId: round.id
  };
}

/**
 * Создать запись Minesweeper игры
 */
async function createMinesweeperRecord(userId, tokenId, amountInCrypto, multiplier) {
  const betAmount = amountInCrypto / multiplier;
  
  const difficulties = await prisma.minesweeperDifficulty.findMany();
  const difficulty = difficulties.length > 0 
    ? difficulties[Math.floor(Math.random() * difficulties.length)]
    : null;
  
  let finalDifficulty;
  if (!difficulty) {
    finalDifficulty = await prisma.minesweeperDifficulty.create({
      data: {
        name: 'Easy',
        minesCount: 3,
        gridSize: 5,
        multiplier: 1.2
      }
    });
  } else {
    finalDifficulty = difficulty;
  }
  
  const revealedCells = Math.floor(randomInRange(10, 24));
  
  await prisma.minesweeperGame.create({
    data: {
      userId: userId,
      tokenId: tokenId,
      difficultyId: finalDifficulty.id,
      gameState: { completed: true },
      minesPositions: { mines: [] },
      status: 'WON',
      revealedCells: revealedCells,
      betAmount: betAmount,
      winAmount: amountInCrypto,
      multiplier: multiplier,
    }
  });
  
  return {
    tokenId: tokenId,
    betAmount: betAmount,
    winAmount: amountInCrypto,
    status: 'WON',
    difficultyId: finalDifficulty.id,
    multiplier: multiplier,
    revealedCells: revealedCells
  };
}

/**
 * Создать запись Plinko игры
 */
async function createPlinkoRecord(userId, tokenId, amountInCrypto, multiplier) {
  const betAmount = amountInCrypto / multiplier;
  const ballPath = generateBallPath();
  const finalPosition = Math.floor(Math.random() * 15);
  
  await prisma.plinkoGame.create({
    data: {
      userId: userId,
      tokenId: tokenId,
      betAmount: betAmount,
      winAmount: amountInCrypto,
      ballPath: ballPath,
      finalPosition: finalPosition,
      multiplier: multiplier,
      status: 'COMPLETED',
    }
  });
  
  return {
    tokenId: tokenId,
    betAmount: betAmount,
    winAmount: amountInCrypto,
    multiplier: multiplier,
    status: 'COMPLETED',
    finalPosition: finalPosition,
    ballPath: ballPath
  };
}

/**
 * Создать рекорд для пользователя (рандомная игра)
 */
async function createWinRecord(userId, tokenId, currency, amountInCrypto, multiplier = null) {
  const mult = multiplier || randomInRange(2, 50);
  const gameTypes = ['crash', 'minesweeper', 'plinko'];
  const gameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
  
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
async function generateRecords() {
  console.log('🎮 Генерация 300 пользователей с рекордами...\n');
  
  // Удаляем старых пользователей
  await deleteOldUsers();
  
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
  
  console.log('\n📊 Создаю 300 пользователей...\n');
  
  // Создаём всех 300 пользователей
  const users = [];
  const usersRecordsData = []; // Массив для хранения данных рекордов
  const usedUsernames = new Set();
  
  for (let i = 1; i <= 300; i++) {
    let username;
    let attempts = 0;
    do {
      username = generateUsername(i);
      attempts++;
      if (attempts > 100) {
        username = `user${i}_${Date.now()}`;
        break;
      }
    } while (usedUsernames.has(username));
    usedUsernames.add(username);
    
    const user = await prisma.user.create({
      data: {
        telegramId: `records_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        username: username,
        firstName: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
        referralCode: `ref_${i}_${Math.random().toString(36).substr(2, 9)}`
      }
    });
    users.push(user);
    
    if (i % 50 === 0) {
      console.log(`👤 Создано ${i} пользователей...`);
    }
  }
  
  console.log(`\n✅ Создано ${users.length} пользователей`);
  console.log('\n🎰 Генерирую рекорды...\n');
  
  // Перемешиваем для рандомных позиций
  const shuffled = users.sort(() => Math.random() - 0.5);
  
  // Топ-3 с большими суммами
  const topAmounts = [
    randomInRange(50000, 60000),  // #1: 50-60k USD
    randomInRange(20000, 30000),  // #2: 20-30k USD
    randomInRange(5000, 10000),   // #3: 5-10k USD
  ];
  
  // Создаем рекорды для топ-3 (для всех трех игр с разными суммами)
  for (let i = 0; i < 3; i++) {
    const user = shuffled[i];
    
    // Для каждой игры своя валюта и сумма
    // Crash
    const crashCurrency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const crashToken = tokens[crashCurrency];
    let crashData = null;
    if (crashToken) {
      const crashUsdAmount = topAmounts[i] * randomInRange(0.8, 1.2); // Вариация ±20%
      const crashAmountInCrypto = usdToCrypto(crashUsdAmount, crashCurrency);
      const crashMultiplier = randomInRange(10, 100);
      crashData = await createCrashRecord(user.id, crashToken.id, crashAmountInCrypto, crashMultiplier);
    }
    
    // Minesweeper
    const minesweeperCurrency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const minesweeperToken = tokens[minesweeperCurrency];
    let minesweeperData = null;
    if (minesweeperToken) {
      const minesweeperUsdAmount = topAmounts[i] * randomInRange(0.8, 1.2); // Вариация ±20%
      const minesweeperAmountInCrypto = usdToCrypto(minesweeperUsdAmount, minesweeperCurrency);
      const minesweeperMultiplier = randomInRange(10, 100);
      minesweeperData = await createMinesweeperRecord(user.id, minesweeperToken.id, minesweeperAmountInCrypto, minesweeperMultiplier);
    }
    
    // Plinko
    const plinkoCurrency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const plinkoToken = tokens[plinkoCurrency];
    let plinkoData = null;
    if (plinkoToken) {
      const plinkoUsdAmount = topAmounts[i] * randomInRange(0.8, 1.2); // Вариация ±20%
      const plinkoAmountInCrypto = usdToCrypto(plinkoUsdAmount, plinkoCurrency);
      const plinkoMultiplier = randomInRange(10, 100);
      plinkoData = await createPlinkoRecord(user.id, plinkoToken.id, plinkoAmountInCrypto, plinkoMultiplier);
    }
    
    // Сохраняем данные для users_records.json
    if (crashData && minesweeperData && plinkoData) {
      usersRecordsData.push({
        userId: user.id,
        username: user.username || `user${user.id}`,
        crash: {
          userId: user.id,
          username: user.username || `user${user.id}`,
          ...crashData
        },
        minesweeper: {
          userId: user.id,
          username: user.username || `user${user.id}`,
          ...minesweeperData
        },
        plinko: {
          userId: user.id,
          username: user.username || `user${user.id}`,
          ...plinkoData
        }
      });
    }
    
    console.log(`🏆 #${i + 1}: ${user.username} - ~${topAmounts[i].toFixed(0)} USD (разные суммы для каждой игры)`);
  }
  
  // Остальные с разбросом от $100 до $8000 (для всех трех игр с разными суммами)
  for (let i = 3; i < shuffled.length; i++) {
    const user = shuffled[i];
    
    // Для каждой игры своя валюта и сумма
    // Crash
    const crashCurrency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const crashToken = tokens[crashCurrency];
    let crashData = null;
    if (crashToken) {
      const crashUsdAmount = randomInRange(100, 8000);
      const crashAmountInCrypto = usdToCrypto(crashUsdAmount, crashCurrency);
      const crashMultiplier = randomInRange(1.5, 50);
      crashData = await createCrashRecord(user.id, crashToken.id, crashAmountInCrypto, crashMultiplier);
    }
    
    // Minesweeper
    const minesweeperCurrency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const minesweeperToken = tokens[minesweeperCurrency];
    let minesweeperData = null;
    if (minesweeperToken) {
      const minesweeperUsdAmount = randomInRange(100, 8000);
      const minesweeperAmountInCrypto = usdToCrypto(minesweeperUsdAmount, minesweeperCurrency);
      const minesweeperMultiplier = randomInRange(1.5, 50);
      minesweeperData = await createMinesweeperRecord(user.id, minesweeperToken.id, minesweeperAmountInCrypto, minesweeperMultiplier);
    }
    
    // Plinko
    const plinkoCurrency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    const plinkoToken = tokens[plinkoCurrency];
    let plinkoData = null;
    if (plinkoToken) {
      const plinkoUsdAmount = randomInRange(100, 8000);
      const plinkoAmountInCrypto = usdToCrypto(plinkoUsdAmount, plinkoCurrency);
      const plinkoMultiplier = randomInRange(1.5, 50);
      plinkoData = await createPlinkoRecord(user.id, plinkoToken.id, plinkoAmountInCrypto, plinkoMultiplier);
    }
    
    // Сохраняем данные для users_records.json
    if (crashData && minesweeperData && plinkoData) {
      usersRecordsData.push({
        userId: user.id,
        username: user.username || `user${user.id}`,
        crash: {
          userId: user.id,
          username: user.username || `user${user.id}`,
          ...crashData
        },
        minesweeper: {
          userId: user.id,
          username: user.username || `user${user.id}`,
          ...minesweeperData
        },
        plinko: {
          userId: user.id,
          username: user.username || `user${user.id}`,
          ...plinkoData
        }
      });
    }
    
    if ((i + 1) % 50 === 0) {
      console.log(`🎰 Обработано ${i + 1} записей...`);
    }
  }
  
  console.log('\n✅ Генерация завершена!');
  console.log('📊 Создано 300 пользователей с рекордами в разных криптовалютах');
  
  // Создаем users_records.json для convert_records.js
  console.log('\n📝 Создаю users_records.json...');
  createUsersRecordsFileFromData(usersRecordsData);
}

/**
 * Создать users_records.json файл из сохраненных данных
 */
function createUsersRecordsFileFromData(usersRecordsData) {
  const data = {
    users: usersRecordsData,
    metadata: {
      totalUsers: usersRecordsData.length,
      games: ['crash', 'minesweeper', 'plinko'],
      winRange: {
        min: 1000,
        max: 3000
      },
      tokenId: 2,
      generatedAt: new Date().toISOString()
    }
  };
  
  fs.writeFileSync('users_records.json', JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Создан users_records.json с ${usersRecordsData.length} пользователями`);
}

// Запуск
async function main() {
  try {
    await generateRecords();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

