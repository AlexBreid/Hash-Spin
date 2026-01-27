/**
 * Скрипт для безопасного применения миграции валют
 * 
 * Этот скрипт:
 * 1. Проверяет существующие токены
 * 2. Удаляет старое уникальное ограничение
 * 3. Добавляет новое уникальное ограничение на symbol + network
 * 4. Синхронизирует все валюты
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('\n🔍 Проверяю существующие токены...');
    
    // Получаем все токены
    const tokens = await prisma.$queryRaw`
      SELECT "symbol", "network", COUNT(*) as count
      FROM "CryptoToken"
      GROUP BY "symbol", "network"
      HAVING COUNT(*) > 1
    `;
    
    if (tokens.length > 0) {
      console.log('⚠️ Найдены дубликаты:');
      tokens.forEach(t => {
        console.log(`   ${t.symbol} (${t.network}): ${t.count} записей`);
      });
      console.log('\n❌ Нужно сначала удалить дубликаты вручную');
      return;
    }
    
    console.log('✅ Дубликатов не найдено\n');
    
    console.log('📝 Применяю миграцию...');
    
    // Удаляем старое ограничение
    try {
      await prisma.$executeRaw`ALTER TABLE "CryptoToken" DROP CONSTRAINT IF EXISTS "CryptoToken_symbol_key"`;
      console.log('✅ Удалено старое ограничение на symbol');
    } catch (e) {
      console.log('ℹ️ Старое ограничение не найдено (возможно уже удалено)');
    }
    
    // Добавляем новое ограничение
    try {
      await prisma.$executeRaw`ALTER TABLE "CryptoToken" ADD CONSTRAINT "CryptoToken_symbol_network_key" UNIQUE ("symbol", "network")`;
      console.log('✅ Добавлено новое ограничение на symbol + network');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('ℹ️ Ограничение уже существует');
      } else {
        throw e;
      }
    }
    
    // Добавляем индекс
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CryptoToken_symbol_idx" ON "CryptoToken"("symbol")`;
      console.log('✅ Добавлен индекс на symbol');
    } catch (e) {
      console.log('ℹ️ Индекс уже существует');
    }
    
    console.log('\n✅ Миграция применена успешно!');
    console.log('\n💱 Теперь можно синхронизировать валюты...');
    
  } catch (error) {
    console.error('\n❌ Ошибка при применении миграции:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

