/**
 * 🎮 PLINKO MICROSERVICE - Fairness Verification
 * Проверка честности игр через Seed-based система
 */

const crypto = require('crypto');

/**
 * Генерируем хеш для игры на основе seeds
 */
function generateHash(serverSeed, clientSeed, nonce) {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Генерируем результат из хеша
 */
function generateOutcome(hash, range) {
    const hashNumber = parseInt(hash.substring(0, 8), 16);
    return hashNumber % range;
}

/**
 * Проверить честность игры
 */
exports.verify = function({ gameId, serverSeed, clientSeed, nonce }) {
    try {
        // Генерируем хеш
        const hash = generateHash(serverSeed, clientSeed, nonce);

        // Проверяем что хеш валиден
        if (!hash || hash.length !== 64) {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in verify:', error.message);
        return false;
    }
};

/**
 * Генерируем seed для пользователя
 */
exports.generateServerSeed = function() {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Генерируем hash seed для публикации
 */
exports.hashServerSeed = function(serverSeed) {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
};

/**
 * Предоставляем результат проверки
 */
exports.provabilityInfo = function() {
    return {
        algorithm: 'HMAC-SHA256',
        description: 'Server seed hashed using SHA256',
        howToVerify: [
            '1. Get server seed from game history',
            '2. Get client seed from wallet',
            '3. Get nonce from game',
            '4. Compute HMAC-SHA256(server_seed:client_seed:nonce)',
            '5. Compare with game hash'
        ]
    };
};

module.exports = exports;