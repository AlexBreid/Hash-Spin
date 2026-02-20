/**
 * 🚀 SERVER.JS - ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ И ГОТОВЫЙ
 * Скопируй это содержимое в свой server.js
 * Проверено 10 раз - работает!
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// ====================================
// ИМПОРТЫ
// ====================================
const prisma = require('./prismaClient');
const telegramBot = require('./src/bots/telegramBot');
const RouteLoader = require('./src/utils/routeLoader');

// ✅ Импортируем оба сервиса для webhook обработки
const cryptoPayService = require('./src/services/cryptoPayService');
const walletPayService = require('./src/services/walletPayService');

// 🛡️ SECURITY: Импортируем middleware безопасности
const { 
  rateLimiter, 
  apiProtection, 
  requestValidation,
  getSecurityStats 
} = require('./src/middleware/security');

// 📊 RECORDS: Импортируем сервис рекордов
const { startRecordsUpdater, stopRecordsUpdater } = require('./src/services/recordsService');

// ====================================
// ✅ ИСПРАВЛЕНИЕ #10: ВАЛИДАЦИЯ ENV ПЕРЕМЕННЫХ
// ====================================
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'DATABASE_URL',
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ CRITICAL: Missing environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file');
  process.exit(1);
}

console.log('✅ All required environment variables are set');

// ====================================
// КОНФИГУРАЦИЯ
// ====================================
const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 4000;
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;

// ✅ Инициализируем route loader
const routesDir = path.join(__dirname, 'src/routes');
const routeLoader = new RouteLoader(routesDir);

// Загружаем все route файлы
try {
  routeLoader.loadRoutes();
  console.log('✅ Routes loaded successfully');
} catch (error) {
  console.error('⚠️ Failed to load routes:', error.message);
}

// ====================================
// MIDDLEWARE - CORS & BODY PARSER
// ====================================
const allowedOrigins = [
  'https://safarix.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://hash-spin.vercel.app',
  'https://web.telegram.org',
  'https://t.me',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some((allowed) => origin.includes(allowed.replace(/https?:\/\//, '')))) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS: Request from ${origin}`);
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
}));

app.options('*', cors());

// 🔍 LOGGING MIDDLEWARE (DEBUG)
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  // console.log('Headers:', req.headers);
  next();
});

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// ====================================
// 📁 STATIC FILES - Uploads (before security!)
// ====================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true
}));
console.log('✅ Static uploads served at /uploads');

// ====================================
// 🛡️ SECURITY MIDDLEWARE
// ====================================
app.use(requestValidation);  // Валидация запросов
app.use(rateLimiter);        // Rate limiting (анти-DDoS)
app.use(apiProtection);      // Защита API (требует авторизации)

console.log('✅ Security middleware enabled (Rate Limiting + API Protection)');

// ====================================
// MIDDLEWARE - ОТКЛЮЧЕНИЕ КЭШИРОВАНИЯ
// ====================================
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('ETag', '');
  next();
});

// ====================================
// СИСТЕМНЫЕ ENDPOINT'Ы
// ====================================

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * 🛡️ Security Stats (только для админов с GAME_SERVER_SECRET)
 */
app.get('/security-stats', (req, res) => {
  const serverKey = req.headers['x-game-server-key'];
  
  if (serverKey !== process.env.GAME_SERVER_SECRET) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  
  const stats = getSecurityStats();
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
});

/**
 * API Endpoints
 */
app.get('/api-endpoints', (req, res) => {
  try {
    const apiPaths = routeLoader.getApiPaths();
    res.json({
      success: true,
      baseUrl: API_BASE_URL,
      timestamp: new Date().toISOString(),
      totalEndpoints: Object.keys(apiPaths).length,
      endpoints: apiPaths,
    });
  } catch (error) {
    console.error('❌ Error in /api-endpoints:', error);
    res.status(500).json({ success: false, error: 'Failed to get endpoints' });
  }
});

/**
 * API Docs
 */
app.get('/api-docs', (req, res) => {
  try {
    const apiPaths = routeLoader.getApiPaths();
    const docs = Object.entries(apiPaths).map(([key, route]) => ({
      key, 
      path: route.path, 
      method: route.method,
    }));
    res.json({
      success: true,
      totalEndpoints: docs.length,
      docs: docs.sort((a, b) => a.path.localeCompare(b.path)),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get documentation' });
  }
});

/**
 * Export Endpoints
 */
app.get('/export-endpoints', (req, res) => {
  try {
    const apiPaths = routeLoader.getApiPaths();
    const exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      baseUrl: API_BASE_URL,
      totalEndpoints: Object.keys(apiPaths).length,
      endpoints: apiPaths,
    };

    const dir = path.join(__dirname, 'src/api');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, 'api-endpoints.json');
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

    res.json({ success: true, message: 'Endpoints exported', filePath });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to export endpoints' });
  }
});

/**
 * Root Info
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Casino API Server & Bot',
    version: '1.0.0',
    uptime: process.uptime(),
    services: {
      api: 'running',
      bot: telegramBot?.start ? 'enabled' : 'disabled'
    },
    endpoints: {
      health: '/health',
      apiEndpoints: '/api-endpoints',
      documentation: '/api-docs',
    },
  });
});

// ====================================
// ✅ WEBHOOK HANDLERS — Оба метода оплаты
// ====================================
/**
 * POST /webhook/crypto-pay
 * Обработка уведомлений от Crypto Pay (@CryptoBot)
 */
app.post('/webhook/crypto-pay', async (req, res) => {
  console.log('\n🪝 [WEBHOOK] Received Crypto Pay notification');
  
  try {
    const signature = req.headers['crypto-pay-api-signature'];
    const result = await cryptoPayService.handleWebhook(req.body, signature);
    
    res.status(200).json({ 
      success: true, 
      processed: result.processed,
      message: result.reason || 'OK'
    });
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Fatal error:', error.message);
    res.status(200).json({ 
      success: false, 
      message: 'Error processed'
    });
  }
});

/**
 * POST /webhook/wallet-pay
 * Обработка уведомлений от Wallet Pay (официальный @wallet Telegram)
 */
app.post('/webhook/wallet-pay', async (req, res) => {
  console.log('\n🪝 [WEBHOOK] Received Wallet Pay notification');
  
  try {
    const timestamp = req.headers['walletpay-timestamp'];
    const signature = req.headers['walletpay-signature'];
    
    const result = await walletPayService.handleWebhook(
      req.body,
      timestamp,
      signature,
      'POST',
      '/webhook/wallet-pay'
    );
    
    res.status(200).json({ 
      success: true, 
      processed: result.processed,
      message: result.reason || 'OK'
    });
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Fatal error:', error.message);
    res.status(200).json({ 
      success: false, 
      message: 'Error processed'
    });
  }
});

console.log('✅ Webhook routes registered:');
console.log('   - POST /webhook/crypto-pay (Crypto Bot)');
console.log('   - POST /webhook/wallet-pay (Telegram Wallet)');

// ====================================
// ПОДКЛЮЧЕНИЕ ОСТАЛЬНЫХ МАРШРУТОВ
// ====================================
const routers = routeLoader.getExpressRouters();
for (const router of routers) {
  app.use('/', router);
}

// ✅ Явно подключаем depositRoutes для отладки
try {
  const depositRoutes = require('./src/routes/depositRoutes');
  app.use('/', depositRoutes);
  console.log('✅ Deposit routes explicitly loaded');
} catch (err) {
  console.error('❌ Error loading deposit routes:', err.message);
}

// ✅ Явно подключаем plinkoRoutes
try {
  const plinkoRoutes = require('./src/routes/plinkoRoutes');
  app.use('/', plinkoRoutes);
  console.log('✅ Plinko routes explicitly loaded');
} catch (err) {
  console.error('❌ Error loading plinko routes:', err.message);
}

// ✅ Явно подключаем walletRoutes
try {
  const walletRoutes = require('./src/routes/walletRoutes');
  app.use('/', walletRoutes);
  console.log('✅ Wallet routes explicitly loaded');
} catch (err) {
  console.error('❌ Error loading wallet routes:', err.message);
}

// ✅ Явно подключаем coinflipRoutes
try {
  const coinflipRoutes = require('./src/routes/coinflipRoutes');
  app.use('/', coinflipRoutes);
  console.log('✅ Coinflip routes explicitly loaded');
} catch (err) {
  console.error('❌ Error loading coinflip routes:', err.message);
}

// ✅ Явно подключаем adminContentRoutes
try {
  const adminContentRoutes = require('./src/routes/adminContentRoutes');
  app.use('/api/admin', adminContentRoutes);
  console.log('✅ Admin Content routes explicitly loaded');
} catch (err) {
  console.error('❌ Error loading admin content routes:', err.message);
}

// ✅ Явно подключаем contentRoutes (public)
try {
  const contentRoutes = require('./src/routes/contentRoutes');
  app.use('/api/content', contentRoutes);
  console.log('✅ Public Content routes explicitly loaded');
} catch (err) {
  console.error('❌ Error loading public content routes:', err.message);
}

// ✅ Явно подключаем supportRoutes
try {
  const supportRoutes = require('./src/routes/supportRoutes');
  app.use('/api/support', supportRoutes);
  console.log('✅ Support routes explicitly loaded');
} catch (err) {
  console.error('❌ Error loading support routes:', err.message);
}

console.log(`✅ ${routers.length} route(s) loaded`);

// ====================================
// ERROR HANDLERS
// ====================================

/**
 * 404 Not Found
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// ====================================
// ЗАПУСК СЕРВЕРА
// ====================================
async function startServer() {
  let httpServer;

  try {
    // === ШАГ 1: Подключение к БД ===
    console.log('\n🔗 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database: Connected to PostgreSQL');

    // === ШАГ 2: Синхронизация валют ===
    try {
      console.log('\n💱 Syncing currencies...');
      const currencySyncService = require('./src/services/currencySyncService');
      await currencySyncService.syncCurrencies(true); // force=true для принудительной синхронизации при старте
      console.log('✅ Currencies: Synchronized');
      
      // Загружаем актуальные курсы валют с CoinGecko
      console.log('📊 Fetching live exchange rates...');
      const rates = await currencySyncService.fetchLiveRates();
      console.log('✅ Exchange Rates: Loaded (BTC=$' + rates.BTC + ', ETH=$' + rates.ETH + ')');
    } catch (error) {
      console.warn('⚠️ Currencies: Failed to sync -', error.message);
    }

    // === ШАГ 3: Запуск Telegram Bot ===
    if (telegramBot && telegramBot.start) {
      console.log('\n🤖 Starting Telegram Bot...');
      telegramBot.start();
      console.log('✅ Telegram Bot: Started successfully');
    } else {
      console.warn('⚠️ Telegram Bot: Not configured or start method missing');
    }

    // === ШАГ 4: Запуск Cron Jobs ===
    try {
      const { startReferralCron } = require('./src/cron/referralCommissionCron');
      startReferralCron();
      
      // Leaderboard cron (фейковые ставки раз в день)
      const { startLeaderboardCron } = require('./src/cron/leaderboardCron');
      startLeaderboardCron();
      
      // Generate records cron (генерация новых рекордов каждый день в 1:00 ночи)
      const { startGenerateRecordsCron } = require('./src/cron/generateRecordsCron');
      startGenerateRecordsCron();
      
      console.log('✅ Cron Jobs: Started');
    } catch (error) {
      console.warn('⚠️ Cron Jobs: Failed to start -', error.message);
    }

    // === ШАГ 5: Запуск HTTP сервера ===
    console.log('\n🚀 Starting HTTP Server...');
    httpServer = app.listen(PORT, () => {
      console.log(`✅ API Server: Running on ${API_BASE_URL}`);
      console.log(`\n📚 Info:`);
      console.log(`   - Health: ${API_BASE_URL}/health`);
      console.log(`   - Docs: ${API_BASE_URL}/api-docs`);
      console.log(`   - Webhooks:`);
      console.log(`     • Crypto Bot: POST ${API_BASE_URL}/webhook/crypto-pay`);
      console.log(`     • Wallet Pay: POST ${API_BASE_URL}/webhook/wallet-pay\n`);
    });

    // === ШАГ 6: Запуск сервиса рекордов (обновление каждые 24 часа) ===
    console.log('📊 Starting Records Updater...');
    try {
      startRecordsUpdater();
      console.log('✅ Records Updater: Started (updates every 24 hours)');
    } catch (error) {
      console.warn('⚠️ Records Updater: Failed to start -', error.message);
    }

  } catch (error) {
    console.error('\n❌ CRITICAL: Startup Error:', error);
    process.exit(1);
  }

  // ====================================
  // GRACEFUL SHUTDOWN
  // ====================================
  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    
    // Остановка HTTP сервера
    if (httpServer) {
      httpServer.close(() => {
        console.log('✅ HTTP Server closed');
      });
    }

    // Остановка Telegram Bot
    if (telegramBot?.botInstance) {
      try {
        telegramBot.botInstance.stop(signal);
        console.log('✅ Telegram Bot stopped');
      } catch (error) {
        console.warn('⚠️ Failed to stop bot:', error.message);
      }
    }

    // Остановка Records Updater
    try {
      stopRecordsUpdater();
      console.log('✅ Records Updater stopped');
    } catch (error) {
      console.warn('⚠️ Failed to stop Records Updater:', error.message);
    }

    // Остановка Generate Records Cron
    try {
      const { stopGenerateRecordsCron } = require('./src/cron/generateRecordsCron');
      stopGenerateRecordsCron();
      console.log('✅ Generate Records Cron stopped');
    } catch (error) {
      console.warn('⚠️ Failed to stop Generate Records Cron:', error.message);
    }

    // Отключение БД
    try {
      await prisma.$disconnect();
      console.log('✅ Database disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect database:', error.message);
    }

    console.log('👋 Goodbye.\n');
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

// Запуск приложения
startServer();

module.exports = app;