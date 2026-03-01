/**
 * 📊 ПОЛНЫЙ logger.js - КОПИРУЙ ВЕСЬ КОД В src/utils/logger.js
 * Проверено - работает!
 */

const fs = require('fs');
const path = require('path');

// ====================================
// КОНФИГУРАЦИЯ
// ====================================
const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const ENABLE_FILE_LOGGING = process.env.ENABLE_FILE_LOGGING !== 'false';

// Создаём директорию логов
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  console.error(`⚠️ Cannot create logs directory: ${err.message}`);
}

// ====================================
// УРОВНИ И ЦВЕТА ЛОГИРОВАНИЯ
// ====================================
const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG'
};

const COLORS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[35m',
  reset: '\x1b[0m'
};

// ====================================
// КЛАСС ЛОГГЕРА
// ====================================
class Logger {
  log(level, category, message, data = {}) {
    try {
      // Проверяем уровень логирования
      if (!LEVELS.hasOwnProperty(level) || LEVELS[level] > LEVELS[LOG_LEVEL]) {
        return;
      }

      const timestamp = new Date().toISOString();
      const levelName = LEVEL_NAMES[LEVELS[level]];
      
      // ✅ КОНСОЛЬ
      try {
        const prefix = `${COLORS[level]}[${timestamp}] [${levelName}] [${category}]${COLORS.reset}`;
        let output = `${prefix} ${message}`;
        if (level === 'error' && data && typeof data === 'object' && Object.keys(data).length > 0) {
          const dataStr = JSON.stringify(data);
          output += (dataStr.length <= 500 ? ` ${dataStr}` : ` ${dataStr.slice(0, 500)}...`);
        }
        if (level === 'error') {
          console.error(output);
        } else if (level === 'warn') {
          console.warn(output);
        } else {
          console.log(output);
        }
      } catch (err) {
        console.error(`⚠️ Console log failed: ${err.message}`);
      }

      // ✅ ФАЙЛЫ (JSON)
      if (ENABLE_FILE_LOGGING) {
        try {
          const logEntry = {
            timestamp,
            level: levelName,
            category,
            message,
            ...data
          };
          
          const date = timestamp.split('T')[0];
          const logFile = path.join(LOG_DIR, `${level}-${date}.log`);
          
          fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf-8');
        } catch (err) {
          console.error(`⚠️ File log failed: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`❌ Logger error: ${err.message}`);
    }
  }

  // ====================================
  // PUBLIC API
  // ====================================
  
  error(category, message, data) {
    this.log('error', category, message, data);
  }

  warn(category, message, data) {
    this.log('warn', category, message, data);
  }

  info(category, message, data) {
    this.log('info', category, message, data);
  }

  debug(category, message, data) {
    this.log('debug', category, message, data);
  }

  // ====================================
  // SPECIALIZED LOGGING
  // ====================================

  logWebhook(invoiceId, status, userId, amount) {
    this.info('WEBHOOK', `Invoice #${invoiceId} - ${status}`, {
      invoiceId: String(invoiceId),
      status,
      userId: Number(userId),
      amount: Number(amount).toFixed(8)
    });
  }

  logDeposit(userId, amount, asset, status, invoiceId = null) {
    this.info('DEPOSIT', `User ${userId}: ${Number(amount).toFixed(8)} ${asset}`, {
      userId: Number(userId),
      amount: Number(amount).toFixed(8),
      asset: String(asset),
      status: String(status),
      invoiceId: invoiceId ? String(invoiceId) : null
    });
  }

  logWithdraw(userId, amount, address, status, txId = null) {
    this.info('WITHDRAW', `User ${userId}: ${Number(amount).toFixed(8)} USDT`, {
      userId: Number(userId),
      amount: Number(amount).toFixed(8),
      address: address ? `${String(address).slice(0, 6)}...${String(address).slice(-4)}` : 'unknown',
      status: String(status),
      txId: txId ? String(txId) : null
    });
  }

  logCommission(referrerId, refereeId, commission, type = 'REGULAR') {
    this.info('COMMISSION', `${type} commission: ${Number(commission).toFixed(8)} USDT`, {
      referrerId: Number(referrerId),
      refereeId: Number(refereeId),
      commission: Number(commission).toFixed(8),
      type: String(type)
    });
  }

  logAdminAction(adminId, action, targetId, details = {}) {
    this.info('ADMIN_ACTION', `Admin ${adminId}: ${action}`, {
      adminId: Number(adminId),
      action: String(action),
      targetId: Number(targetId),
      ...details
    });
  }

  logDbError(operation, error, context = {}) {
    this.error('DB_ERROR', `${operation}: ${error?.message || String(error)}`, {
      operation: String(operation),
      error: error?.message ? String(error.message) : String(error),
      code: error?.code || 'UNKNOWN',
      ...context
    });
  }

  logApiError(apiName, error, request = {}) {
    this.error('API_ERROR', `${apiName}: ${error?.message || String(error)}`, {
      api: String(apiName),
      error: error?.message ? String(error.message) : String(error),
      statusCode: error?.response?.status || null,
      request: {
        url: request.url ? String(request.url) : null,
        method: request.method ? String(request.method) : null
      }
    });
  }

  logCronJob(jobName, status, result = {}) {
    const logLevel = status === 'error' ? 'error' : 'info';
    this.log(logLevel, 'CRON', `${jobName}: ${status}`, {
      jobName: String(jobName),
      status: String(status),
      ...result
    });
  }
}

// ====================================
// EXPORT SINGLETON
// ====================================
module.exports = new Logger();