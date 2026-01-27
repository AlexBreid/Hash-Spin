-- ВАЖНО: Перед применением этой миграции нужно убедиться, что нет дубликатов
-- Если есть токены с одинаковым symbol, но разными network - это нормально
-- Но если есть токены с одинаковым symbol И network - нужно их объединить

-- Шаг 1: Удаляем старое уникальное ограничение на symbol
ALTER TABLE "CryptoToken" DROP CONSTRAINT IF EXISTS "CryptoToken_symbol_key";

-- Шаг 2: Добавляем уникальное ограничение на комбинацию symbol + network
-- Это позволит иметь несколько токенов с одинаковым symbol, но разными network
-- Например: USDT TRC-20, USDT ERC-20, USDT BEP-20 и т.д.
ALTER TABLE "CryptoToken" ADD CONSTRAINT "CryptoToken_symbol_network_key" UNIQUE ("symbol", "network");

-- Шаг 3: Добавляем индекс на symbol для быстрого поиска
CREATE INDEX IF NOT EXISTS "CryptoToken_symbol_idx" ON "CryptoToken"("symbol");
