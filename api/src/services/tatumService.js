const axios = require('axios');
const TronWeb = require('tronweb');
const crypto = require('crypto'); // Необходим для randomBytes, хотя TronWeb.createAccount() лучше

class TatumService {
  constructor() {
    // Используем хардкод для примера, но в идеале только process.env
    this.apiKey = process.env.TATUM_API_KEY || "t-6921b30ee14d385a6efc58cd-24c5831b9db142d6982ddd0b"; 
    this.tronNetwork = process.env.TATUM_TRON_NETWORK || 'tron-mainnet';
    this.isTestnet = process.env.TATUM_TESTNET === 'true';

    // JSON-RPC Gateway URL из .env или генерируем автоматически
    this.gatewayUrl = process.env.TATUM_GATEWAY_URL || this.getGatewayUrl();

    console.log(`🔗 Используется TRON сеть: ${this.tronNetwork}`);
    console.log(`📍 Gateway URL: ${this.gatewayUrl}`);
    console.log(`🔑 API Key: ${this.apiKey ? this.apiKey.substring(0, 20) + '...' : 'НЕ УСТАНОВЛЕН'}`);
  }

  /**
   * 🔗 Получить правильный Gateway URL для TRON сети
   * Используются прямые RPC-эндпоинты Tatum, которые принимают API ключ.
   */
  getGatewayUrl() {
    const networkUrls = {
      // Для прямого RPC-вызова часто требуется путь /jsonrpc или /
      'tron-mainnet': 'https://tron-mainnet.gateway.tatum.io/jsonrpc',
      'tron-nile': 'https://tron-nile.gateway.tatum.io/jsonrpc',
      'tron-shasta': 'https://tron-shasta.gateway.tatum.io/jsonrpc',
    };

    const baseUrl = networkUrls[this.tronNetwork] || networkUrls['tron-nile'];
    return baseUrl;
  }

  /**
   * 📡 Выполнить JSON-RPC запрос к TRON
   */
  async jsonRpcCall(method, params = []) {
    try {
      const payload = {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Math.floor(Math.random() * 1000000),
      };

      console.log(`📡 JSON-RPC запрос: ${method}`);

      const response = await axios.post(this.gatewayUrl, payload, {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
      });

      if (response.data.error) {
        throw new Error(`JSON-RPC Error: ${response.data.error.message}`);
      }
      
      // Если Tron RPC, то результат может быть в response.data, а не response.data.result
      return response.data.result !== undefined ? response.data.result : response.data;
    } catch (error) {
      // Axios error handling
      if (error.response) {
        console.error(`❌ JSON-RPC ошибка: Request failed with status code ${error.response.status}`);
        throw new Error(`Request failed with status code ${error.response.status}`);
      } else {
        console.error('❌ JSON-RPC ошибка:', error.message);
        throw error;
      }
    }
  }

  // --- МЕТОД: ЛОКАЛЬНАЯ ГЕНЕРАЦИЯ АДРЕСА ---
  /**
   * 🔑 Создать новый адрес кошелька для пополнения (TRON)
   * ❗ ВАЖНО: Ключи генерируются ЛОКАЛЬНО с помощью TronWeb, не через RPC-вызов.
   */
  async createDepositAddress(userId) {
    try {
      console.log(`📍 Создаю TRON адрес пополнения для пользователя ${userId}...`);

      // Локальная генерация ключей с помощью TronWeb
      const account = await TronWeb.createAccount();

      console.log(`✅ TRON адрес создан`);
      // 

      return {
        // TronWeb возвращает address.base58 (адрес) и privateKey
        accountId: account.address.base58,
        address: account.address.base58,
        privateKey: account.privateKey, // ⚠️ ТОЛЬКО ДЛЯ РАЗРАБОТКИ/БЕКАПА! 
        currency: 'TRON',
        network: this.tronNetwork,
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT контракт на TRON
      };
    } catch (error) {
      console.error('❌ Ошибка создания TRON адреса:', error.message);
      throw new Error(
        `Не удалось создать TRON адрес: ${error.message}`
      );
    }
  }
  // ------------------------------------------

  /**
   * 💰 Получить баланс TRON (нативный TRX) адреса
   */
  async getAddressBalance(address) {
    try {
      console.log(`🔍 Проверяю баланс адреса: ${address}`);

      // Используем eth_getBalance для получения баланса TRX
      const balance = await this.jsonRpcCall('eth_getBalance', [address, 'latest']);

      // Конвертируем из Wei в TRX (1 TRX = 10^18 Wei)
      const balanceInTron = parseInt(balance, 16) / 1e18;

      console.log(`✅ Баланс: ${balanceInTron} TRX`);

      return {
        balance: balanceInTron.toString(),
        unconfirmedBalance: '0',
        address: address,
      };
    } catch (error) {
      console.error('❌ Ошибка получения баланса TRON:', error.message);
      throw error;
    }
  }

  /**
   * 📊 Получить статус TRON транзакции
   */
  async getTransactionStatus(txHash) {
    try {
      console.log(`📊 Проверяю статус транзакции TRON: ${txHash}`);

      // Используем eth_getTransactionReceipt для получения квитанции транзакции
      const receipt = await this.jsonRpcCall('eth_getTransactionReceipt', [txHash]);

      if (!receipt) {
        return {
          hash: txHash,
          status: 'PENDING',
          confirmations: 0,
        };
      }

      const status = receipt.status === '0x1' ? 'SUCCESS' : 'FAILED';

      console.log(`✅ Статус транзакции: ${status}`);

      return {
        hash: txHash,
        status: status,
        confirmations: receipt.blockNumber ? 1 : 0,
        from: receipt.from,
        to: receipt.to,
        // Внимание: receipt.value часто отсутствует для TRC-20 транзакций
      };
    } catch (error) {
      console.error('❌ Ошибка получения статуса TRON:', error.message);
      throw error;
    }
  }

  /**
   * 🔗 Получить информацию о блоке
   */
  async getBlockNumber() {
    try {
      const blockNumber = await this.jsonRpcCall('eth_blockNumber', []);
      return parseInt(blockNumber, 16);
    } catch (error) {
      console.error('❌ Ошибка получения номера блока:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 Получить информацию о сети TRON
   */
  getNetworkInfo() {
    const blockExplorers = {
      'tron-mainnet': 'https://tronscan.org',
      'tron-nile': 'https://nile.tronscan.org',
      'tron-shasta': 'https://shasta.tronscan.org',
    };

    const faucets = {
      'tron-mainnet': 'https://tronfaucet.com',
      'tron-nile': 'https://nile.trontrade.org',
      'tron-shasta': 'https://shasta.trontrade.org',
    };

    return {
      network: 'TRON',
      tronNetwork: this.tronNetwork,
      currency: 'USDT (TRC20)',
      isTestnet: this.isTestnet,
      gatewayUrl: this.gatewayUrl,
      testnetFaucet: faucets[this.tronNetwork] || faucets['tron-nile'],
      blockExplorer: blockExplorers[this.tronNetwork] || blockExplorers['tron-nile'],
      usdtContract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT контракт
      decimals: 6,
    };
  }

  /**
   * 🧪 Тестовая функция для проверки подключения
   */
  async testConnection() {
    try {
      console.log('🧪 Тестирую подключение к TRON...');
      const blockNumber = await this.getBlockNumber();
      console.log(`✅ Подключение успешно! Текущий блок: ${blockNumber}`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка подключения:', error.message);
      return false;
    }
  }
}

// Экспортируем как синглтон
module.exports = new TatumService();