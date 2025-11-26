"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractEvmRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const bignumber_js_1 = require("bignumber.js");
const typedi_1 = require("typedi");
const decode_1 = require("../../../util/decode");
const EvmUtils_1 = require("./EvmUtils");
let AbstractEvmRpc = class AbstractEvmRpc {
    async blockNumber() {
        const response = await this.rpcCall('eth_blockNumber');
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async call(callObject, blockNumber = 'latest') {
        return this.rpcCall('eth_call', [
            callObject,
            typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
        ]);
    }
    async chainId() {
        const response = await this.rpcCall('eth_chainId');
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async clientVersion() {
        return this.rpcCall('web3_clientVersion');
    }
    async debugGetBadBlocks() {
        return this.rpcCall('debug_getBadBlocks');
    }
    async debugStorageRangeAt(blockHash, txIndex, contractAddress, startKey, maxResult) {
        return this.rpcCall('debug_storageRangeAt', [
            blockHash,
            txIndex,
            contractAddress,
            startKey,
            maxResult,
        ]);
    }
    async debugTraceBlock(rplBlock, traceOptions) {
        const params = [rplBlock];
        if (traceOptions) {
            params.push(traceOptions);
        }
        return this.rpcCall('debug_traceBlock', params);
    }
    async debugTraceBlockByHash(blockHash, traceOptions) {
        const params = [blockHash];
        if (traceOptions) {
            params.push(traceOptions);
        }
        return this.rpcCall('debug_traceBlockByHash', params);
    }
    async debugTraceBlockByNumber(blockHash, traceOptions) {
        const params = [`0x${new bignumber_js_1.BigNumber(blockHash).toString(16)}`];
        if (traceOptions) {
            params.push(traceOptions);
        }
        return this.rpcCall('debug_traceBlockByNumber', params);
    }
    async debugTraceCall(callObject, blockNumber, traceOptions) {
        const params = [callObject, blockNumber];
        if (traceOptions) {
            params.push(traceOptions);
        }
        return this.rpcCall('debug_traceCall', params);
    }
    async debugTraceTransaction(txHash, traceOptions) {
        const params = [txHash];
        if (traceOptions) {
            params.push(traceOptions);
        }
        return this.rpcCall('debug_traceTransaction', params);
    }
    async estimateGas(callObject) {
        const response = await this.rpcCall('eth_estimateGas', [callObject]);
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async gasPrice() {
        const response = await this.rpcCall('eth_gasPrice');
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async maxPriorityFeePerGas() {
        const response = await this.rpcCall('eth_maxPriorityFeePerGas');
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async getBalance(address, blockNumber = 'latest') {
        const response = await this.rpcCall('eth_getBalance', [
            address,
            typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
        ]);
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async getTokenDecimals(tokenAddress) {
        const response = await this.rpcCall('eth_call', [
            { to: tokenAddress, data: '0x313ce567' },
            'latest',
        ]);
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async getTokenSymbol(tokenAddress) {
        const response = await this.rpcCall('eth_call', [
            { to: tokenAddress, data: '0x95d89b41' },
            'latest',
        ]);
        return EvmUtils_1.EvmUtils.toDecodedString(response);
    }
    async getTokenName(tokenAddress) {
        const response = await this.rpcCall('eth_call', [
            { to: tokenAddress, data: '0x06fdde03' },
            'latest',
        ]);
        return EvmUtils_1.EvmUtils.toDecodedString(response);
    }
    async getTokenCap(tokenAddress) {
        const response = await this.rpcCall('eth_call', [
            { to: tokenAddress, data: '0x355274ea' },
            'latest',
        ]);
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async getTokenTotalSupply(tokenAddress) {
        const response = await this.rpcCall('eth_call', [
            { to: tokenAddress, data: '0x18160ddd' },
            'latest',
        ]);
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async supportsInterfaceERC1155(tokenAddress) {
        const response = await this.rpcCall('eth_call', [
            {
                to: tokenAddress,
                //kecakk256 of supportsInterface(bytes4) + ERC1155 interface id + padding to 64 bytes
                data: '0x01ffc9a7d9b67a2600000000000000000000000000000000000000000000000000000000',
            },
            'latest',
        ]);
        if (response.result) {
            response.result = (0, decode_1.decodeUInt256)(response.result) === 1;
        }
        return response;
    }
    async getContractAddress(txHash) {
        try {
            const txReceipt = await this.getTransactionReceipt(txHash);
            return txReceipt.result.contractAddress;
        }
        catch (e) {
            this.logger.error('Failed to get contract address, transaction does not exist, or is not a contract creation tx or is not mined yet.');
            return null;
        }
    }
    async getBlockByHash(blockHash, includeTransactions = false) {
        return this.rpcCall('eth_getBlockByHash', [blockHash, includeTransactions]);
    }
    async getBlockTransactionCountByHash(blockHash) {
        return this.rpcCall('eth_getBlockTransactionCountByHash', [blockHash]);
    }
    async getBlockByNumber(blockNumber, full = true) {
        return this.rpcCall('eth_getBlockByNumber', [
            typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
            full,
        ]);
    }
    async getBlockTransactionCountByNumber(blockNumber) {
        return this.rpcCall('eth_getBlockTransactionCountByNumber', [
            typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
        ]);
    }
    async getCode(address, blockNumber = 'latest') {
        if (!blockNumber) {
            blockNumber = 'latest';
        }
        return this.rpcCall('eth_getCode', [
            address,
            typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
        ]);
    }
    async getLogs(filter) {
        return this.rpcCall('eth_getLogs', [filter]);
    }
    async getProof(address, storageKeys, blockNumber = 'latest') {
        return this.rpcCall('eth_getProof', [
            address,
            storageKeys,
            typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
        ]);
    }
    async getStorageAt(address, position, blockNumber = 'latest') {
        if (!blockNumber) {
            blockNumber = 'latest';
        }
        return this.rpcCall('eth_getStorageAt', [
            address,
            position,
            typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
        ]);
    }
    async getTransactionByBlockHashAndIndex(blockHash, index) {
        return this.rpcCall('eth_getTransactionByBlockHashAndIndex', [
            blockHash,
            `0x${new bignumber_js_1.BigNumber(index).toString(16)}`,
        ]);
    }
    async getTransactionByBlockNumberAndIndex(blockNumber, index) {
        return this.rpcCall('eth_getTransactionByBlockNumberAndIndex', [
            `0x${new bignumber_js_1.BigNumber(blockNumber).toString(16)}`,
            `0x${new bignumber_js_1.BigNumber(index).toString(16)}`,
        ]);
    }
    async getTransactionByHash(txHash) {
        return this.rpcCall('eth_getTransactionByHash', [txHash]);
    }
    async getTransactionCount(address, blockNumber = 'latest') {
        const response = await this.rpcCall('eth_getTransactionCount', [
            address,
            typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
        ]);
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async getTransactionReceipt(transactionHash) {
        return this.rpcCall('eth_getTransactionReceipt', [transactionHash]);
    }
    async getBlockReceipts(blockNumber) {
        return this.rpcCall('eth_getBlockReceipts', [
            `0x${new bignumber_js_1.BigNumber(blockNumber).toString(16)}`,
        ]);
    }
    async getUncleByBlockHashAndIndex(blockHash, index) {
        return this.rpcCall('eth_getUncleByBlockHashAndIndex', [
            blockHash,
            `0x${new bignumber_js_1.BigNumber(index).toString(16)}`,
        ]);
    }
    async getUncleByBlockNumberAndIndex(blockNumber, index) {
        return this.rpcCall('eth_getUncleByBlockNumberAndIndex', [
            `0x${new bignumber_js_1.BigNumber(blockNumber).toString(16)}`,
            `0x${new bignumber_js_1.BigNumber(index).toString(16)}`,
        ]);
    }
    async getUncleCountByBlockHash(blockHash) {
        return this.rpcCall('eth_getUncleCountByBlockHash', [blockHash]);
    }
    async getUncleCountByBlockNumber(blockNumber) {
        return this.rpcCall('eth_getUncleCountByBlockNumber', [
            `0x${new bignumber_js_1.BigNumber(blockNumber).toString(16)}`,
        ]);
    }
    async protocolVersion() {
        return this.rpcCall('eth_protocolVersion');
    }
    async sendRawTransaction(signedTransactionData) {
        return this.rpcCall('eth_sendRawTransaction', [signedTransactionData]);
    }
    async sha3(data) {
        return this.rpcCall('web3_sha', [data]);
    }
    async syncing() {
        return this.rpcCall('eth_syncing');
    }
    async traceBlock(blockNumber, traceOptions) {
        return this.rpcCall('trace_block', [
            typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
            traceOptions,
        ]);
    }
    async traceCall(callObject, traceTypes, blockNumber = 'latest') {
        return this.rpcCall('trace_call', [
            callObject,
            traceTypes,
            {
                blockNumber: typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
            },
        ]);
    }
    async traceCallMany(callObject, traceType, blockNumber) {
        const params = callObject.map((call, index) => {
            return [call, traceType[index]];
        });
        return this.rpcCall('trace_callMany', [
            params,
            typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
        ]);
    }
    async traceRawTransaction(signedTransactionData, traceOptions) {
        return this.rpcCall('trace_rawTransaction', [signedTransactionData, traceOptions]);
    }
    async traceReplayBlockTransactions(blockNumber, traceOptions) {
        return this.rpcCall('trace_replayBlockTransactions', [blockNumber, traceOptions]);
    }
    async traceReplayTransaction(txHash, traceOptions) {
        return this.rpcCall('trace_replayTransaction', [txHash, traceOptions]);
    }
    async traceTransaction(txHash) {
        return this.rpcCall('trace_transaction', [txHash]);
    }
    async txPoolContent() {
        return this.rpcCall('txpool_content');
    }
    async txPoolInspect() {
        return this.rpcCall('txpool_inspect');
    }
    async txPoolStatus() {
        return this.rpcCall('txpool_status');
    }
};
exports.AbstractEvmRpc = AbstractEvmRpc;
exports.AbstractEvmRpc = AbstractEvmRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractEvmRpc);
//# sourceMappingURL=AbstractEvmRpc.js.map