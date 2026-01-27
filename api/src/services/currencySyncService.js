/**
 * Сервис синхронизации валют из CryptoBot и CryptoCloud в базу данных
 * 
 * Поддерживает все валюты из обоих сервисов и автоматически добавляет их в CryptoToken таблицу
 * 
 * ВАЖНО: Балансы хранятся на "базовых" токенах (USDT, USDC, BTC, etc.)
 * При пополнении можно выбрать сеть, но зачисление идет на базовый токен
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');

// Флаг для предотвращения параллельных синхронизаций
let isSyncing = false;
let lastSyncTime = 0;
const SYNC_COOLDOWN = 60000; // 60 секунд между синхронизациями

// ============================================
// БАЗОВЫЕ ТОКЕНЫ ДЛЯ БАЛАНСОВ
// ============================================
// Эти токены используются для хранения балансов.
// У них network = 'MULTI' означает, что это объединенный баланс.
const BASE_TOKENS = [
  { symbol: 'USDT', name: 'Tether USD', network: 'MULTI', decimals: 6, isBase: true },
  { symbol: 'USDC', name: 'USD Coin', network: 'MULTI', decimals: 6, isBase: true },
  { symbol: 'TUSD', name: 'TrueUSD', network: 'MULTI', decimals: 18, isBase: true },
  { symbol: 'USDD', name: 'Decentralized USD', network: 'MULTI', decimals: 6, isBase: true },
  { symbol: 'BTC', name: 'Bitcoin', network: 'BTC', decimals: 8, isBase: true },
  { symbol: 'ETH', name: 'Ethereum', network: 'MULTI', decimals: 18, isBase: true },
  { symbol: 'TON', name: 'The Open Network', network: 'TON', decimals: 9, isBase: true },
  { symbol: 'TRX', name: 'TRON', network: 'TRC-20', decimals: 6, isBase: true },
  { symbol: 'LTC', name: 'Litecoin', network: 'LTC', decimals: 8, isBase: true },
  { symbol: 'BNB', name: 'Binance Coin', network: 'BEP-20', decimals: 18, isBase: true },
  { symbol: 'SOL', name: 'Solana', network: 'SOL', decimals: 9, isBase: true },
  { symbol: 'SHIB', name: 'Shiba Inu', network: 'ERC-20', decimals: 18, isBase: true },
];

// ============================================
// СЕТИ ДЛЯ ПОПОЛНЕНИЯ/ВЫВОДА
// ============================================
// Эти варианты показываются при выборе способа пополнения
const DEPOSIT_NETWORKS = {
  'USDT': [
    { network: 'TRC-20', name: 'TRON (TRC-20)', fee: 'Низкая', speed: 'Быстро' },
    { network: 'BEP-20', name: 'BSC (BEP-20)', fee: 'Низкая', speed: 'Быстро' },
    { network: 'TON', name: 'TON', fee: 'Очень низкая', speed: 'Очень быстро' },
    { network: 'SOL', name: 'Solana', fee: 'Низкая', speed: 'Быстро' },
    { network: 'ARB', name: 'Arbitrum', fee: 'Низкая', speed: 'Быстро' },
    { network: 'OP', name: 'Optimism', fee: 'Низкая', speed: 'Быстро' },
    { network: 'ERC-20', name: 'Ethereum (ERC-20)', fee: 'Высокая', speed: 'Средне' },
  ],
  'USDC': [
    { network: 'TRC-20', name: 'TRON (TRC-20)', fee: 'Низкая', speed: 'Быстро' },
    { network: 'BEP-20', name: 'BSC (BEP-20)', fee: 'Низкая', speed: 'Быстро' },
    { network: 'SOL', name: 'Solana', fee: 'Низкая', speed: 'Быстро' },
    { network: 'BASE', name: 'Base', fee: 'Низкая', speed: 'Быстро' },
    { network: 'ARB', name: 'Arbitrum', fee: 'Низкая', speed: 'Быстро' },
    { network: 'OP', name: 'Optimism', fee: 'Низкая', speed: 'Быстро' },
    { network: 'ERC-20', name: 'Ethereum (ERC-20)', fee: 'Высокая', speed: 'Средне' },
  ],
  'TUSD': [
    { network: 'ERC-20', name: 'Ethereum (ERC-20)', fee: 'Высокая', speed: 'Средне' },
    { network: 'BEP-20', name: 'BSC (BEP-20)', fee: 'Низкая', speed: 'Быстро' },
  ],
  'USDD': [
    { network: 'TRC-20', name: 'TRON (TRC-20)', fee: 'Низкая', speed: 'Быстро' },
  ],
  'ETH': [
    { network: 'ERC-20', name: 'Ethereum (ERC-20)', fee: 'Средняя', speed: 'Средне' },
    { network: 'OP', name: 'Optimism', fee: 'Низкая', speed: 'Быстро' },
    { network: 'ARB', name: 'Arbitrum', fee: 'Низкая', speed: 'Быстро' },
  ],
  'BTC': [
    { network: 'BTC', name: 'Bitcoin', fee: 'Средняя', speed: 'Медленно (10-60 мин)' },
  ],
  'TON': [
    { network: 'TON', name: 'TON', fee: 'Очень низкая', speed: 'Очень быстро' },
  ],
  'TRX': [
    { network: 'TRC-20', name: 'TRON (TRC-20)', fee: 'Очень низкая', speed: 'Быстро' },
  ],
  'LTC': [
    { network: 'LTC', name: 'Litecoin', fee: 'Низкая', speed: 'Быстро' },
  ],
  'BNB': [
    { network: 'BEP-20', name: 'BSC (BEP-20)', fee: 'Низкая', speed: 'Быстро' },
  ],
  'SOL': [
    { network: 'SOL', name: 'Solana', fee: 'Очень низкая', speed: 'Очень быстро' },
  ],
  'SHIB': [
    { network: 'ERC-20', name: 'Ethereum (ERC-20)', fee: 'Высокая', speed: 'Средне' },
  ],
};

// Устаревшие списки — оставляем для совместимости при синхронизации сетей
const CRYPTO_BOT_CURRENCIES = [
  { symbol: 'USDT', name: 'Tether USD', network: 'TRC-20', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', network: 'ERC-20', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', network: 'BEP-20', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', network: 'SOL', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', network: 'OP', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', network: 'ARB', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', network: 'TON', decimals: 6 },
  { symbol: 'USDC', name: 'USD Coin', network: 'ERC-20', decimals: 6 },
  { symbol: 'USDC', name: 'USD Coin', network: 'BEP-20', decimals: 6 },
  { symbol: 'USDC', name: 'USD Coin', network: 'SOL', decimals: 6 },
  { symbol: 'USDC', name: 'USD Coin', network: 'OP', decimals: 6 },
  { symbol: 'USDC', name: 'USD Coin', network: 'BASE', decimals: 6 },
  { symbol: 'USDC', name: 'USD Coin', network: 'ARB', decimals: 6 },
  { symbol: 'BTC', name: 'Bitcoin', network: 'BTC', decimals: 8 },
  { symbol: 'ETH', name: 'Ethereum', network: 'ERC-20', decimals: 18 },
  { symbol: 'ETH', name: 'Ethereum', network: 'OP', decimals: 18 },
  { symbol: 'TON', name: 'The Open Network', network: 'TON', decimals: 9 },
  { symbol: 'TRX', name: 'TRON', network: 'TRC-20', decimals: 6 },
  { symbol: 'LTC', name: 'Litecoin', network: 'LTC', decimals: 8 },
  { symbol: 'BNB', name: 'Binance Coin', network: 'BEP-20', decimals: 18 },
  { symbol: 'SOL', name: 'Solana', network: 'SOL', decimals: 9 },
  { symbol: 'SHIB', name: 'Shiba Inu', network: 'ERC-20', decimals: 18 },
  { symbol: 'USDD', name: 'Decentralized USD', network: 'TRC-20', decimals: 6 },
  { symbol: 'TUSD', name: 'TrueUSD', network: 'ERC-20', decimals: 18 },
  { symbol: 'TUSD', name: 'TrueUSD', network: 'BEP-20', decimals: 18 },
];

const CRYPTO_CLOUD_CURRENCIES = CRYPTO_BOT_CURRENCIES; // Одинаковый список

/**
 * Получить уникальный ключ для валюты (symbol + network)
 */
function getCurrencyKey(currency) {
  return `${currency.symbol}_${currency.network}`;
}

/**
 * Объединить валюты из обоих сервисов (уникальные по symbol + network)
 */
function mergeCurrencies() {
  const currencyMap = new Map();
  
  // Добавляем валюты CryptoBot
  for (const currency of CRYPTO_BOT_CURRENCIES) {
    const key = getCurrencyKey(currency);
    if (!currencyMap.has(key)) {
      currencyMap.set(key, currency);
    }
  }
  
  // Добавляем валюты CryptoCloud (если их еще нет)
  for (const currency of CRYPTO_CLOUD_CURRENCIES) {
    const key = getCurrencyKey(currency);
    if (!currencyMap.has(key)) {
      currencyMap.set(key, currency);
    }
  }
  
  return Array.from(currencyMap.values());
}

/**
 * Синхронизировать все валюты в базу данных
 * Защита от частых вызовов: не более одного раза в минуту
 */
async function syncCurrencies(force = false) {
  // Проверяем, не идет ли уже синхронизация
  if (isSyncing) {
    logger.debug('CURRENCY_SYNC', 'Synchronization already in progress, skipping');
    return;
  }

  // Проверяем cooldown (если не принудительная синхронизация)
  if (!force) {
    const now = Date.now();
    if (now - lastSyncTime < SYNC_COOLDOWN) {
      logger.debug('CURRENCY_SYNC', `Synchronization cooldown active, skipping (last sync: ${Math.floor((now - lastSyncTime) / 1000)}s ago)`);
      return;
    }
  }

  isSyncing = true;
  lastSyncTime = Date.now();

  try {
    logger.info('CURRENCY_SYNC', 'Starting currency synchronization');
    
    // Сначала создаём базовые токены для балансов
    const baseCreated = await syncBaseTokens();
    logger.info('CURRENCY_SYNC', `Created ${baseCreated} base tokens`);
    
    const allCurrencies = mergeCurrencies();
    logger.info('CURRENCY_SYNC', `Found ${allCurrencies.length} unique currencies (for deposit networks)`);
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const currency of allCurrencies) {
      try {
        // Ищем существующий токен по symbol и network
        const existing = await prisma.cryptoToken.findFirst({
          where: {
            symbol: currency.symbol,
            network: currency.network
          }
        });
        
        if (existing) {
          // Обновляем если нужно
          if (existing.name !== currency.name || existing.decimals !== currency.decimals) {
            await prisma.cryptoToken.update({
              where: { id: existing.id },
              data: {
                name: currency.name,
                decimals: currency.decimals
              }
            });
            updated++;
            logger.debug('CURRENCY_SYNC', `Updated ${currency.symbol} (${currency.network})`);
          } else {
            skipped++;
          }
        } else {
          // Создаем новый токен
          // Используем findFirst + create/update вместо upsert (миграция может быть не применена)
          try {
            await prisma.cryptoToken.create({
              data: {
                symbol: currency.symbol,
                name: currency.name,
                network: currency.network,
                decimals: currency.decimals
              }
            });
            created++;
            logger.info('CURRENCY_SYNC', `Created ${currency.symbol} (${currency.network})`);
          } catch (createError) {
            // Если ошибка уникальности - токен уже существует
            if (createError.code === 'P2002') {
              // Пробуем найти и обновить существующий токен
              const existingToken = await prisma.cryptoToken.findFirst({
                where: {
                  symbol: currency.symbol,
                  network: currency.network
                }
              });
              
              if (existingToken) {
                // Обновляем если нужно
                if (existingToken.name !== currency.name || existingToken.decimals !== currency.decimals) {
                  await prisma.cryptoToken.update({
                    where: { id: existingToken.id },
                    data: {
                      name: currency.name,
                      decimals: currency.decimals
                    }
                  });
                  updated++;
                  logger.info('CURRENCY_SYNC', `Updated ${currency.symbol} (${currency.network})`);
                } else {
                  skipped++;
                }
              } else {
                // Если не нашли по symbol+network, возможно старая схема с unique на symbol
                logger.warn('CURRENCY_SYNC', `Token with symbol ${currency.symbol} already exists but network mismatch. Please apply migration.`);
                skipped++;
              }
            } else {
              logger.error('CURRENCY_SYNC', `Error creating ${currency.symbol} (${currency.network}): ${createError.message}`);
            }
          }
        }
      } catch (error) {
        logger.error('CURRENCY_SYNC', `Error syncing ${currency.symbol} (${currency.network})`, {
          error: error.message,
          code: error.code
        });
      }
    }
    
    logger.info('CURRENCY_SYNC', 'Currency synchronization completed', {
      created,
      updated,
      skipped,
      total: allCurrencies.length
    });
    
    return {
      success: true,
      created,
      updated,
      skipped,
      total: allCurrencies.length
    };
  } catch (error) {
    logger.error('CURRENCY_SYNC', 'Failed to sync currencies', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    // Всегда сбрасываем флаг синхронизации
    isSyncing = false;
  }
}

/**
 * Получить все доступные валюты из базы данных
 */
async function getAvailableCurrencies() {
  try {
    const tokens = await prisma.cryptoToken.findMany({
      orderBy: [
        { symbol: 'asc' },
        { network: 'asc' }
      ]
    });
    
    return tokens.map(token => ({
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      network: token.network,
      decimals: token.decimals
    }));
  } catch (error) {
    logger.error('CURRENCY_SYNC', 'Failed to get available currencies', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Получить валюты, поддерживаемые CryptoBot
 */
function getCryptoBotCurrencies() {
  return CRYPTO_BOT_CURRENCIES;
}

/**
 * Получить валюты, поддерживаемые CryptoCloud
 */
function getCryptoCloudCurrencies() {
  return CRYPTO_CLOUD_CURRENCIES;
}

/**
 * Получить валюту по symbol и network
 */
async function getCurrencyBySymbolAndNetwork(symbol, network) {
  try {
    const token = await prisma.cryptoToken.findFirst({
      where: {
        symbol: symbol.toUpperCase(),
        network: network
      }
    });
    
    return token;
  } catch (error) {
    logger.error('CURRENCY_SYNC', 'Failed to get currency', {
      symbol,
      network,
      error: error.message
    });
    return null;
  }
}

/**
 * Резервные курсы валют к USD (используются если API недоступен)
 */
const FALLBACK_RATES = {
  'USDT': 1.0,
  'USDC': 1.0,
  'USDD': 1.0,
  'TUSD': 1.0,
  'BTC': 100000,
  'ETH': 3300,
  'BNB': 700,
  'SOL': 200,
  'TRX': 0.25,
  'LTC': 130,
  'TON': 5.5,
  'SHIB': 0.00002,
};

/**
 * Маппинг символов на CoinGecko IDs
 */
const COINGECKO_IDS = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'TRX': 'tron',
  'LTC': 'litecoin',
  'TON': 'the-open-network',
  'SHIB': 'shiba-inu',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'TUSD': 'true-usd',
  'USDD': 'usdd',
};

/**
 * Кэш для курсов валют
 */
let ratesCache = {
  data: { ...FALLBACK_RATES },
  timestamp: 0,
  ttl: 5 * 60 * 1000  // 5 минут кэш
};

/**
 * Получить актуальные курсы с CoinGecko API
 * @returns {Promise<Object>} Курсы валют к USD
 */
async function fetchLiveRates() {
  const now = Date.now();
  
  // Возвращаем кэш если он свежий
  if (ratesCache.timestamp && (now - ratesCache.timestamp) < ratesCache.ttl) {
    logger.debug('CURRENCY_SYNC', 'Using cached rates', {
      age: Math.floor((now - ratesCache.timestamp) / 1000) + 's'
    });
    return ratesCache.data;
  }
  
  try {
    const ids = Object.values(COINGECKO_IDS).join(',');
    const axios = require('axios');
    
    logger.info('CURRENCY_SYNC', 'Fetching live rates from CoinGecko');
    
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { timeout: 10000 }
    );
    
    if (response.data) {
      const newRates = { ...FALLBACK_RATES };
      
      // Маппим обратно: CoinGecko ID → символ
      for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
        if (response.data[geckoId] && response.data[geckoId].usd) {
          newRates[symbol] = response.data[geckoId].usd;
        }
      }
      
      // Стейблкоины всегда = 1
      newRates['USDT'] = 1.0;
      newRates['USDC'] = 1.0;
      newRates['TUSD'] = 1.0;
      newRates['USDD'] = 1.0;
      
      // Обновляем кэш
      ratesCache.data = newRates;
      ratesCache.timestamp = now;
      
      logger.info('CURRENCY_SYNC', 'Live rates updated', {
        BTC: newRates['BTC'],
        ETH: newRates['ETH'],
        BNB: newRates['BNB'],
        SOL: newRates['SOL'],
        TON: newRates['TON']
      });
      
      return newRates;
    }
  } catch (error) {
    logger.warn('CURRENCY_SYNC', 'Failed to fetch live rates, using fallback', {
      error: error.message
    });
  }
  
  // Возвращаем кэш или fallback
  return ratesCache.data;
}

/**
 * Получить текущие курсы (синхронно из кэша)
 */
function getCurrencyRates() {
  return ratesCache.data;
}

/**
 * Конвертировать сумму из криптовалюты в USD (с актуальным курсом)
 * @param {number} amount - Сумма в криптовалюте
 * @param {string} symbol - Символ криптовалюты (BTC, ETH, BNB и т.д.)
 * @returns {number} Сумма в USD
 */
function convertCryptoToUSD(amount, symbol) {
  const rate = ratesCache.data[symbol.toUpperCase()] || FALLBACK_RATES[symbol.toUpperCase()] || 1.0;
  return amount * rate;
}

/**
 * Конвертировать сумму из криптовалюты в USD (асинхронно с актуальным курсом)
 */
async function convertCryptoToUSDAsync(amount, symbol) {
  const rates = await fetchLiveRates();
  const rate = rates[symbol.toUpperCase()] || 1.0;
  return amount * rate;
}

/**
 * Конвертировать сумму из USD в криптовалюту
 * @param {number} amountUSD - Сумма в USD
 * @param {string} symbol - Символ криптовалюты
 * @returns {number} Сумма в криптовалюте
 */
function convertUSDToCrypto(amountUSD, symbol) {
  const rate = ratesCache.data[symbol.toUpperCase()] || FALLBACK_RATES[symbol.toUpperCase()] || 1.0;
  if (rate <= 0) return amountUSD;
  return amountUSD / rate;
}

/**
 * Конвертировать сумму из USD в криптовалюту (асинхронно)
 */
async function convertUSDToCryptoAsync(amountUSD, symbol) {
  const rates = await fetchLiveRates();
  const rate = rates[symbol.toUpperCase()] || 1.0;
  if (rate <= 0) return amountUSD;
  return amountUSD / rate;
}

/**
 * Получить курс валюты к USD (синхронно из кэша)
 * @param {string} symbol - Символ валюты
 * @returns {number} Курс к USD
 */
function getCurrencyRate(symbol) {
  return ratesCache.data[symbol.toUpperCase()] || FALLBACK_RATES[symbol.toUpperCase()] || 1.0;
}

/**
 * Получить курс валюты к USD (асинхронно с обновлением)
 */
async function getCurrencyRateAsync(symbol) {
  const rates = await fetchLiveRates();
  return rates[symbol.toUpperCase()] || 1.0;
}

// Для обратной совместимости
const CURRENCY_RATES = FALLBACK_RATES;

/**
 * Получить максимальную ставку для валюты (в единицах валюты)
 * Базовая максимальная ставка: 1000 USD
 */
function getMaxBetForCurrency(symbol) {
  const baseMaxBetUSD = 1000; // Максимальная ставка в USD
  const rate = CURRENCY_RATES[symbol.toUpperCase()] || 1.0;
  
  if (rate <= 0) {
    // Для очень дешевых валют (SHIB) устанавливаем разумный лимит
    return 100000000; // 100 миллионов единиц
  }
  
  // Рассчитываем максимальную ставку в единицах валюты
  const maxBet = baseMaxBetUSD / rate;
  
  // Округляем до разумного значения с учетом типа валюты
  if (maxBet >= 10000) {
    // Для очень дешевых валют (TRX ~14,000)
    return Math.floor(maxBet / 1000) * 1000;
  } else if (maxBet >= 1000) {
    // Для дешевых валют (TON ~500)
    return Math.floor(maxBet / 10) * 10;
  } else if (maxBet >= 100) {
    return Math.floor(maxBet / 10) * 10;
  } else if (maxBet >= 10) {
    // Для средних валют (LTC ~10)
    return Math.floor(maxBet);
  } else if (maxBet >= 1) {
    // Для валют типа BNB (~1.5)
    return Math.ceil(maxBet * 10) / 10;
  } else if (maxBet >= 0.1) {
    // Для валют типа SOL (~0.6)
    return Math.ceil(maxBet * 10) / 10;
  } else if (maxBet >= 0.01) {
    // Для дорогих валют типа ETH (~0.37)
    return Math.ceil(maxBet * 100) / 100;
  } else {
    // Для очень дорогих валют (BTC ~0.015)
    return Math.ceil(maxBet * 1000) / 1000;
  }
}

/**
 * Получить максимальную ставку для токена по ID
 */
async function getMaxBetForToken(tokenId) {
  try {
    const token = await prisma.cryptoToken.findUnique({
      where: { id: tokenId }
    });
    
    if (!token) {
      return 1000; // По умолчанию
    }
    
    return getMaxBetForCurrency(token.symbol);
  } catch (error) {
    logger.error('CURRENCY_SYNC', 'Failed to get max bet for token', {
      tokenId,
      error: error.message
    });
    return 1000; // По умолчанию
  }
}

/**
 * Получить минимальную ставку для валюты (в единицах валюты)
 */
function getMinBetForCurrency(symbol) {
  const rate = CURRENCY_RATES[symbol.toUpperCase()] || 1.0;
  const baseMinBetUSD = 0.01; // Минимальная ставка в USD
  
  if (rate <= 0) {
    return 1000; // Для очень дешевых валют
  }
  
  const minBet = baseMinBetUSD / rate;
  
  // Округляем до разумного значения
  if (minBet >= 1) {
    return 1;
  } else if (minBet >= 0.1) {
    return Math.ceil(minBet * 10) / 10;
  } else if (minBet >= 0.01) {
    return Math.ceil(minBet * 100) / 100;
  } else {
    return Math.ceil(minBet * 1000) / 1000;
  }
}

/**
 * Получить минимальный депозит для валюты (в единицах валюты)
 * Базовый минимальный депозит: 10 USD
 */
function getMinDepositForCurrency(symbol) {
  const baseMinDepositUSD = 10; // Минимальный депозит в USD
  // Используем актуальные курсы из кэша
  const rate = ratesCache.data[symbol.toUpperCase()] || FALLBACK_RATES[symbol.toUpperCase()] || 1.0;
  
  if (rate <= 0) {
    return 100000; // Для очень дешевых валют (SHIB и т.д.)
  }
  
  // Рассчитываем минимальный депозит в единицах валюты
  const minDeposit = baseMinDepositUSD / rate;
  
  // Округляем до разумного значения с учетом типа валюты
  if (rate >= 1000) {
    // Дорогие валюты (BTC, ETH) - много знаков после запятой
    return parseFloat(minDeposit.toFixed(6));
  } else if (rate >= 100) {
    // Средние валюты (BNB, SOL, LTC)
    return parseFloat(minDeposit.toFixed(4));
  } else if (rate >= 1) {
    // Стейблкоины и TON
    return Math.ceil(minDeposit * 100) / 100; // Округляем вверх до 2 знаков
  } else {
    // Дешевые валюты (TRX, SHIB)
    return Math.ceil(minDeposit); // Округляем вверх до целого
  }
}

/**
 * Получить минимальный депозит для валюты (асинхронно с актуальным курсом)
 */
async function getMinDepositForCurrencyAsync(symbol) {
  const baseMinDepositUSD = 10;
  const rates = await fetchLiveRates();
  const rate = rates[symbol.toUpperCase()] || 1.0;
  
  if (rate <= 0) return 100000;
  
  const minDeposit = baseMinDepositUSD / rate;
  
  if (rate >= 1000) {
    return parseFloat(minDeposit.toFixed(6));
  } else if (rate >= 100) {
    return parseFloat(minDeposit.toFixed(4));
  } else if (rate >= 1) {
    return Math.ceil(minDeposit * 100) / 100;
  } else {
    return Math.ceil(minDeposit);
  }
}

/**
 * Получить все лимиты депозита для всех валют
 */
function getAllDepositLimits() {
  const limits = {};
  for (const symbol of Object.keys(CURRENCY_RATES)) {
    limits[symbol] = {
      min: getMinDepositForCurrency(symbol),
      rate: CURRENCY_RATES[symbol]
    };
  }
  return limits;
}

// ============================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С БАЗОВЫМИ ТОКЕНАМИ
// ============================================

/**
 * Получить базовый токен по символу (для баланса)
 * @param {string} symbol - Символ валюты (USDT, USDC, BTC и т.д.)
 * @returns {Promise<Object|null>} Базовый токен
 */
async function getBaseToken(symbol) {
  const baseInfo = BASE_TOKENS.find(t => t.symbol === symbol.toUpperCase());
  if (!baseInfo) {
    return null;
  }
  
  // Ищем токен с network = 'MULTI' или специфичной сетью для одиночных валют
  let token = await prisma.cryptoToken.findFirst({
    where: {
      symbol: symbol.toUpperCase(),
      network: baseInfo.network
    }
  });
  
  // Если не нашли MULTI, ищем по символу
  if (!token) {
    token = await prisma.cryptoToken.findFirst({
      where: { symbol: symbol.toUpperCase() },
      orderBy: { id: 'asc' }
    });
  }
  
  return token;
}

/**
 * Получить все базовые токены для отображения балансов
 * Возвращает УНИКАЛЬНЫЕ валюты (один USDT, один USDC и т.д.)
 * @returns {Promise<Array>} Список базовых токенов
 */
async function getBaseTokens() {
  // Получаем все токены из БД
  const allTokens = await prisma.cryptoToken.findMany({
    orderBy: [{ symbol: 'asc' }, { id: 'asc' }]
  });
  
  // Группируем по символу — берём первый токен для каждого символа
  const uniqueTokens = [];
  const seen = new Set();
  
  // Приоритетные сети для каждого символа
  const preferredNetworks = {
    'USDT': 'TRC-20',
    'USDC': 'ERC-20',
    'ETH': 'ERC-20',
    'TUSD': 'ERC-20',
    'USDD': 'TRC-20',
  };
  
  // Сначала группируем все токены по символу
  const tokensBySymbol = new Map();
  for (const token of allTokens) {
    if (!tokensBySymbol.has(token.symbol)) {
      tokensBySymbol.set(token.symbol, []);
    }
    tokensBySymbol.get(token.symbol).push(token);
  }
  
  // Для каждого символа выбираем один токен (предпочитаем определенную сеть)
  for (const [symbol, tokens] of tokensBySymbol) {
    const preferred = preferredNetworks[symbol];
    
    // Ищем токен с предпочитаемой сетью
    let selectedToken = tokens.find(t => t.network === preferred);
    
    // Если не нашли — берём первый
    if (!selectedToken) {
      selectedToken = tokens[0];
    }
    
    uniqueTokens.push({
      ...selectedToken,
      isBase: true,
      // Все доступные сети для этого символа
      allNetworks: tokens.map(t => t.network),
      depositNetworks: DEPOSIT_NETWORKS[symbol] || tokens.map(t => ({
        network: t.network,
        name: t.network,
        fee: '',
        speed: ''
      }))
    });
  }
  
  return uniqueTokens;
}

/**
 * Получить доступные сети для пополнения конкретной валюты
 * @param {string} symbol - Символ валюты
 * @returns {Array} Список сетей
 */
function getDepositNetworks(symbol) {
  return DEPOSIT_NETWORKS[symbol.toUpperCase()] || [];
}

/**
 * Проверить, является ли токен базовым
 * @param {string} symbol - Символ валюты
 * @returns {boolean}
 */
function isBaseToken(symbol) {
  return BASE_TOKENS.some(t => t.symbol === symbol.toUpperCase());
}

/**
 * Синхронизировать базовые токены (создать если не существуют)
 */
async function syncBaseTokens() {
  let created = 0;
  
  for (const base of BASE_TOKENS) {
    try {
      const existing = await prisma.cryptoToken.findFirst({
        where: {
          symbol: base.symbol,
          network: base.network
        }
      });
      
      if (!existing) {
        await prisma.cryptoToken.create({
          data: {
            symbol: base.symbol,
            name: base.name,
            network: base.network,
            decimals: base.decimals
          }
        });
        created++;
        logger.info('CURRENCY_SYNC', `Created base token: ${base.symbol} (${base.network})`);
      }
    } catch (error) {
      // Игнорируем ошибки дубликатов
      if (error.code !== 'P2002') {
        logger.error('CURRENCY_SYNC', `Error creating base token ${base.symbol}`, { error: error.message });
      }
    }
  }
  
  return created;
}

module.exports = {
  syncCurrencies,
  getAvailableCurrencies,
  getCryptoBotCurrencies,
  getCryptoCloudCurrencies,
  getCurrencyBySymbolAndNetwork,
  getMaxBetForCurrency,
  getMaxBetForToken,
  getMinBetForCurrency,
  mergeCurrencies,
  CURRENCY_RATES,
  // Новые функции для базовых токенов
  getBaseToken,
  getBaseTokens,
  getDepositNetworks,
  isBaseToken,
  syncBaseTokens,
  BASE_TOKENS,
  DEPOSIT_NETWORKS,
  // Функции конвертации валют
  convertCryptoToUSD,
  convertCryptoToUSDAsync,
  convertUSDToCrypto,
  convertUSDToCryptoAsync,
  getCurrencyRate,
  getCurrencyRateAsync,
  getCurrencyRates,
  fetchLiveRates,
  // Функции для минимального депозита
  getMinDepositForCurrency,
  getMinDepositForCurrencyAsync,
  getAllDepositLimits
};

