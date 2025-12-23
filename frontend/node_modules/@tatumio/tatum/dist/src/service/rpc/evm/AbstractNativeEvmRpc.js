"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractNativeEvmRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const bignumber_js_1 = require("bignumber.js");
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
const AbstractEvmRpc_1 = require("./AbstractEvmRpc");
const EvmUtils_1 = require("./EvmUtils");
let AbstractNativeEvmRpc = class AbstractNativeEvmRpc extends AbstractEvmRpc_1.AbstractEvmRpc {
    nativeRpcCall({ method, params, nativePrefix, }) {
        return this.rpcCall(`${nativePrefix ? this.getNativePrefix() : util_1.Constant.RPC.METHOD_PREFIX}${method}`, params);
    }
    async blockNumber(nativePrefix) {
        const response = await this.nativeRpcCall({ method: 'blockNumber', nativePrefix });
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async chainId(nativePrefix) {
        const response = await this.nativeRpcCall({ method: 'chainId', nativePrefix });
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async estimateGas(callObject, nativePrefix) {
        const response = await this.nativeRpcCall({
            method: 'estimateGas',
            params: [callObject],
            nativePrefix,
        });
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async gasPrice(nativePrefix) {
        const response = await this.nativeRpcCall({ method: 'gasPrice', nativePrefix });
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async maxPriorityFeePerGas(nativePrefix) {
        const response = await this.nativeRpcCall({
            method: 'maxPriorityFeePerGas',
            nativePrefix,
        });
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async getBalance(address, blockNumber = 'latest', nativePrefix) {
        const response = await this.nativeRpcCall({
            method: 'getBalance',
            params: [
                address,
                typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
            ],
            nativePrefix,
        });
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async getBlockByHash(blockHash, includeTransactions = false, nativePrefix) {
        return this.nativeRpcCall({
            method: 'getBlockByHash',
            params: [blockHash, includeTransactions],
            nativePrefix,
        });
    }
    async getBlockTransactionCountByHash(blockHash, nativePrefix) {
        return this.nativeRpcCall({
            method: 'getBlockTransactionCountByHash',
            params: [blockHash],
            nativePrefix,
        });
    }
    async getBlockByNumber(blockNumber, full = true, nativePrefix) {
        return this.nativeRpcCall({
            method: 'getBlockByNumber',
            params: [
                typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
                full,
            ],
            nativePrefix,
        });
    }
    async getBlockTransactionCountByNumber(blockNumber, nativePrefix) {
        return this.nativeRpcCall({
            method: 'getBlockTransactionCountByNumber',
            params: [
                typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
            ],
            nativePrefix,
        });
    }
    async getCode(address, blockNumber = 'latest', nativePrefix) {
        if (!blockNumber) {
            blockNumber = 'latest';
        }
        return this.nativeRpcCall({
            method: 'getCode',
            params: [
                address,
                typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
            ],
            nativePrefix,
        });
    }
    async getLogs(filter, nativePrefix) {
        return this.nativeRpcCall({ method: 'getLogs', params: [filter], nativePrefix });
    }
    async getStorageAt(address, position, blockNumber = 'latest', nativePrefix) {
        if (!blockNumber) {
            blockNumber = 'latest';
        }
        return this.nativeRpcCall({
            method: 'getStorageAt',
            params: [
                address,
                position,
                typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
            ],
            nativePrefix,
        });
    }
    async getTransactionByBlockHashAndIndex(blockHash, index, nativePrefix) {
        return this.nativeRpcCall({
            method: 'getTransactionByBlockHashAndIndex',
            params: [blockHash, `0x${new bignumber_js_1.BigNumber(index).toString(16)}`],
            nativePrefix,
        });
    }
    async getTransactionByBlockNumberAndIndex(blockNumber, index, nativePrefix) {
        return this.nativeRpcCall({
            method: 'getTransactionByBlockNumberAndIndex',
            params: [`0x${new bignumber_js_1.BigNumber(blockNumber).toString(16)}`, `0x${new bignumber_js_1.BigNumber(index).toString(16)}`],
            nativePrefix,
        });
    }
    async getTransactionByHash(txHash, nativePrefix) {
        return this.nativeRpcCall({
            method: 'getTransactionByHash',
            params: [txHash],
            nativePrefix,
        });
    }
    async getTransactionCount(address, blockNumber = 'latest', nativePrefix) {
        const response = await this.nativeRpcCall({
            method: 'getTransactionCount',
            params: [
                address,
                typeof blockNumber === 'number' ? '0x' + new bignumber_js_1.BigNumber(blockNumber).toString(16) : blockNumber,
            ],
            nativePrefix,
        });
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async getTransactionReceipt(transactionHash, nativePrefix) {
        return this.nativeRpcCall({
            method: 'getTransactionReceipt',
            params: [transactionHash],
            nativePrefix,
        });
    }
    async sendRawTransaction(signedTransactionData, nativePrefix) {
        return this.nativeRpcCall({
            method: 'sendRawTransaction',
            params: [signedTransactionData],
            nativePrefix,
        });
    }
};
exports.AbstractNativeEvmRpc = AbstractNativeEvmRpc;
exports.AbstractNativeEvmRpc = AbstractNativeEvmRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractNativeEvmRpc);
//# sourceMappingURL=AbstractNativeEvmRpc.js.map