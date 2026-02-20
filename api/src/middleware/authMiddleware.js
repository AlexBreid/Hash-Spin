// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const prisma = require('../../prismaClient');

/**
 * 🔐 Верификация JWT токена
 * Извлекает userId из токена и добавляет в req.user
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Ожидаем: "Bearer TOKEN"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ Auth Middleware: No token provided'); // Added log
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required. Format: Bearer <token>' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded; // { userId, telegramId, ... }
    
    // console.log('✅ Auth Middleware: Token verified', { userId: decoded.userId }); // Added log (commented out for now)
    next();
  } catch (error) {
    console.error('❌ Auth Middleware: Token verification failed', error.message); // Added log
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired. Please login again.' 
      });
    }
    
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};

/**
 * 👑 Проверка прав администратора
 */
const isAdmin = async (req, res, next) => {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isAdmin: true }
    });

    if (user && user.isAdmin) {
      next();
    } else {
      console.warn(`⛔ Access denied: User ${req.user.userId} is not admin`);
      res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    res.status(500).json({ success: false, error: 'Server error checking admin status' });
  }
};

/**
 * 🔒 Проверка Server Secret (для Game Server ↔ Backend коммуникации)
 * Используется для защиты внутренних эндпоинтов от Game Server
 */
const checkServerSecret = (req, res, next) => {
  const serverSecret = req.headers['x-server-secret'];
  const expectedSecret = process.env.GAME_SERVER_SECRET;

  if (!expectedSecret) {
    console.error('⚠️ GAME_SERVER_SECRET не установлен в .env');
    return res.status(500).json({ 
      success: false, 
      error: 'Server misconfigured' 
    });
  }

  if (!serverSecret || serverSecret !== expectedSecret) {
    
    return res.status(403).json({ 
      success: false, 
      error: 'Unauthorized: Invalid Server Secret' 
    });
  }

  
  next();
};

/**
 * 🛡️ Комбинированная проверка: User + Server Secret
 * Для эндпоинтов, где нужна оба типа авторизации
 */
const authenticateUserAndServer = (req, res, next) => {
  // Сначала проверяем Server Secret
  checkServerSecret(req, res, () => {
    // Затем проверяем User Token
    authenticateToken(req, res, next);
  });
};

module.exports = {
  authenticateToken,
  isAdmin,
  checkServerSecret,
  authenticateUserAndServer
};
