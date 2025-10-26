const jwt = require('jsonwebtoken');
const prisma = require('../../prismaClient'); // Если нужно проверять наличие пользователя

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECURE_DEFAULT_SECRET'; // ⚠️ ОБЯЗАТЕЛЬНО УКАЖИТЕ СЕКРЕТ

/**
 * Middleware для проверки JWT-токена в заголовке Authorization: Bearer <token>
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // Извлекаем токен: 'Bearer XXXXX' -> 'XXXXX'
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        return res.status(401).json({ success: false, error: 'Authorization token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
        if (err) {
            // Ошибка: токен просрочен, невалиден, подделан
            console.warn(`⚠️ JWT Verification Failed: ${err.message}`);
            return res.status(401).json({ success: false, error: 'Invalid or expired session token' });
        }
        
        // userPayload содержит { userId: Int, telegramId: String }
        req.user = userPayload; 
        next();
    });
}

module.exports = { authenticateToken };