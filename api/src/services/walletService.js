/**
 * Wallet Service
 * Управление кошельками пользователей для каждой валюты
 * Как в Stake - каждая валюта имеет свой отдельный кошелек
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');
const crypto = require('crypto');

class WalletService {
  /**
   * Получить или создать кошелек пользователя для валюты
   * @param {number} userId - ID пользователя
   * @param {number} tokenId - ID токена (валюты)
   * @returns {Promise<Object>} Кошелек пользователя
   */
  async getOrCreateWallet(userId, tokenId) {
    try {
      // Проверяем, есть ли уже кошелек для этой валюты
      let wallet = await prisma.userWallet.findUnique({
        where: {
          userId_tokenId: {
            userId: userId,
            tokenId: tokenId
          }
        },
        include: {
          token: true
        }
      });

      if (wallet) {
        logger.debug('WALLET', `Wallet found for user ${userId}, token ${tokenId}`);
        return wallet;
      }

      // Создаем новый кошелек
      const token = await prisma.cryptoToken.findUnique({
        where: { id: tokenId }
      });

      if (!token) {
        throw new Error(`Token ${tokenId} not found`);
      }

      // Генерируем адрес кошелька в зависимости от сети
      const addressData = await this.generateWalletAddress(token.symbol, token.network);

      wallet = await prisma.userWallet.create({
        data: {
          userId: userId,
          tokenId: tokenId,
          address: addressData.address,
          privateKey: addressData.privateKey ? this.encryptPrivateKey(addressData.privateKey) : null,
          network: token.network,
          isActive: true,
          lastUsedAt: new Date()
        },
        include: {
          token: true
        }
      });

      logger.info('WALLET', `Created wallet for user ${userId}, token ${token.symbol} (${token.network})`, {
        address: addressData.address
      });

      return wallet;
    } catch (error) {
      logger.error('WALLET', 'Failed to get or create wallet', {
        userId,
        tokenId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Генерировать адрес кошелька для валюты
   * @param {string} symbol - Символ валюты (USDT, BTC, ETH и т.д.)
   * @param {string} network - Сеть (TRC-20, ERC-20, BTC и т.д.)
   * @returns {Promise<Object>} Данные кошелька
   */
  async generateWalletAddress(symbol, network) {
    // Для разных сетей нужны разные методы генерации
    // Пока используем простую генерацию, в продакшене нужно использовать библиотеки для каждой сети
    
    if (network === 'TRC-20' || network === 'TRON') {
      // TRON адреса
      const privateKey = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
      const addressHash = crypto.createHash('ripemd160')
        .update(Buffer.from(hash, 'hex'))
        .digest('hex');
      const address = 'T' + addressHash.substring(0, 33);
      
      return {
        address: address,
        privateKey: privateKey
      };
    } else if (network === 'ERC-20' || network === 'OP' || network === 'BASE' || network === 'ARB') {
      // Ethereum-совместимые адреса (0x...)
      const privateKey = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
      const address = '0x' + hash.substring(0, 40);
      
      return {
        address: address,
        privateKey: privateKey
      };
    } else if (network === 'BTC') {
      // Bitcoin адреса (упрощенная версия)
      const privateKey = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
      const address = '1' + hash.substring(0, 33); // Упрощенная версия
      
      return {
        address: address,
        privateKey: privateKey
      };
    } else if (network === 'BEP-20') {
      // BSC адреса (как ERC-20)
      const privateKey = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
      const address = '0x' + hash.substring(0, 40);
      
      return {
        address: address,
        privateKey: privateKey
      };
    } else if (network === 'SOL') {
      // Solana адреса (base58)
      const privateKey = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
      const address = hash.substring(0, 44); // Solana адреса обычно 32-44 символа
      
      return {
        address: address,
        privateKey: privateKey
      };
    } else if (network === 'TON') {
      // TON адреса
      const privateKey = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
      const address = 'EQ' + hash.substring(0, 46); // TON адреса обычно начинаются с EQ
      
      return {
        address: address,
        privateKey: privateKey
      };
    } else {
      // По умолчанию генерируем простой адрес
      const privateKey = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
      const address = hash.substring(0, 42);
      
      return {
        address: address,
        privateKey: privateKey
      };
    }
  }

  /**
   * Зашифровать приватный ключ (базовая реализация)
   * В продакшене использовать более надежное шифрование
   */
  encryptPrivateKey(privateKey) {
    // TODO: Использовать AES шифрование с ключом из env
    const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Расшифровать приватный ключ
   */
  decryptPrivateKey(encryptedKey) {
    if (!encryptedKey) return null;
    try {
      const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';
      const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
      let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('WALLET', 'Failed to decrypt private key', { error: error.message });
      return null;
    }
  }

  /**
   * Получить все кошельки пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Array>} Список кошельков
   */
  async getUserWallets(userId) {
    try {
      const wallets = await prisma.userWallet.findMany({
        where: {
          userId: userId,
          isActive: true
        },
        include: {
          token: true
        },
        orderBy: [
          { token: { symbol: 'asc' } },
          { token: { network: 'asc' } }
        ]
      });

      return wallets;
    } catch (error) {
      logger.error('WALLET', 'Failed to get user wallets', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Получить кошелек пользователя для конкретной валюты
   * @param {number} userId - ID пользователя
   * @param {number} tokenId - ID токена
   * @returns {Promise<Object|null>} Кошелек или null
   */
  async getUserWallet(userId, tokenId) {
    try {
      const wallet = await prisma.userWallet.findUnique({
        where: {
          userId_tokenId: {
            userId: userId,
            tokenId: tokenId
          }
        },
        include: {
          token: true
        }
      });

      return wallet;
    } catch (error) {
      logger.error('WALLET', 'Failed to get user wallet', {
        userId,
        tokenId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Обновить время последнего использования кошелька
   * @param {number} walletId - ID кошелька
   */
  async updateLastUsed(walletId) {
    try {
      await prisma.userWallet.update({
        where: { id: walletId },
        data: { lastUsedAt: new Date() }
      });
    } catch (error) {
      logger.error('WALLET', 'Failed to update last used', {
        walletId,
        error: error.message
      });
    }
  }
}

module.exports = new WalletService();

