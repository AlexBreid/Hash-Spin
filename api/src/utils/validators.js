/**
 * ✅ ПОЛНЫЙ validators.js - КОПИРУЙ ВЕСЬ КОД В src/utils/validators.js
 * 15+ готовых функций валидации
 * Проверено - работает!
 */

// ====================================
// КОНСТАНТЫ ВАЛИДАЦИИ
// ====================================
const VALIDATION_RULES = {
  // Минимум/максимум для денег
  MIN_DEPOSIT: 0.01,
  MAX_DEPOSIT: 1000000,
  MIN_WITHDRAW: 1,
  MAX_WITHDRAW: 100000,
  
  // Длины
  MIN_ADDRESS_LENGTH: 26,
  MAX_ADDRESS_LENGTH: 100,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 32,
  
  // Пороги
  MIN_USER_ID: 1,
  MAX_USER_ID: 2147483647, // 32-bit int max
};

// ====================================
// REGEX PATTERNS
// ====================================
const PATTERNS = {
  // Email формат
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Крипто адрес (буквы, цифры, подчеркивание, дефис)
  WALLET_ADDRESS: /^[a-zA-Z0-9_-]+$/,
  
  // Username (буквы, цифры, подчеркивание)
  USERNAME: /^[a-zA-Z0-9_]+$/,
  
  // Только цифры
  DIGITS_ONLY: /^\d+$/,
  
  // Номер телефона (международный формат)
  PHONE: /^\+?[1-9]\d{1,14}$/,
};

// ====================================
// ОСНОВНЫЕ ВАЛИДАТОРЫ
// ====================================

/**
 * ✅ Валидировать EMAIL
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  const trimmed = email.trim().toLowerCase();
  
  if (trimmed.length > 254) return false;
  
  return PATTERNS.EMAIL.test(trimmed);
}

/**
 * ✅ Валидировать КОЛИЧЕСТВО денег
 */
function validateAmount(
  amount,
  minAmount = VALIDATION_RULES.MIN_DEPOSIT,
  maxAmount = VALIDATION_RULES.MAX_DEPOSIT
) {
  // Проверка 1: Парсим
  const num = parseFloat(amount);
  
  // Проверка 2: NaN?
  if (isNaN(num)) return false;
  
  // Проверка 3: Положительно?
  if (num <= 0) return false;
  
  // Проверка 4: Минимум?
  if (num < minAmount) return false;
  
  // Проверка 5: Максимум?
  if (num > maxAmount) return false;
  
  // Проверка 6: Точность?
  const decimalPlaces = (num.toString().split('.')[1] || '').length;
  if (decimalPlaces > 8) return false;
  
  return true;
}

/**
 * ✅ Валидировать АДРЕС КОШЕЛЬКА
 */
function validateWalletAddress(address) {
  if (!address || typeof address !== 'string') return false;
  
  const trimmed = address.trim();
  
  // Проверка длины
  if (trimmed.length < VALIDATION_RULES.MIN_ADDRESS_LENGTH) return false;
  if (trimmed.length > VALIDATION_RULES.MAX_ADDRESS_LENGTH) return false;
  
  // Проверка символов
  if (!PATTERNS.WALLET_ADDRESS.test(trimmed)) return false;
  
  // Проверка пробелов
  if (/\s/.test(trimmed)) return false;
  
  return true;
}

/**
 * ✅ Валидировать ID ПОЛЬЗОВАТЕЛЯ
 */
function validateUserId(id) {
  const num = parseInt(id, 10);
  
  // Проверка NaN
  if (isNaN(num)) return false;
  
  // Проверка границ
  if (num < VALIDATION_RULES.MIN_USER_ID) return false;
  if (num > VALIDATION_RULES.MAX_USER_ID) return false;
  
  return true;
}

/**
 * ✅ Валидировать ID ИНВОЙСА
 */
function validateInvoiceId(invoiceId) {
  const num = parseInt(invoiceId, 10);
  
  if (isNaN(num)) return false;
  if (num <= 0) return false;
  
  return true;
}

/**
 * ✅ Валидировать USERNAME
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  
  const trimmed = username.trim().toLowerCase();
  
  // Проверка длины
  if (trimmed.length < VALIDATION_RULES.MIN_USERNAME_LENGTH) return false;
  if (trimmed.length > VALIDATION_RULES.MAX_USERNAME_LENGTH) return false;
  
  // Проверка формата
  if (!PATTERNS.USERNAME.test(trimmed)) return false;
  
  // Не может начинаться с подчеркивания
  if (trimmed.startsWith('_')) return false;
  
  return true;
}

/**
 * ✅ Валидировать ТЕЛЕФОН
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  
  const trimmed = phone.trim();
  
  return PATTERNS.PHONE.test(trimmed);
}

/**
 * ✅ Валидировать ПАРОЛЬ
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  
  // Проверка 1: Минимум 8 символов
  if (password.length < 8) return false;
  
  // Проверка 2: Максимум 128 символов
  if (password.length > 128) return false;
  
  // Проверка 3: ПРОПИСНАЯ буква
  if (!/[A-Z]/.test(password)) return false;
  
  // Проверка 4: Строчная буква
  if (!/[a-z]/.test(password)) return false;
  
  // Проверка 5: Цифра
  if (!/[0-9]/.test(password)) return false;
  
  // Проверка 6: Спецсимволы
  if (!/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\]/.test(password)) return false;
  
  return true;
}

/**
 * ✅ Валидировать СУММУ ДЕПОЗИТА
 */
function validateDepositAmount(amount) {
  return validateAmount(
    amount,
    VALIDATION_RULES.MIN_DEPOSIT,
    VALIDATION_RULES.MAX_DEPOSIT
  );
}

/**
 * ✅ Валидировать СУММУ ВЫВОДА
 */
function validateWithdrawAmount(amount) {
  return validateAmount(
    amount,
    VALIDATION_RULES.MIN_WITHDRAW,
    VALIDATION_RULES.MAX_WITHDRAW
  );
}

/**
 * ✅ Валидировать СТАТУС ТРАНЗАКЦИИ
 */
function validateTransactionStatus(status) {
  const validStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];
  return validStatuses.includes(status?.toUpperCase());
}

/**
 * ✅ Валидировать ТИП ТРАНЗАКЦИИ
 */
function validateTransactionType(type) {
  const validTypes = ['DEPOSIT', 'WITHDRAW', 'TRANSFER', 'BONUS', 'REFERRAL_COMMISSION'];
  return validTypes.includes(type?.toUpperCase());
}

/**
 * ✅ Валидировать ASSET (USDT, BTC, ETH и т.д.)
 */
function validateAsset(asset) {
  const validAssets = ['USDT', 'USDC', 'TON', 'BTC', 'ETH'];
  return validAssets.includes(asset?.toUpperCase());
}

/**
 * ✅ ВАЛИДИРОВАТЬ ОБЪЕКТ ДЕПОЗИТА
 */
function validateDepositRequest(data) {
  const errors = [];
  
  // Проверка userId
  if (!data.userId || !validateUserId(data.userId)) {
    errors.push('Invalid userId');
  }
  
  // Проверка amount
  if (!data.amount || !validateDepositAmount(data.amount)) {
    errors.push(`Amount must be between ${VALIDATION_RULES.MIN_DEPOSIT} and ${VALIDATION_RULES.MAX_DEPOSIT}`);
  }
  
  // Проверка asset
  if (!data.asset || !validateAsset(data.asset)) {
    errors.push('Invalid asset');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * ✅ ВАЛИДИРОВАТЬ ОБЪЕКТ ВЫВОДА
 */
function validateWithdrawRequest(data) {
  const errors = [];
  
  // Проверка userId
  if (!data.userId || !validateUserId(data.userId)) {
    errors.push('Invalid userId');
  }
  
  // Проверка amount
  if (!data.amount || !validateWithdrawAmount(data.amount)) {
    errors.push(`Amount must be between ${VALIDATION_RULES.MIN_WITHDRAW} and ${VALIDATION_RULES.MAX_WITHDRAW}`);
  }
  
  // Проверка адреса
  if (!data.walletAddress || !validateWalletAddress(data.walletAddress)) {
    errors.push('Invalid wallet address');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ====================================
// ЭКСПОРТ
// ====================================
module.exports = {
  // Основные валидаторы
  validateEmail,
  validateAmount,
  validateWalletAddress,
  validateUserId,
  validateInvoiceId,
  validateUsername,
  validatePhone,
  validatePassword,
  validateDepositAmount,
  validateWithdrawAmount,
  validateTransactionStatus,
  validateTransactionType,
  validateAsset,
  
  // Комплексные валидаторы
  validateDepositRequest,
  validateWithdrawRequest,
  
  // Константы и патерны
  VALIDATION_RULES,
  PATTERNS
};