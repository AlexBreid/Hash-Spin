const axios = require('axios');
const crypto = require('crypto');

class TatumService {
  constructor() {
    this.apiKey = process.env.TATUM_API_KEY || "t-6921b30ee14d385a6efc58cd-24c5831b9db142d6982ddd0b"; 
    this.tronNetwork = process.env.TATUM_TRON_NETWORK || 'tron-nile'; // Changed default to testnet
    this.isTestnet = process.env.TATUM_TESTNET !== 'false'; // Default to true

    this.gatewayUrl = process.env.TATUM_GATEWAY_URL || this.getGatewayUrl();

    console.log(`🔗 Используется TRON сеть: ${this.tronNetwork}`);
    console.log(`📍 Gateway URL: ${this.gatewayUrl}`);
    console.log(`🔑 API Key: ${this.apiKey ? this.apiKey.substring(0, 20) + '...' : 'НЕ УСТАНОВЛЕН'}`);
  }

  getGatewayUrl() {
    const networkUrls = {
      'tron-mainnet': 'https://tron-mainnet.gateway.tatum.io/jsonrpc',
      'tron-nile': 'https://tron-nile.gateway.tatum.io/jsonrpc',
      'tron-shasta': 'https://tron-shasta.gateway.tatum.io/jsonrpc',
    };

    const baseUrl = networkUrls[this.tronNetwork] || networkUrls['tron-nile'];
    return baseUrl;
  }

  async jsonRpcCall(method, params = []) {
    try {
      const payload = {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Math.floor(Math.random() * 1000000),
      };

      console.log(`📡 JSON-RPC запрос: ${method} к ${this.gatewayUrl}`);

      const response = await axios.post(this.gatewayUrl, payload, {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data.error) {
        console.error(`❌ JSON-RPC Error: ${JSON.stringify(response.data.error)}`);
        throw new Error(`JSON-RPC Error: ${response.data.error.message}`);
      }
      
      return response.data.result !== undefined ? response.data.result : response.data;
    } catch (error) {
      if (error.response) {
        console.error(`❌ JSON-RPC ошибка: Status ${error.response.status}`);
        console.error('Response:', error.response.data);
        throw new Error(`Request failed with status code ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.code === 'ECONNABORTED') {
        console.error('❌ Timeout: Connection to Tatum gateway timed out');
        throw new Error('Connection timeout. Tatum service is not responding.');
      } else {
        console.error('❌ JSON-RPC ошибка:', error.message);
        throw error;
      }
    }
  }

  async createDepositAddress(userId) {
    try {
      console.log(`📍 Создаю TRON адрес пополнения для пользователя ${userId}...`);

      // ✅ Генерируем случайный приватный ключ (32 байта)
      const privateKey = crypto.randomBytes(32).toString('hex');
      
      // Для демонстрации создаем адрес на основе хеша приватного ключа
      // В реальном приложении используйте полноценную библиотеку для этого
      const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
      
      // TRON адреса начинаются с 'T'
      // Генерируем адрес на основе хеша
      const addressHash = crypto.createHash('ripemd160')
        .update(Buffer.from(hash, 'hex'))
        .digest('hex');
      
      // Берем первые 34 символа и добавляем префикс TRON адреса
      const base58Address = 'T' + addressHash.substring(0, 33);

      console.log(`✅ TRON адрес создан: ${base58Address}`);

      return {
        accountId: base58Address,
        address: base58Address,
        privateKey: privateKey, // ⚠️ ТОЛЬКО для разработки!
        currency: 'TRON',
        network: this.tronNetwork,
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT контракт
      };
    } catch (error) {
      console.error('❌ Ошибка создания TRON адреса:', error.message);
      throw new Error(`Не удалось создать TRON адрес: ${error.message}`);
    }
  }

  async getAddressBalance(address) {
    try {
      console.log(`🔍 Проверяю баланс адреса: ${address}`);

      // Try to get balance from Tatum
      const balance = await this.jsonRpcCall('eth_getBalance', [address, 'latest']);

      const balanceInTron = parseInt(balance, 16) / 1e18;

      console.log(`✅ Баланс: ${balanceInTron} TRX`);

      return {
        balance: balanceInTron.toString(),
        unconfirmedBalance: '0',
        address: address,
      };
    } catch (error) {
      console.error('❌ Ошибка получения баланса TRON:', error.message);
      // Don't throw - return zero balance instead
      return {
        balance: '0',
        unconfirmedBalance: '0',
        address: address,
      };
    }
  }

  async getTransactionStatus(txHash) {
    try {
      console.log(`📊 Проверяю статус транзакции TRON: ${txHash}`);

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
      };
    } catch (error) {
      console.error('❌ Ошибка получения статуса TRON:', error.message);
      // Return pending if we can't check
      return {
        hash: txHash,
        status: 'PENDING',
        confirmations: 0,
      };
    }
  }

  async getBlockNumber() {
    try {
      console.log('🔗 Проверяю текущий блок...');
      const blockNumber = await this.jsonRpcCall('eth_blockNumber', []);
      const blockNum = parseInt(blockNumber, 16);
      console.log(`✅ Текущий блок: ${blockNum}`);
      return blockNum;
    } catch (error) {
      console.error('❌ Ошибка получения номера блока:', error.message);
      throw error;
    }
  }

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
      usdtContract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      decimals: 6,
    };
  }

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

module.exports = new TatumService();