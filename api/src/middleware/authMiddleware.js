const jwt = require('jsonwebtoken');
const prisma = require('../../prismaClient');

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECURE_DEFAULT_SECRET';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization token required' });
  }

  try {
    const userPayload = jwt.verify(token, JWT_SECRET);

    // Доп. проверка: существует ли пользователь?
    const userExists = await prisma.user.findUnique({
      where: { id: userPayload.userId }
    });

    if (!userExists) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = userPayload;
    next();
  } catch (err) {
    console.warn(`⚠️ JWT Verification Failed: ${err.message}`);
    return res.status(401).json({ success: false, error: 'Invalid or expired session token' });
  }
}

module.exports = { authenticateToken };