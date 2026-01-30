// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// ====================================
// MIDDLEWARE: Проверка админ-токена
// ====================================
const requireAdminAuth = async (req, res, next) => {
    try {
        // Проверяем JWT токен в заголовке
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Token required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Проверяем что пользователь админ
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ====================================
// 📊 СТАТИСТИКА
// ====================================

router.get('/api/admin/stats', requireAdminAuth, async (req, res) => {
    try {
        const totalUsers = await prisma.user.count();
        const blockedUsers = await prisma.user.count({ where: { isBlocked: true } });
        const totalAdmins = await prisma.user.count({ where: { isAdmin: true } });
        const activeToday = await prisma.user.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            }
        });

        const totalDeposits = await prisma.transaction.aggregate({
            where: { type: 'DEPOSIT', status: 'COMPLETED' },
            _sum: { amount: true }
        });

        const totalWithdrawals = await prisma.transaction.aggregate({
            where: { type: 'WITHDRAW', status: 'COMPLETED' },
            _sum: { amount: true }
        });

        const pendingWithdrawals = await prisma.transaction.count({
            where: { type: 'WITHDRAW', status: 'PENDING' }
        });

        res.json({
            totalUsers,
            activeToday,
            blockedUsers,
            totalAdmins,
            totalDeposits: totalDeposits._sum.amount || 0,
            totalWithdrawals: totalWithdrawals._sum.amount || 0,
            pendingWithdrawals,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ====================================
// 👥 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
// ====================================

// Получить список пользователей
router.get('/api/admin/users', requireAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const users = await prisma.user.findMany({
            include: {
                balances: { include: { token: true } },
                transactions: { orderBy: { createdAt: 'desc' }, take: 3 }
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        const total = await prisma.user.count();

        res.json({
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить юзера по ID
router.get('/api/admin/users/:id', requireAdminAuth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                balances: { include: { token: true } },
                transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
                referrals: true,
                bonuses: { include: { bonus: true, token: true } }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Заблокировать пользователя
router.post('/api/admin/users/:id/block', requireAdminAuth, async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { isBlocked: true }
        });

        res.json({ ok: true, message: `User ${user.id} blocked`, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Разблокировать пользователя
router.post('/api/admin/users/:id/unblock', requireAdminAuth, async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { isBlocked: false }
        });

        res.json({ ok: true, message: `User ${user.id} unblocked`, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Выдать админ-статус
router.post('/api/admin/users/:id/make-admin', requireAdminAuth, async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { isAdmin: true }
        });

        res.json({ ok: true, message: `User ${user.id} is now admin`, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Снять админ-статус
router.post('/api/admin/users/:id/remove-admin', requireAdminAuth, async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { isAdmin: false }
        });

        res.json({ ok: true, message: `User ${user.id} is no longer admin`, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ====================================
// 💳 УПРАВЛЕНИЕ ПЛАТЕЖАМИ
// ====================================

// Получить все транзакции
router.get('/api/admin/transactions', requireAdminAuth, async (req, res) => {
    try {
        const type = req.query.type; // DEPOSIT, WITHDRAW
        const status = req.query.status; // PENDING, COMPLETED, FAILED
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search; // Поиск по нику/имени/telegramId
        const tokenId = req.query.tokenId; // Фильтр по токену
        const dateFrom = req.query.dateFrom; // Дата от
        const dateTo = req.query.dateTo; // Дата до
        const minAmount = req.query.minAmount; // Мин. сумма
        const maxAmount = req.query.maxAmount; // Макс. сумма

        const where = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (tokenId) where.tokenId = parseInt(tokenId);
        
        // Фильтр по сумме
        if (minAmount || maxAmount) {
            where.amount = {};
            if (minAmount) where.amount.gte = parseFloat(minAmount);
            if (maxAmount) where.amount.lte = parseFloat(maxAmount);
        }
        
        // Фильтр по дате
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) where.createdAt.lte = new Date(dateTo);
        }
        
        // Поиск по пользователю
        if (search) {
            where.user = {
                OR: [
                    { username: { contains: search, mode: 'insensitive' } },
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { telegramId: { contains: search } }
                ]
            };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: { 
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        telegramId: true
                    }
                }, 
                token: true,
                approvedBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Одобрить вывод
router.post('/api/admin/transactions/:id/approve', requireAdminAuth, async (req, res) => {
    try {
        const transaction = await prisma.transaction.update({
            where: { id: parseInt(req.params.id) },
            data: { 
                status: 'COMPLETED',
                approvedById: req.user.id,
                approvedAt: new Date()
            },
            include: {
                approvedBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true
                    }
                }
            }
        });

        res.json({ ok: true, message: 'Withdrawal approved', transaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Отклонить вывод (вернуть деньги)
router.post('/api/admin/transactions/:id/reject', requireAdminAuth, async (req, res) => {
    try {
        const { reason } = req.body; // Опциональная причина отклонения
        
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Возвращаем деньги на MAIN баланс (не на BONUS!)
        const balance = await prisma.balance.findUnique({
            where: {
                userId_tokenId_type: {
                    userId: transaction.userId,
                    tokenId: transaction.tokenId,
                    type: 'MAIN'
                }
            }
        });

        if (balance) {
            await prisma.balance.update({
                where: { id: balance.id },
                data: { amount: { increment: parseFloat(transaction.amount.toString()) } }
            });
        } else {
            // Если MAIN баланса нет - создаём
            await prisma.balance.create({
                data: {
                    userId: transaction.userId,
                    tokenId: transaction.tokenId,
                    type: 'MAIN',
                    amount: parseFloat(transaction.amount.toString())
                }
            });
        }

        // Помечаем транзакцию как FAILED с информацией об админе
        const updatedTransaction = await prisma.transaction.update({
            where: { id: parseInt(req.params.id) },
            data: { 
                status: 'FAILED',
                approvedById: req.user.id,
                approvedAt: new Date(),
                rejectReason: reason || null
            },
            include: {
                approvedBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true
                    }
                }
            }
        });

        res.json({ ok: true, message: 'Withdrawal rejected and funds returned', transaction: updatedTransaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ====================================
// 🔔 ЛОГИ ВЕБ-ХУКОВ
// ====================================

router.get('/api/admin/webhook-logs', requireAdminAuth, async (req, res) => {
    try {
        const logs = await prisma.transaction.findMany({
            where: { type: 'DEPOSIT' },
            include: { user: true, token: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ====================================
// ⚙️ СИСТЕМНЫЕ НАСТРОЙКИ
// ====================================

router.get('/api/admin/settings', requireAdminAuth, async (req, res) => {
    try {
        res.json({
            minDeposit: 10,
            maxDeposit: 10000,
            minWithdraw: 10,
            maxWithdraw: 5000,
            depositFee: 0,
            withdrawFee: 2.5,
            webhookStatus: 'active',
            botStatus: 'online'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ====================================
// 📤 РУЧНОЕ ПОПОЛНЕНИЕ (Только суперадмин)
// ====================================

router.post('/api/admin/manual-deposit', requireAdminAuth, async (req, res) => {
    try {
        // Проверяем что это суперадмин (например, ID 1)
        if (req.user.id !== 1) {
            return res.status(403).json({ error: 'Only super admin can do this' });
        }

        const { userId, amount, tokenSymbol = 'USDT' } = req.body;

        if (!userId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const token = await prisma.cryptoToken.findUnique({
            where: { symbol: tokenSymbol }
        });

        if (!token) {
            return res.status(400).json({ error: 'Token not found' });
        }

        const balance = await prisma.balance.findFirst({
            where: {
                userId,
                tokenId: token.id,
                type: 'MAIN'
            }
        });

        if (balance) {
            await prisma.balance.update({
                where: { id: balance.id },
                data: { amount: balance.amount + amount }
            });
        } else {
            await prisma.balance.create({
                data: {
                    userId,
                    tokenId: token.id,
                    amount,
                    type: 'MAIN'
                }
            });
        }

        // Создаём транзакцию
        await prisma.transaction.create({
            data: {
                userId,
                tokenId: token.id,
                type: 'DEPOSIT',
                status: 'COMPLETED',
                amount,
                walletAddress: 'ADMIN_MANUAL'
            }
        });

        res.json({ ok: true, message: `$${amount} added to user ${userId}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
