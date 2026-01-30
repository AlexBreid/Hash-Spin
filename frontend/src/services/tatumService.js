const axios = require('axios');
const TronWeb = require('tronweb');
const { utils } = require('tronweb');

class TatumService {
  constructor() {
    this.apiKey = process.env.TATUM_API_KEY || "t-6921b30ee14d385a6efc58cd-24c5831b9db142d6982ddd0b"; 
    this.tronNetwork = process.env.TATUM_TRON_NETWORK || 'tron-nile'; // Changed default to testnet
    this.isTestnet = process.env.TATUM_TESTNET !== 'false'; // Default to true

    this.gatewayUrl = process.env.TATUM_GATEWAY_URL || this.getGatewayUrl();

    
    
    
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

      

      const response = await axios.post(this.gatewayUrl, payload, {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data.error) {
        
        throw new Error(`JSON-RPC Error: ${response.data.error.message}`);
      }
      
      return response.data.result !== undefined ? response.data.result : response.data;
    } catch (error) {
      if (error.response) {
        
        
        throw new Error(`Request failed with status code ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.code === 'ECONNABORTED') {
        
        throw new Error('Connection timeout. Tatum service is not responding.');
      } else {
        
        throw error;
      }
    }
  }

  async createDepositAddress(userId) {
    try {
      

      // ✅ Generate account locally using TronWeb.utils
      const account = TronWeb.createAccount();

      if (!account || !account.address) {
        throw new Error('Failed to generate TRON account');
      }

      

      return {
        accountId: account.address.base58,
        address: account.address.base58,
        privateKey: account.privateKey, // ⚠️ Store securely in production!
        currency: 'TRON',
        network: this.tronNetwork,
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT TRC20
      };
    } catch (error) {
      
      throw new Error(`Не удалось создать TRON адрес: ${error.message}`);
    }
  }

  async getAddressBalance(address) {
    try {
      

      // Try to get balance from Tatum
      const balance = await this.jsonRpcCall('eth_getBalance', [address, 'latest']);

      const balanceInTron = parseInt(balance, 16) / 1e18;

      

      return {
        balance: balanceInTron.toString(),
        unconfirmedBalance: '0',
        address: address,
      };
    } catch (error) {
      
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
      

      const receipt = await this.jsonRpcCall('eth_getTransactionReceipt', [txHash]);

      if (!receipt) {
        return {
          hash: txHash,
          status: 'PENDING',
          confirmations: 0,
        };
      }

      const status = receipt.status === '0x1' ? 'SUCCESS' : 'FAILED';

      

      return {
        hash: txHash,
        status: status,
        confirmations: receipt.blockNumber ? 1 : 0,
        from: receipt.from,
        to: receipt.to,
      };
    } catch (error) {
      
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
      
      const blockNumber = await this.jsonRpcCall('eth_blockNumber', []);
      const blockNum = parseInt(blockNumber, 16);
      
      return blockNum;
    } catch (error) {
      
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
      
      const blockNumber = await this.getBlockNumber();
      
      return true;
    } catch (error) {
      
      return false;
    }
  }
}

module.exports = new TatumService();
