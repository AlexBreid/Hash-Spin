/**
 * Cron для ежедневной генерации новых рекордов
 * Запускается каждый день в 1:00 ночи
 */

const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

let cronInterval = null;
let nextRunTimeout = null;

/**
 * Вычислить время до следующего запуска в 1:00 ночи
 */
function getTimeUntilNextRun() {
  const now = new Date();
  const nextRun = new Date();
  
  // Устанавливаем время на 1:00 ночи
  nextRun.setHours(1, 0, 0, 0);
  
  // Если уже прошло 1:00 сегодня, планируем на завтра
  if (now >= nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun.getTime() - now.getTime();
}

/**
 * Запустить скрипт генерации рекордов
 */
async function runGenerateRecords() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../generate_records.js');
    
    logger.info('RECORDS_CRON', 'Starting generate_records.js script...');
    
    const child = spawn('node', [scriptPath], {
      cwd: path.join(__dirname, '../..'),
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        logger.info('RECORDS_CRON', 'generate_records.js completed successfully');
        resolve();
      } else {
        logger.error('RECORDS_CRON', `generate_records.js exited with code ${code}`);
        reject(new Error(`Script exited with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      logger.error('RECORDS_CRON', `Failed to start generate_records.js: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Запустить cron (каждый день в 1:00 ночи)
 */
function startGenerateRecordsCron() {
  if (cronInterval || nextRunTimeout) {
    logger.warn('RECORDS_CRON', 'Cron already started');
    return;
  }

  function scheduleNextRun() {
    const timeUntilNext = getTimeUntilNextRun();
    const hoursUntilNext = Math.floor(timeUntilNext / (1000 * 60 * 60));
    const minutesUntilNext = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
    
    logger.info('RECORDS_CRON', `Next run scheduled in ${hoursUntilNext}h ${minutesUntilNext}m`);
    
    nextRunTimeout = setTimeout(async () => {
      try {
        await runGenerateRecords();
        
        // После выполнения запускаем convert_records.js
        const convertPath = path.join(__dirname, '../../convert_records.js');
        const convertChild = spawn('node', [convertPath], {
          cwd: path.join(__dirname, '../..'),
          stdio: 'inherit',
          shell: true
        });
        
        convertChild.on('close', (code) => {
          if (code === 0) {
            logger.info('RECORDS_CRON', 'convert_records.js completed successfully');
          } else {
            logger.error('RECORDS_CRON', `convert_records.js exited with code ${code}`);
          }
        });
        
      } catch (error) {
        logger.error('RECORDS_CRON', `Error running generate_records: ${error.message}`);
      }
      
      // Планируем следующий запуск
      scheduleNextRun();
    }, timeUntilNext);
  }

  // Запускаем первый раз
  scheduleNextRun();
  
  logger.info('RECORDS_CRON', 'Generate records cron started (runs daily at 1:00 AM)');
}

/**
 * Остановить cron
 */
function stopGenerateRecordsCron() {
  if (nextRunTimeout) {
    clearTimeout(nextRunTimeout);
    nextRunTimeout = null;
  }
  
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
  
  logger.info('RECORDS_CRON', 'Generate records cron stopped');
}

module.exports = {
  runGenerateRecords,
  startGenerateRecordsCron,
  stopGenerateRecordsCron
};

