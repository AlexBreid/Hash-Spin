/**
 * 🛡️ SECURITY MIDDLEWARE
 * 
 * - Rate Limiting (анти-DDoS)
 * - API Key проверка
 * - IP блокировка
 */

const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════════════════════

// Rate Limiting настройки
const RATE_LIMIT_WINDOW_MS = 60 * 1000;  // 1 минута
const RATE_LIMIT_MAX_REQUESTS = 200;      // Максимум запросов в минуту (увеличено)
const RATE_LIMIT_MAX_AUTH_ATTEMPTS = 10;  // Максимум попыток авторизации
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // Блокировка на 24 часа

// Особые лимиты для разных эндпоинтов
const ENDPOINT_LIMITS = {
  '/api/v1/auth/': 30,           // Авторизация
  '/api/v1/wallet/withdraw': 15, // Вывод
  '/api/v1/deposit/': 50,        // Пополнение
  '/api/v1/crash/bet': 300,      // Ставки в играх - высокий лимит
  '/api/v1/crash/': 300,
  '/api/v1/minesweeper/': 300,   // Игры не должны банить
  '/api/v1/plinko/': 500,        // Plinko - очень высокий (много быстрых ставок)
  '/api/v1/wallet/balance': 200, // Баланс часто запрашивается
  '/api/v1/user/': 150,          // Профиль пользователя
};

// Белый список IP (не ограничены)
const WHITELIST_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
];

// Публичные эндпоинты (не требуют авторизации)
const PUBLIC_ENDPOINTS = [
  '/health',
  '/api-endpoints',
  '/api-docs',
  '/',
  '/webhook/crypto-pay',
  '/webhook/cryptocloud',
];

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ХРАНИЛИЩЕ
// ═══════════════════════════════════════════════════════════════════════════════

// Хранилище запросов по IP
const requestCounts = new Map();

// Заблокированные IP
const blockedIPs = new Map();

// Подозрительная активность
const suspiciousActivity = new Map();

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Получить IP адрес клиента
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * Проверить, является ли IP в белом списке
 */
function isWhitelisted(ip) {
  return WHITELIST_IPS.some(whiteIP => ip.includes(whiteIP));
}

/**
 * Проверить, заблокирован ли IP
 */
function isBlocked(ip) {
  const blockInfo = blockedIPs.get(ip);
  if (!blockInfo) return false;
  
  if (Date.now() > blockInfo.until) {
    blockedIPs.delete(ip);
    return false;
  }
  
  return true;
}

/**
 * Заблокировать IP
 */
function blockIP(ip, reason, duration = BLOCK_DURATION_MS) {
  blockedIPs.set(ip, {
    until: Date.now() + duration,
    reason,
    blockedAt: new Date().toISOString()
  });
  
  logger.warn('SECURITY', `IP blocked: ${ip}`, { reason, duration: duration / 1000 + 's' });
}

/**
 * Получить лимит для эндпоинта
 */
function getEndpointLimit(path) {
  for (const [endpoint, limit] of Object.entries(ENDPOINT_LIMITS)) {
    if (path.startsWith(endpoint)) {
      return limit;
    }
  }
  return RATE_LIMIT_MAX_REQUESTS;
}

/**
 * Очистка старых записей
 */
function cleanupOldRecords() {
  const now = Date.now();
  
  // Очистка счётчиков запросов
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      requestCounts.delete(ip);
    }
  }
  
  // Очистка блокировок
  for (const [ip, data] of blockedIPs.entries()) {
    if (now > data.until) {
      blockedIPs.delete(ip);
    }
  }
  
  // Очистка подозрительной активности
  for (const [ip, data] of suspiciousActivity.entries()) {
    if (now - data.lastActivity > 60 * 60 * 1000) { // 1 час
      suspiciousActivity.delete(ip);
    }
  }
}

// Запускаем очистку каждые 5 минут
setInterval(cleanupOldRecords, 5 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════════════════════
// 🛡️ MIDDLEWARE: Rate Limiting
// ═══════════════════════════════════════════════════════════════════════════════

function rateLimiter(req, res, next) {
  const ip = getClientIP(req);
  const path = req.path;
  const now = Date.now();
  
  // Пропускаем белый список
  if (isWhitelisted(ip)) {
    return next();
  }
  
  // Проверяем блокировку
  if (isBlocked(ip)) {
    const blockInfo = blockedIPs.get(ip);
    const remainingSeconds = Math.ceil((blockInfo.until - now) / 1000);
    const remainingHours = Math.ceil(remainingSeconds / 3600);
    
    logger.warn('SECURITY', `Blocked IP attempted access: ${ip}`, { path });
    
    return res.status(429).json({
      success: false,
      error: 'IP_BLOCKED',
      blocked: true,
      message: `Ваш IP заблокирован на 24 часа за подозрительную активность.`,
      reason: blockInfo.reason,
      blockedAt: blockInfo.blockedAt,
      retryAfter: remainingSeconds,
      remainingHours: remainingHours
    });
  }
  
  // Получаем лимит для этого эндпоинта
  const limit = getEndpointLimit(path);
  
  // Получаем или создаём запись для IP
  let ipData = requestCounts.get(ip);
  
  if (!ipData || now - ipData.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipData = {
      count: 0,
      windowStart: now,
      endpoints: {}
    };
    requestCounts.set(ip, ipData);
  }
  
  // Увеличиваем счётчик
  ipData.count++;
  ipData.endpoints[path] = (ipData.endpoints[path] || 0) + 1;
  
  // Проверяем лимит
  if (ipData.count > limit) {
    // Фиксируем подозрительную активность
    let suspicious = suspiciousActivity.get(ip) || { violations: 0, lastActivity: now };
    suspicious.violations++;
    suspicious.lastActivity = now;
    suspiciousActivity.set(ip, suspicious);
    
    // Если слишком много нарушений - блокируем (увеличено до 15)
    if (suspicious.violations >= 15) {
      blockIP(ip, 'Repeated rate limit violations');
      suspicious.violations = 0;
      
      return res.status(429).json({
        success: false,
        error: 'IP_BLOCKED',
        blocked: true,
        message: 'Ваш IP заблокирован на 24 часа за подозрительную активность.',
        reason: 'Repeated rate limit violations',
        retryAfter: BLOCK_DURATION_MS / 1000,
        remainingHours: 24
      });
    }
    
    const remainingMs = RATE_LIMIT_WINDOW_MS - (now - ipData.windowStart);
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    
    logger.warn('SECURITY', `Rate limit exceeded: ${ip}`, { 
      path, 
      count: ipData.count, 
      limit,
      violations: suspicious.violations 
    });
    
    return res.status(429).json({
      success: false,
      error: 'RATE_LIMITED',
      message: `Слишком много запросов. Попробуйте через ${remainingSeconds} секунд.`,
      retryAfter: remainingSeconds,
      warningsLeft: 15 - suspicious.violations
    });
  }
  
  // Добавляем заголовки rate limit
  res.set('X-RateLimit-Limit', limit.toString());
  res.set('X-RateLimit-Remaining', Math.max(0, limit - ipData.count).toString());
  res.set('X-RateLimit-Reset', Math.ceil((ipData.windowStart + RATE_LIMIT_WINDOW_MS) / 1000).toString());
  
  next();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛡️ MIDDLEWARE: API Protection
// ═══════════════════════════════════════════════════════════════════════════════

function apiProtection(req, res, next) {
  const path = req.path;
  const ip = getClientIP(req);
  
  // Пропускаем публичные эндпоинты
  if (PUBLIC_ENDPOINTS.some(endpoint => path === endpoint || path.startsWith(endpoint))) {
    return next();
  }
  
  // Пропускаем вебхуки (они имеют свою авторизацию)
  if (path.includes('/webhook/')) {
    return next();
  }
  
  // Проверяем наличие авторизации
  const authHeader = req.headers.authorization;
  const gameServerKey = req.headers['x-game-server-key'];
  
  // Если есть JWT токен - пропускаем (проверка будет в authenticateToken)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  // Если есть ключ игрового сервера
  if (gameServerKey && gameServerKey === process.env.GAME_SERVER_SECRET) {
    req.isGameServer = true;
    return next();
  }
  
  // Нет авторизации - блокируем
  logger.warn('SECURITY', `Unauthorized API access attempt: ${ip}`, { path });
  
  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Требуется авторизация'
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛡️ MIDDLEWARE: Request Validation
// ═══════════════════════════════════════════════════════════════════════════════

function requestValidation(req, res, next) {
  const ip = getClientIP(req);
  
  // Проверяем размер тела запроса (защита от огромных payload)
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 10 * 1024 * 1024) { // 10MB
    logger.warn('SECURITY', `Request too large: ${ip}`, { size: contentLength });
    return res.status(413).json({
      success: false,
      error: 'Payload Too Large',
      message: 'Размер запроса превышает лимит'
    });
  }
  
  // Проверяем User-Agent (базовая защита от ботов)
  const userAgent = req.headers['user-agent'];
  if (!userAgent || userAgent.length < 10) {
    // Не блокируем, но помечаем как подозрительное
    let suspicious = suspiciousActivity.get(ip) || { violations: 0, lastActivity: Date.now() };
    suspicious.noUserAgent = true;
    suspiciousActivity.set(ip, suspicious);
  }
  
  next();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ФУНКЦИИ ДЛЯ МОНИТОРИНГА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Получить статистику безопасности
 */
function getSecurityStats() {
  return {
    activeConnections: requestCounts.size,
    blockedIPs: blockedIPs.size,
    suspiciousIPs: suspiciousActivity.size,
    blockedList: Array.from(blockedIPs.entries()).map(([ip, data]) => ({
      ip,
      reason: data.reason,
      until: new Date(data.until).toISOString(),
      blockedAt: data.blockedAt
    }))
  };
}

/**
 * Разблокировать IP вручную
 */
function unblockIP(ip) {
  if (blockedIPs.has(ip)) {
    blockedIPs.delete(ip);
    logger.info('SECURITY', `IP manually unblocked: ${ip}`);
    return true;
  }
  return false;
}

/**
 * Добавить IP в белый список
 */
function addToWhitelist(ip) {
  if (!WHITELIST_IPS.includes(ip)) {
    WHITELIST_IPS.push(ip);
    logger.info('SECURITY', `IP added to whitelist: ${ip}`);
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  rateLimiter,
  apiProtection,
  requestValidation,
  getSecurityStats,
  unblockIP,
  addToWhitelist,
  blockIP,
  isBlocked,
  getClientIP,
};



