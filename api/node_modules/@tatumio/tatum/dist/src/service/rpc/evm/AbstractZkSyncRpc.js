"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractZkSyncRpc = void 0;
const typedi_1 = require("typedi");
const AbstractEvmRpc_1 = require("./AbstractEvmRpc");
const EvmUtils_1 = require("./EvmUtils");
let AbstractZkSyncRpc = class AbstractZkSyncRpc extends AbstractEvmRpc_1.AbstractEvmRpc {
    async zksEstimateFee(payload) {
        return this.rpcCall('zks_estimateFee', [payload]);
    }
    async zksEstimateGasL1ToL2(payload) {
        const response = await this.rpcCall('zks_estimateGasL1ToL2', [payload]);
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async zksGetBridgeHubContract() {
        const response = await this.rpcCall('zks_getBridgeHubContract');
        return EvmUtils_1.EvmUtils.toDecodedString(response);
    }
    async zksGetMinContract() {
        const response = await this.rpcCall('zks_getMinContract');
        return EvmUtils_1.EvmUtils.toDecodedString(response);
    }
    async zksGetBridgeContracts() {
        return this.rpcCall('zks_getBridgeContracts');
    }
    async zksL1ChainId() {
        const response = await this.rpcCall('zks_l1ChainId');
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async zksGetBaseTokenL1Address() {
        const response = await this.rpcCall('zks_getBaseTokenL1Address');
        return EvmUtils_1.EvmUtils.toDecodedString(response);
    }
    async zksGetConfirmedTokens() {
        return this.rpcCall('zks_getConfirmedTokens');
    }
    async zksGetAllAccountBalances(address) {
        return this.rpcCall('zks_getAllAccountBalances', [address]);
    }
    async zksGetL2ToL1MsgProof(params) {
        return this.rpcCall('zks_getL2ToL1MsgProof', [params]);
    }
    async zksGetL2ToL1LogProof(txHash, logIndex) {
        return this.rpcCall('zks_getL2ToL1LogProof', [txHash, logIndex]);
    }
    async zksL1BatchNumber() {
        const response = await this.rpcCall('zks_l1BatchNumber');
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async zksGetBlockDetails(blockNumber) {
        return this.rpcCall('zks_getBlockDetails', [blockNumber]);
    }
    async zksGetTransactionDetails(txHash) {
        return this.rpcCall('zks_getTransactionDetails', [txHash]);
    }
    async zksGetRawBlockTransactions(blockNumber) {
        return this.rpcCall('zks_getRawBlockTransactions', [blockNumber]);
    }
    async zksGetL1BatchDetails(batchNumber) {
        return this.rpcCall('zks_getL1BatchDetails', [batchNumber]);
    }
    async zksGetBytecodeByHash(txHash) {
        return this.rpcCall('zks_getBytecodeByHash', [txHash]);
    }
    async zksGetL1BatchBlockRange(batchNumber) {
        return this.rpcCall('zks_getL1BatchBlockRange', [batchNumber]);
    }
    async zksGetL1GasPrice() {
        const response = await this.rpcCall('zks_getL1GasPrice');
        return EvmUtils_1.EvmUtils.toBigNumber(response);
    }
    async zksGetFeeParams() {
        return this.rpcCall('zks_getFeeParams');
    }
    async zksGetProtocolVersion(versionId) {
        return this.rpcCall('zks_getProtocolVersion', versionId ? [versionId] : []);
    }
    async zksGetProof(params) {
        return this.rpcCall('zks_getProof', [params]);
    }
    async zksSendRawTransactionWithDetailedOutput(data) {
        return this.rpcCall('zks_sendRawTransactionWithDetailedOutput', [data]);
    }
};
exports.AbstractZkSyncRpc = AbstractZkSyncRpc;
exports.AbstractZkSyncRpc = AbstractZkSyncRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractZkSyncRpc);
//# sourceMappingURL=AbstractZkSyncRpc.js.map