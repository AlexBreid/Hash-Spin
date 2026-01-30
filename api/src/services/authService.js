// services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../../prismaClient');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '30d';
const JWT_REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000;
const ONE_TIME_TOKEN_EXPIRES_IN = 15 * 60 * 1000;

function generateSessionToken(user) {
    return jwt.sign({
            userId: user.id,
            username: user.username
        },
        JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    );
}

function verifySessionToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

function shouldRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const expiresAt = decoded.exp * 1000;
        const timeUntilExpiry = expiresAt - Date.now();
        return timeUntilExpiry < JWT_REFRESH_THRESHOLD;
    } catch {
        return false;
    }
}

async function refreshSessionToken(oldToken) {
    try {
        const decoded = jwt.verify(oldToken, JWT_SECRET);
        
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        
        if (!user) {
            return null;
        }
        
        const newToken = generateSessionToken(user);
        
        return {
            token: newToken,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName
            }
        };
    } catch {
        return null;
    }
}

async function authenticateWithTelegramInitData(initData) {
    try {
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (!BOT_TOKEN) {
            logger.error('AUTH', 'TELEGRAM_BOT_TOKEN not configured');
            return null;
        }

        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');
        
        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(BOT_TOKEN)
            .digest();
        
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        if (calculatedHash !== hash) {
            return null;
        }
        
        const authDate = parseInt(params.get('auth_date') || '0');
        const now = Math.floor(Date.now() / 1000);
        if (now - authDate > 3600) {
            return null;
        }
        
        const userParam = params.get('user');
        if (!userParam) {
            return null;
        }
        
        const telegramUser = JSON.parse(userParam);
        const telegramId = telegramUser.id.toString();
        
        let user = await prisma.user.findUnique({
            where: { telegramId }
        });
        
        if (!user) {
            const { user: newUser } = await registerNewUser(telegramUser);
            user = newUser;
        }
        
        const sessionToken = generateSessionToken(user);
        
        return {
            token: sessionToken,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName
            }
        };
    } catch {
        return null;
    }
}

function generateRandomPassword(length = 12) {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
}

async function registerNewUser(telegramUser) {
    const telegramId = telegramUser.id.toString();
    const rawPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
        data: {
            telegramId,
            username: telegramUser.username || null,
            firstName: telegramUser.first_name || 'Unknown',
            lastName: telegramUser.last_name || null,
            photoUrl: null,
            passwordHash,
        },
    });

    logger.info('AUTH', `New user registered: ID=${user.id}`);

    return { user, rawPassword };
}

async function generateOneTimeToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ONE_TIME_TOKEN_EXPIRES_IN);

    await prisma.oneTimeToken.create({
        data: {
            token,
            userId,
            expiresAt,
            used: false,
        },
    });

    return token;
}

async function useOneTimeToken(token) {
    const tokenRecord = await prisma.oneTimeToken.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!tokenRecord) {
        return null;
    }

    if (tokenRecord.used) {
        return null;
    }

    if (new Date() > tokenRecord.expiresAt) {
        return null;
    }

    await prisma.oneTimeToken.update({
        where: { token },
        data: { used: true },
    });

    return tokenRecord.user;
}

module.exports = {
    generateSessionToken,
    verifySessionToken,
    generateRandomPassword,
    registerNewUser,
    generateOneTimeToken,
    useOneTimeToken,
    shouldRefreshToken,
    refreshSessionToken,
    authenticateWithTelegramInitData,
};
