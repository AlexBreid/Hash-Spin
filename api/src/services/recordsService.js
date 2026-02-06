/**
 * 📊 RECORDS SERVICE
 * Автоматическое обновление рекордов каждые 24 часа
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

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
  
  // Убираем специальные символы и эмодзи, оставляем только буквы
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
  const variation = 0.15; // ±15%
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
 * Генерирует рекорды из исходных данных
 */
function generateRecords() {
  try {
    // Проверяем наличие исходного файла
    if (!fs.existsSync(SOURCE_FILE)) {
      logger.error('RECORDS', 'Source file not found', { path: SOURCE_FILE });
      return null;
    }

    // Читаем исходный файл
    const data = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
    
    if (!data.users || !Array.isArray(data.users)) {
      logger.error('RECORDS', 'Invalid source file format');
      return null;
    }

    const records = [];
    const timestamp = Date.now();

    // Перемешиваем пользователей
    const shuffledUsers = shuffleArray(data.users);

    shuffledUsers.forEach((user) => {
      const avatar = generateAvatar(user.username);
      
      // Crash запись с рандомизированной суммой
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
      
      // Minesweeper запись
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
      
      // Plinko запись
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

    // Перемешиваем итоговые записи
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
    // Создаём папку если не существует
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
 * Обновляет рекорды
 */
function updateRecords() {
  logger.info('RECORDS', 'Starting records update...');
  
  const records = generateRecords();
  
  if (!records || records.length === 0) {
    logger.error('RECORDS', 'Failed to generate records');
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
      maxScore: Math.max(...records.map(r => r.score)).toFixed(2)
    };
    
    logger.info('RECORDS', 'Records updated successfully', stats);
    return true;
  }
  
  return false;
}

// Переменная для хранения интервала
let updateInterval = null;

/**
 * Запускает автоматическое обновление рекордов
 */
function startRecordsUpdater() {
  // Сначала обновляем сразу
  updateRecords();
  
  // Затем запускаем интервал на 24 часа
  updateInterval = setInterval(() => {
    updateRecords();
  }, UPDATE_INTERVAL);
  
  logger.info('RECORDS', `Records updater started. Next update in 24 hours.`);
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
  generateRecords
};








