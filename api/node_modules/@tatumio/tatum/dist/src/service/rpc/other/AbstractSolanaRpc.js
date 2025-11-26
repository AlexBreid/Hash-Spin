"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractSolanaRpc = void 0;
const typedi_1 = require("typedi");
let AbstractSolanaRpc = class AbstractSolanaRpc {
    getAccountInfo(pubkey, options) {
        return this.rpcCall('getAccountInfo', [
            pubkey,
            options,
        ]);
    }
    getBalance(address) {
        return this.rpcCall('getBalance', [address]);
    }
    getBlockHeight(options) {
        return this.rpcCall('getBlockHeight', [options]);
    }
    getBlock(block, options) {
        return this.rpcCall('getBlock', [block, options]);
    }
    getBlockProduction(options) {
        return this.rpcCall('getBlockProduction', [
            options,
        ]);
    }
    getBlockCommitment(block) {
        return this.rpcCall('getBlockCommitment', [block]);
    }
    getBlocks(startSlot, endSlot, options) {
        const params = [startSlot];
        if (endSlot) {
            params.push(endSlot);
        }
        if (options && options.commitment) {
            params.push(options);
        }
        return this.rpcCall('getBlocks', params);
    }
    getBlocksWithLimit(startSlot, limit, options) {
        const params = [startSlot];
        if (limit) {
            params.push(limit);
        }
        if (options && options.commitment) {
            params.push(options);
        }
        return this.rpcCall('getBlocksWithLimit', params);
    }
    getBlockTime(block) {
        return this.rpcCall('getBlockTime', [block]);
    }
    getClusterNodes() {
        return this.rpcCall('getClusterNodes');
    }
    getEpochInfo(options) {
        return this.rpcCall('getEpochInfo', [options]);
    }
    getEpochSchedule() {
        return this.rpcCall('getEpochSchedule');
    }
    getFeeForMessage(message, options) {
        return this.rpcCall('getFeeForMessage', [
            message,
            options,
        ]);
    }
    getFirstAvailableBlock() {
        return this.rpcCall('getFirstAvailableBlock');
    }
    getGenesisHash() {
        return this.rpcCall('getGenesisHash');
    }
    getHealth() {
        return this.rpcCall('getHealth');
    }
    getHighestSnapshotSlot() {
        return this.rpcCall('getHighestSnapshotSlot');
    }
    getIdentity() {
        return this.rpcCall('getIdentity');
    }
    getInflationGovernor(options) {
        return this.rpcCall('getInflationGovernor', [options]);
    }
    getInflationRate() {
        return this.rpcCall('getInflationRate');
    }
    getInflationReward(addresses, options) {
        const params = [];
        if (addresses) {
            params.push(addresses);
        }
        if (options) {
            params.push(options);
        }
        return this.rpcCall('getInflationReward', params);
    }
    getLargestAccounts(options) {
        return this.rpcCall('getLargestAccounts', [options]);
    }
    getLatestBlockhash(options) {
        return this.rpcCall('getLatestBlockhash', [
            options,
        ]);
    }
    getLeaderSchedule(slot, options) {
        const params = [];
        if (slot) {
            params.push(slot);
        }
        if (options) {
            params.push(options);
        }
        return this.rpcCall('getLeaderSchedule', params);
    }
    getMaxRetransmitSlot() {
        return this.rpcCall('getMaxRetransmitSlot');
    }
    getMaxShredInsertSlot() {
        return this.rpcCall('getMaxShredInsertSlot');
    }
    getMinimumBalanceForRentExemption(dataSize, options) {
        return this.rpcCall('getMinimumBalanceForRentExemption', [dataSize, options]);
    }
    getMultipleAccounts(pubKeys, options) {
        return this.rpcCall('getMultipleAccounts', [pubKeys, options]);
    }
    getProgramAccounts(programId, options) {
        return this.rpcCall('getProgramAccounts', [programId, options]);
    }
    getRecentPerformanceSamples(limit) {
        return this.rpcCall('getRecentPerformanceSamples', [
            limit,
        ]);
    }
    getRecentPrioritizationFees(addresses) {
        return this.rpcCall('getRecentPrioritizationFees', [addresses]);
    }
    getSignaturesForAddress(address, options) {
        return this.rpcCall('getSignaturesForAddress', [
            address,
            options,
        ]);
    }
    getSignatureStatuses(signatures, options) {
        return this.rpcCall('getSignatureStatuses', [signatures, options]);
    }
    getSlot(options) {
        return this.rpcCall('getSlot', [options]);
    }
    getSlotLeader(options) {
        return this.rpcCall('getSlotLeader', [options]);
    }
    getSlotLeaders(startSlot, limit) {
        return this.rpcCall('getSlotLeaders', [startSlot, limit]);
    }
    getStakeActivation(pubkey, options) {
        return this.rpcCall('getStakeActivation', [pubkey, options]);
    }
    getStakeMinimumDelegation(options) {
        return this.rpcCall('getStakeMinimumDelegation', [
            options,
        ]);
    }
    getSupply(options) {
        return this.rpcCall('getSupply', [options]);
    }
    getTokenAccountBalance(pubkey, options) {
        return this.rpcCall('getTokenAccountBalance', [pubkey, options]);
    }
    getTokenAccountsByDelegate(pubkey, config, options) {
        const params = [pubkey];
        if (config) {
            params.push(config);
        }
        if (options) {
            params.push(options);
        }
        return this.rpcCall('getTokenAccountsByDelegate', params);
    }
    getTokenAccountsByOwner(pubkey, config, options) {
        const params = [pubkey];
        if (config) {
            params.push(config);
        }
        if (options) {
            params.push(options);
        }
        return this.rpcCall('getTokenAccountsByOwner', params);
    }
    getTokenLargestAccounts(pubkey, options) {
        return this.rpcCall('getTokenLargestAccounts', [
            pubkey,
            options,
        ]);
    }
    getTokenSupply(pubkey, options) {
        return this.rpcCall('getTokenSupply', [
            pubkey,
            options,
        ]);
    }
    getTransaction(signature, options) {
        return this.rpcCall('getTransaction', [signature, options]);
    }
    getTransactionCount(options) {
        return this.rpcCall('getTransactionCount', [options]);
    }
    getVersion() {
        return this.rpcCall('getVersion');
    }
    getVoteAccounts(options) {
        return this.rpcCall('getVoteAccounts', [options]);
    }
    isBlockhashValid(blockhash, options) {
        return this.rpcCall('isBlockhashValid', [
            blockhash,
            options,
        ]);
    }
    minimumLedgerSlot() {
        return this.rpcCall('minimumLedgerSlot');
    }
    requestAirdrop(pubkey, amount, options) {
        return this.rpcCall('requestAirdrop', [pubkey, amount, options]);
    }
    sendTransaction(transaction, options) {
        return this.rpcCall('sendTransaction', [transaction, options]);
    }
    simulateTransaction(transaction, options) {
        return this.rpcCall('simulateTransaction', [transaction, options]);
    }
};
exports.AbstractSolanaRpc = AbstractSolanaRpc;
exports.AbstractSolanaRpc = AbstractSolanaRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractSolanaRpc);
//# sourceMappingURL=AbstractSolanaRpc.js.map