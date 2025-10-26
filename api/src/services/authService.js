const { v4: uuidv4 } = require('uuid');
const prisma = require('../../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '7d';

function generateSessionToken(user) {
  const payload = {
    userId: user.id,
    telegramId: user.telegramId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

async function registerNewUser(telegramData) {
  const telegramId = telegramData.id.toString();

  const newUser = await prisma.user.create({
    data: {
      telegramId: telegramId,
      username: telegramData.username || null,
      firstName: telegramData.first_name || null,
      lastName: telegramData.last_name || null, // ← ИСПРАВЛЕНО: добавлено
      photoUrl: telegramData.photo_url || null,
    }
  });

  return newUser;
}

async function generateOneTimeToken(userId) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 300000); // 5 минут

  await prisma.oneTimeAuthToken.create({
    data: {
      token: token,
      userId: userId,
      expiresAt: expiresAt,
      isUsed: false,
    },
  });

  return token;
}

async function useOneTimeToken(token) {
  const authToken = await prisma.oneTimeAuthToken.findUnique({
    where: { token: token },
    include: { user: true },
  });

  if (!authToken || authToken.expiresAt < new Date()) {
    return null;
  }

  return authToken.user;
}

module.exports = { registerNewUser, generateOneTimeToken, useOneTimeToken, generateSessionToken };