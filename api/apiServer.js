// apiServer.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const prisma = require('./prismaClient');

// 🔧 ДИНАМИЧЕСКАЯ ЗАГРУЗКА ROUTES
const RouteLoader = require('./src/utils/routeLoader');

const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 4000;

// ========== ИНИЦИАЛИЗАЦИЯ ROUTE LOADER ==========
const routesDir = path.join(__dirname, 'src/routes');
const routeLoader = new RouteLoader(routesDir);

// Загружаем все route файлы
routeLoader.loadRoutes();

// Выводим все загруженные routes в консоль
routeLoader.printRoutes();

// ========== CORS ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://hash-spin.vercel.app',
  'https://web.telegram.org',
  'https://t.me',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((allowed) => origin.includes(allowed.replace(/https?:\/\//, '')))) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS warning: Request from ${origin}`);
        callback(null, true);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
  })
);

app.options('*', cors());
app.use(bodyParser.json());

// ========== ОТКЛЮЧИ КЭШИРОВАНИЕ ДЛЯ ВСЕХ API ENDPOINTS ==========
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('ETag', '');
  next();
});

// ========== ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ ENDPOINTS В JSON ==========
function saveEndpointsToFile() {
  try {
    const apiPaths = routeLoader.getApiPaths();

    const exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      baseUrl: process.env.API_BASE_URL || `http://localhost:${PORT}`,
      totalEndpoints: Object.keys(apiPaths).length,
      endpoints: apiPaths,
    };

    // Создаём директорию если её нет
    const dir = path.join(__dirname, 'src/api');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Сохраняем в файл
    const filePath = path.join(dir, 'api-endpoints.json');
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

    console.log(`✅ Endpoints сохранены в ${filePath}`);
    console.log(`   📊 Всего endpoints: ${Object.keys(apiPaths).length}`);
  } catch (error) {
    console.error('❌ Ошибка сохранения endpoints:', error);
  }
}

// ========== ENDPOINT ДЛЯ ПОЛУЧЕНИЯ ВСЕХ API ПУТЕЙ ==========
app.get('/api-endpoints', (req, res) => {
  try {
    const apiPaths = routeLoader.getApiPaths();

    res.json({
      success: true,
      baseUrl: process.env.API_BASE_URL || `http://localhost:${PORT}`,
      timestamp: new Date().toISOString(),
      totalEndpoints: Object.keys(apiPaths).length,
      endpoints: apiPaths,
    });

    console.log(`📡 API endpoints запрошены с ${req.ip}`);
  } catch (error) {
    console.error('❌ Ошибка в /api-endpoints:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось получить endpoints',
    });
  }
});

// ========== ENDPOINT ДЛЯ ДОКУМЕНТАЦИИ ==========
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
    console.error('❌ Ошибка в /api-docs:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось получить документацию',
    });
  }
});

// ========== ENDPOINT ДЛЯ ЭКСПОРТА ENDPOINTS ==========
app.get('/export-endpoints', (req, res) => {
  try {
    const apiPaths = routeLoader.getApiPaths();

    const exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      baseUrl: process.env.API_BASE_URL || `http://localhost:${PORT}`,
      totalEndpoints: Object.keys(apiPaths).length,
      endpoints: apiPaths,
    };

    // Создаём директорию если её нет
    const dir = path.join(__dirname, 'src/api');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Сохраняем в файл
    const filePath = path.join(dir, 'api-endpoints.json');
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

    res.json({
      success: true,
      message: 'Endpoints экспортированы в src/api/api-endpoints.json',
      filePath,
      totalEndpoints: Object.keys(apiPaths).length,
      exported: exportData,
    });

    console.log(`✅ Endpoints экспортированы в ${filePath}`);
  } catch (error) {
    console.error('❌ Ошибка экспорта endpoints:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось экспортировать endpoints',
    });
  }
});

// ========== ПОДКЛЮЧАЕМ ВСЕ ЗАГРУЖЕННЫЕ ROUTES ==========
const routers = routeLoader.getExpressRouters();

for (const router of routers) {
  app.use('/', router);
}

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ========== INFO ==========
app.get('/', (req, res) => {
  res.json({
    message: 'Casino API Server',
    version: '1.0.0',
    uptime: process.uptime(),
    endpoints: {
      health: '/health',
      apiEndpoints: '/api-endpoints',
      documentation: '/api-docs',
      export: '/export-endpoints',
    },
  });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint не найден',
    path: req.path,
    hint: 'Проверьте /api-docs для доступных endpoints',
  });
});

// ========== ERROR HANDLER ==========
app.use((err, req, res, next) => {
  console.error('❌ Ошибка сервера:', err);
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ========== ЗАПУСК СЕРВЕРА ==========
async function startApiServer() {
  try {
    await prisma.$connect();
    console.log('✅ API Server: Подключено к PostgreSQL\n');

    app.listen(PORT, () => {
      console.log(`🚀 API Server запущен на http://localhost:${PORT}`);

      // 📝 СОХРАНЯЕМ ENDPOINTS В ФАЙЛ ПРИ ЗАПУСКЕ СЕРВЕРА
      console.log('\n📝 Сохраняю endpoints в JSON файл...');
      saveEndpointsToFile();

      console.log(`\n📚 Полезные endpoints:`);
      console.log(`   - API endpoints: http://localhost:${PORT}/api-endpoints`);
      console.log(`   - Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`   - Export JSON:   http://localhost:${PORT}/export-endpoints`);
      console.log(`   - Health check:  http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска API Server:', error);
    process.exit(1);
  }
}

startApiServer();

module.exports = app;