/**
 * 📊 RECORDS SERVICE
 * Автоматическое обновление рекордов каждые 24 часа
 * + Обновление createdAt в БД для фейковых пользователей (records_*)
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const prisma = require('../../prismaClient');

// Путь к файлам
const SOURCE_FILE = path.join(__dirname, '../../users_records.json');
const OUTPUT_FILE = path.join(__dirname, '../../../frontend/public/users_records.json');

// Интервал обновления (24 часа в миллисекундах)
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Генерирует аватар из username
 */
function generateAvatar(username) {
  if (!username) return 'A';
  
  const cleanUsername = username.replace(/[^\w\s]/g, '').trim();
  
  if (cleanUsername.length === 0) {
    return username.substring(0, 2).toUpperCase().trim() || 'A';
  }
  
  const words = cleanUsername.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    return cleanUsername.substring(0, 2).toUpperCase();
  }
}

/**
 * Случайное изменение суммы (±15%)
 */
function randomizeAmount(amount) {
  const variation = 0.15;
  const factor = 1 + (Math.random() * variation * 2 - variation);
  return Math.round(amount * factor * 100) / 100;
}

/**
 * Перемешивает массив (Fisher-Yates shuffle)
 */
function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Генерирует случайную дату "сегодня" (рандомное время от 00:00 до текущего момента)
 */
function randomDateToday() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msInDay = now.getTime() - startOfDay.getTime();
  const randomMs = Math.floor(Math.random() * msInDay);
  return new Date(startOfDay.getTime() + randomMs);
}

/**
 * 🔄 Обновляет createdAt для всех записей фейковых пользователей (records_*) в БД
 * Это гарантирует, что рекорды всегда показываются как "сегодняшние"
 */
async function refreshFakeRecordsDates() {
  try {
    // Находим всех фейковых пользователей
    const fakeUsers = await prisma.user.findMany({
      where: { telegramId: { startsWith: 'records_' } },
      select: { id: true }
    });

    if (fakeUsers.length === 0) {
      logger.warn('RECORDS', 'No fake users found (records_*). Run generate_records.js first.');
      return { updated: 0 };
    }

    const userIds = fakeUsers.map(u => u.id);
    const now = new Date();
    
    // Генерируем случайные "сегодняшние" даты для разнообразия
    // Обновляем CrashBet
    const crashBets = await prisma.crashBet.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, roundId: true }
    });

    let crashUpdated = 0;
    for (const bet of crashBets) {
      const randomDate = randomDateToday();
      await prisma.crashBet.update({
        where: { id: bet.id },
        data: { createdAt: randomDate }
      });
      // Обновляем и раунд
      await prisma.crashRound.update({
        where: { id: bet.roundId },
        data: { createdAt: randomDate, updatedAt: randomDate }
      }).catch(() => {}); // Игнорируем если раунд уже обновлён
      crashUpdated++;
    }

    // Обновляем MinesweeperGame
    const minesweeperGames = await prisma.minesweeperGame.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    });

    let minesweeperUpdated = 0;
    for (const game of minesweeperGames) {
      const randomDate = randomDateToday();
      await prisma.minesweeperGame.update({
        where: { id: game.id },
        data: { createdAt: randomDate, updatedAt: randomDate }
      });
      minesweeperUpdated++;
    }

    // Обновляем PlinkoGame
    const plinkoGames = await prisma.plinkoGame.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    });

    let plinkoUpdated = 0;
    for (const game of plinkoGames) {
      const randomDate = randomDateToday();
      await prisma.plinkoGame.update({
        where: { id: game.id },
        data: { createdAt: randomDate }
      });
      plinkoUpdated++;
    }

    const total = crashUpdated + minesweeperUpdated + plinkoUpdated;
    logger.info('RECORDS', `Refreshed dates for ${total} fake records`, {
      crash: crashUpdated,
      minesweeper: minesweeperUpdated,
      plinko: plinkoUpdated,
      fakeUsers: fakeUsers.length
    });

    return { updated: total, crash: crashUpdated, minesweeper: minesweeperUpdated, plinko: plinkoUpdated };

  } catch (error) {
    logger.error('RECORDS', 'Error refreshing fake record dates', { error: error.message });
    return { updated: 0, error: error.message };
  }
}

/**
 * Генерирует рекорды из исходных данных (JSON файл)
 */
function generateRecords() {
  try {
    if (!fs.existsSync(SOURCE_FILE)) {
      logger.error('RECORDS', 'Source file not found', { path: SOURCE_FILE });
      return null;
    }

    const data = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
    
    if (!data.users || !Array.isArray(data.users)) {
      logger.error('RECORDS', 'Invalid source file format');
      return null;
    }

    const records = [];
    const timestamp = Date.now();
    const shuffledUsers = shuffleArray(data.users);

    shuffledUsers.forEach((user) => {
      const avatar = generateAvatar(user.username);
      
      if (user.crash && user.crash.winnings > 0) {
        records.push({
          id: `fake-crash-${user.userId}-${timestamp}`,
          username: user.username,
          score: randomizeAmount(user.crash.winnings),
          gameType: 'crash',
          avatar: avatar,
          isFake: true,
          updatedAt: new Date().toISOString()
        });
      }
      
      if (user.minesweeper && user.minesweeper.winAmount > 0) {
        records.push({
          id: `fake-minesweeper-${user.userId}-${timestamp}`,
          username: user.username,
          score: randomizeAmount(user.minesweeper.winAmount),
          gameType: 'minesweeper',
          avatar: avatar,
          isFake: true,
          updatedAt: new Date().toISOString()
        });
      }
      
      if (user.plinko && user.plinko.winAmount > 0) {
        records.push({
          id: `fake-plinko-${user.userId}-${timestamp}`,
          username: user.username,
          score: randomizeAmount(user.plinko.winAmount),
          gameType: 'plinko',
          avatar: avatar,
          isFake: true,
          updatedAt: new Date().toISOString()
        });
      }
    });

    return shuffleArray(records);
    
  } catch (error) {
    logger.error('RECORDS', 'Error generating records', { error: error.message });
    return null;
  }
}

/**
 * Сохраняет рекорды в файл
 */
function saveRecords(records) {
  try {
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(records, null, 2), 'utf8');
    return true;
  } catch (error) {
    logger.error('RECORDS', 'Error saving records', { error: error.message });
    return false;
  }
}

/**
 * Обновляет рекорды (JSON + даты в БД)
 */
async function updateRecords() {
  logger.info('RECORDS', 'Starting records update...');
  
  // 1. Обновляем даты в БД для фейковых записей (главное!)
  const dbResult = await refreshFakeRecordsDates();
  
  // 2. Обновляем JSON файл (для совместимости)
  const records = generateRecords();
  
  if (!records || records.length === 0) {
    logger.warn('RECORDS', 'No JSON records generated (users_records.json may be missing)');
    // Это не критично — главное что даты в БД обновлены
    if (dbResult.updated > 0) {
      logger.info('RECORDS', 'DB dates refreshed successfully despite missing JSON');
      return true;
    }
    return false;
  }

  const saved = saveRecords(records);
  
  if (saved) {
    const stats = {
      total: records.length,
      crash: records.filter(r => r.gameType === 'crash').length,
      minesweeper: records.filter(r => r.gameType === 'minesweeper').length,
      plinko: records.filter(r => r.gameType === 'plinko').length,
      minScore: Math.min(...records.map(r => r.score)).toFixed(2),
      maxScore: Math.max(...records.map(r => r.score)).toFixed(2),
      dbRecordsRefreshed: dbResult.updated
    };
    
    logger.info('RECORDS', 'Records updated successfully', stats);
    return true;
  }
  
  return false;
}

// Переменная для хранения интервала
let updateInterval = null;

/**
 * Запускает сервис рекордов
 * (Больше не запускает интервал, так как обновление управляется через cron)
 */
function startRecordsUpdater() {
  // Обновляем при старте, чтобы данные были свежими
  updateRecords();
  logger.info('RECORDS', 'Records service initialized (updates managed by cron)');
}

/**
 * Останавливает автоматическое обновление
 */
function stopRecordsUpdater() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    logger.info('RECORDS', 'Records updater stopped');
  }
}

/**
 * Получает текущие рекорды
 */
function getCurrentRecords() {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    }
    return [];
  } catch (error) {
    logger.error('RECORDS', 'Error reading records', { error: error.message });
    return [];
  }
}

module.exports = {
  updateRecords,
  startRecordsUpdater,
  stopRecordsUpdater,
  getCurrentRecords,
  generateRecords,
  refreshFakeRecordsDates
};
