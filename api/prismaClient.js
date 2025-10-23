const { PrismaClient } = require('@prisma/client');

// Создание и экспорт глобального, переиспользуемого клиента Prisma
let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    // Используем глобальный объект для кеширования в Dev Mode (для предотвращения ошибок HMR)
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

module.exports = prisma;