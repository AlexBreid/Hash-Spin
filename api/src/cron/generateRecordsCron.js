/**
 * Cron для ежедневной генерации новых рекордов
 * Запускается каждый день в 1:00 ночи по Москве
 */

const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

let cronTask = null;

/**
 * Запустить скрипт генерации рекордов
 */
function runGenerateRecords() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../generate_records.js');
    
    logger.info('RECORDS_CRON', '🎮 Starting generate_records.js...');
    
    const child = spawn('node', [scriptPath], {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe',
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        stdout += line + '\n';
        logger.info('RECORDS_CRON', `[generate] ${line}`);
      }
    });
    
    child.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        stderr += line + '\n';
        logger.warn('RECORDS_CRON', `[generate stderr] ${line}`);
      }
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        logger.info('RECORDS_CRON', '✅ generate_records.js completed successfully');
        resolve(stdout);
      } else {
        logger.error('RECORDS_CRON', `❌ generate_records.js exited with code ${code}`);
        reject(new Error(`Script exited with code ${code}. stderr: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      logger.error('RECORDS_CRON', `❌ Failed to start generate_records.js: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Запустить скрипт конвертации рекордов
 */
function runConvertRecords() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../convert_records.js');
    
    logger.info('RECORDS_CRON', '📝 Starting convert_records.js...');
    
    const child = spawn('node', [scriptPath], {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe',
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        stdout += line + '\n';
        logger.info('RECORDS_CRON', `[convert] ${line}`);
      }
    });
    
    child.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        stderr += line + '\n';
        logger.warn('RECORDS_CRON', `[convert stderr] ${line}`);
      }
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        logger.info('RECORDS_CRON', '✅ convert_records.js completed successfully');
        resolve(stdout);
      } else {
        logger.error('RECORDS_CRON', `❌ convert_records.js exited with code ${code}`);
        reject(new Error(`Script exited with code ${code}. stderr: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      logger.error('RECORDS_CRON', `❌ Failed to start convert_records.js: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Полный цикл: генерация + конвертация
 */
async function runFullCycle() {
  const startTime = Date.now();
  logger.info('RECORDS_CRON', '🚀 ========== DAILY RECORDS GENERATION STARTED ==========');
  logger.info('RECORDS_CRON', `⏰ Current time: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (MSK)`);
  
  try {
    // Шаг 1: Генерация рекордов
    await runGenerateRecords();
    
    // Шаг 2: Конвертация рекордов  
    await runConvertRecords();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info('RECORDS_CRON', `🎉 ========== COMPLETED in ${duration}s ==========`);
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.error('RECORDS_CRON', `💥 ========== FAILED after ${duration}s ==========`);
    logger.error('RECORDS_CRON', `Error: ${error.message}`);
  }
}

/**
 * Запустить cron (каждый день в 1:00 ночи по Москве)
 */
function startGenerateRecordsCron() {
  if (cronTask) {
    logger.warn('RECORDS_CRON', 'Cron already started');
    return;
  }

  // Cron expression: минута час день месяц день_недели
  // "0 1 * * *" = каждый день в 1:00
  cronTask = cron.schedule('0 1 * * *', async () => {
    await runFullCycle();
  }, {
    scheduled: true,
    timezone: 'Europe/Moscow'
  });

  // Логируем текущее время МСК и время до следующего запуска
  const nowMsk = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  
  // Вычисляем время до следующего запуска
  const now = new Date();
  const mskOffset = 3 * 60; // MSK = UTC+3
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
  const mskNow = new Date(utcNow + (mskOffset * 60000));
  
  const nextRun = new Date(mskNow);
  nextRun.setHours(1, 0, 0, 0);
  if (mskNow >= nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  const diffMs = nextRun.getTime() - mskNow.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  logger.info('RECORDS_CRON', `✅ Cron started — runs daily at 01:00 MSK`);
  logger.info('RECORDS_CRON', `⏰ Current MSK time: ${nowMsk}`);
  logger.info('RECORDS_CRON', `⏳ Next run in: ${diffHours}h ${diffMinutes}m`);
}

/**
 * Остановить cron
 */
function stopGenerateRecordsCron() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('RECORDS_CRON', 'Cron stopped');
  }
}

module.exports = {
  runGenerateRecords,
  runConvertRecords,
  runFullCycle,
  startGenerateRecordsCron,
  stopGenerateRecordsCron
};
