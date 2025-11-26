"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaMask = void 0;
const bignumber_js_1 = require("bignumber.js");
const tatum_connector_1 = require("../../../connector/tatum.connector");
const dto_1 = require("../../../dto");
const util_1 = require("../../../util");
const extensions_1 = require("../../extensions");
const rpc_1 = require("../../rpc");
class MetaMask extends extensions_1.TatumSdkWalletProvider {
    constructor(tatumSdkContainer) {
        super(tatumSdkContainer);
        this.supportedNetworks = dto_1.EVM_BASED_NETWORKS;
        this.config = this.tatumSdkContainer.getConfig();
        this.rpc = this.tatumSdkContainer.get(rpc_1.EvmRpc);
        this.connector = this.tatumSdkContainer.get(tatum_connector_1.TatumConnector);
        this.logger = this.tatumSdkContainer.getLogger();
    }
    /**
     * Connect to MetaMask wallet. this method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the address of the connected account. If not, it throws an error.
     * @returns address of the connected account.
     */
    async getWallet() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (typeof window.ethereum === 'undefined') {
            this.logger.error('MetaMask is not installed or its impossible to connect to it.');
            throw new Error('MetaMask is not installed or its impossible to connect to it.');
        }
        if (util_1.EnvUtils.isDevelopment()) {
            this.logger.info('You can get FREE testnet tokens to test your contracts on any number of chains: https://co.tatum.io/faucets');
        }
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            return accounts[0];
        }
        catch (error) {
            this.logger.error('User denied account access:', error);
            throw new Error(`User denied account access. Error is ${error}`);
        }
    }
    /**
     * Sign native transaction with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     * @param recipient recipient of the transaction
     * @param amount amount to be sent, in native currency (ETH, BSC)
     */
    async transferNative(recipient, amount) {
        const payload = {
            to: recipient,
            from: await this.getWallet(),
            value: `0x${new bignumber_js_1.BigNumber(amount)
                .multipliedBy(10 ** util_1.Constant.DECIMALS[this.config.network])
                .toString(16)}`,
        };
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/return-await
            return await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [payload],
            });
        }
        catch (e) {
            this.logger.error('User denied transaction signature:', e);
            throw new Error(`User denied transaction signature. Error is ${e}`);
        }
    }
    /**
     * Sign ERC-20 fungible token `transfer` transaction (https://ethereum.org/en/developers/docs/standards/tokens/erc-20/#methods) with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     * @param recipient recipient of the transaction
     * @param amount amount to be sent, in token currency
     * @param tokenAddress address of the token contract
     */
    async transferErc20(recipient, amount, tokenAddress) {
        const { result: decimals } = await this.rpc.getTokenDecimals(tokenAddress);
        const payload = {
            to: tokenAddress,
            from: await this.getWallet(),
            data: `0xa9059cbb${util_1.Utils.padWithZero(recipient)}${new bignumber_js_1.BigNumber(amount)
                .multipliedBy(10 ** decimals.toNumber())
                .toString(16)
                .padStart(64, '0')}`,
        };
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/return-await
            return await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [payload],
            });
        }
        catch (e) {
            this.logger.error('User denied transaction signature:', e);
            throw new Error(`User denied transaction signature. Error is ${e}`);
        }
    }
    /**
     * Deploy new ERC-721 NFT Collection contract with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     */
    async createNftCollection(body) {
        const { name, symbol, baseURI, author, minter } = body;
        const from = await this.getWallet();
        const { data } = await this.connector.post({
            path: `contract/deploy/prepare`,
            body: {
                contractType: 'nft',
                params: [name, symbol, baseURI || '', author || from, minter || from],
            },
        });
        const payload = {
            from: from,
            data,
        };
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/return-await
            return await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [payload],
            });
        }
        catch (e) {
            this.logger.error('User denied transaction signature:', e);
            throw new Error(`User denied transaction signature. Error is ${e}`);
        }
    }
    /**
     * Deploy new ERC-20 Token (USDT or USDC like) contract with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     */
    async createFungibleToken(body) {
        const from = await this.getWallet();
        const decimals = body.decimals || 18;
        const { data } = await this.connector.post({
            path: `contract/deploy/prepare`,
            body: {
                contractType: 'fungible',
                params: [
                    body.name,
                    body.symbol,
                    decimals,
                    `0x${new bignumber_js_1.BigNumber(body.initialSupply).multipliedBy(10 ** decimals).toString(16)}`,
                    body.initialHolder || from,
                    body.admin || from,
                    body.minter || from,
                    body.pauser || from,
                ],
            },
        });
        const payload = {
            from: from,
            data,
        };
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/return-await
            return await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [payload],
            });
        }
        catch (e) {
            this.logger.error('User denied transaction signature:', e);
            throw new Error(`User denied transaction signature. Error is ${e}`);
        }
    }
    /**
     * Deploy new ERC-1155 NFT Collection contract with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     */
    async createErc1155NftCollection(body) {
        const { author, minter, baseURI } = body || {};
        const from = await this.getWallet();
        const { data } = await this.connector.post({
            path: `contract/deploy/prepare`,
            body: {
                contractType: 'multitoken',
                params: [author || from, minter || from, baseURI || ''],
            },
        });
        const payload = {
            from: from,
            data,
        };
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/return-await
            return await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [payload],
            });
        }
        catch (e) {
            this.logger.error('User denied transaction signature:', e);
            throw new Error(`User denied transaction signature. Error is ${e}`);
        }
    }
    /**
     * Sign ERC-721 non-fungible token `safeTransferFrom` transaction (https://ethereum.org/en/developers/docs/standards/tokens/erc-721/#methods) with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     * @param recipient recipient of the transaction
     * @param tokenId ID of the NFT token
     * @param tokenAddress address of the token contract
     */
    async transferNft(recipient, tokenId, tokenAddress) {
        const from = await this.getWallet();
        const payload = {
            to: tokenAddress,
            from: from,
            data: `0x42842e0e${util_1.Utils.padWithZero(from)}${util_1.Utils.padWithZero(recipient)}${new bignumber_js_1.BigNumber(tokenId)
                .toString(16)
                .padStart(64, '0')}`,
        };
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/return-await
            return await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [payload],
            });
        }
        catch (e) {
            this.logger.error('User denied transaction signature:', e);
            throw new Error(`User denied transaction signature. Error is ${e}`);
        }
    }
    /**
     * Sign ERC-20 fungible token `approve` transaction (https://ethereum.org/en/developers/docs/standards/tokens/erc-20/#methods) with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     * @param spender address to be approved to spend the tokens
     * @param amount amount to be sent, in token currency
     * @param tokenAddress address of the token contract
     */
    async approveErc20(spender, amount, tokenAddress) {
        const { result: decimals } = await this.rpc.getTokenDecimals(tokenAddress);
        const payload = {
            to: tokenAddress,
            from: await this.getWallet(),
            data: `0x095ea7b3${util_1.Utils.padWithZero(spender)}${new bignumber_js_1.BigNumber(amount)
                .multipliedBy(10 ** decimals.toNumber())
                .toString(16)
                .padStart(64, '0')}`,
        };
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/return-await
            return await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [payload],
            });
        }
        catch (e) {
            this.logger.error('User denied transaction signature:', e);
            throw new Error(`User denied transaction signature. Error is ${e}`);
        }
    }
    /**
     * Sign custom transaction with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     * @param payload Transaction payload. From field is ignored and will be overwritten by the connected account.
     */
    async signAndBroadcast(payload) {
        payload.from = await this.getWallet();
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/return-await
            return await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [payload],
            });
        }
        catch (e) {
            this.logger.error('User denied transaction signature:', e);
            throw new Error(`User denied transaction signature. Error is ${e}`);
        }
    }
}
exports.MetaMask = MetaMask;
//# sourceMappingURL=metamask.wallet.provider.js.map