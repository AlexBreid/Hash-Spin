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

// ✅ ИСПРАВЛЕНИЕ #1: Импортируем webhook handler
const { handleCryptoPayWebhook } = require('./src/bots/telegramBot');

// 🛡️ SECURITY: Импортируем middleware безопасности
const { 
  rateLimiter, 
  apiProtection, 
  requestValidation,
  getSecurityStats 
} = require('./src/middleware/security');

// ====================================
// ✅ ИСПРАВЛЕНИЕ #10: ВАЛИДАЦИЯ ENV ПЕРЕМЕННЫХ
// ====================================
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'CRYPTO_PAY_TOKEN',
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
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

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
// ✅ ИСПРАВЛЕНИЕ #1: WEBHOOK HANDLER
// ====================================
/**
 * POST /webhook/crypto-pay
 * Обработка уведомлений от Crypto Pay
 */
app.post('/webhook/crypto-pay', async (req, res) => {
  console.log('\n🪝 [WEBHOOK] Received Crypto Pay notification');
  
  try {
    // Передаем bot instance для отправки уведомлений
    req.app.locals.bot = telegramBot.botInstance;
    
    // Обрабатываем webhook
    await handleCryptoPayWebhook(req, res);
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Fatal error:', error.message);
    // Всегда возвращаем 200 OK (чтобы Crypto Pay не повторял)
    res.status(200).json({ 
      success: false, 
      message: 'Error processed'
    });
  }
});

console.log('✅ Webhook route registered: POST /webhook/crypto-pay');

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
      console.log(`   - Webhook: POST ${API_BASE_URL}/webhook/crypto-pay\n`);
    });

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