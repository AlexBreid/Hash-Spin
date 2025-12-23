"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractCommonUtxoRpc = void 0;
class AbstractCommonUtxoRpc {
    async createRawTransaction(inputs, outputs, locktime, replaceable) {
        const params = [inputs, outputs];
        if (locktime) {
            params.push(locktime);
        }
        if (replaceable) {
            params.push(replaceable);
        }
        return this.rpcCall('createrawtransaction', params);
    }
    async decodeRawTransaction(hexstring) {
        return this.rpcCall('decoderawtransaction', [hexstring]);
    }
    async decodeScript(hexstring) {
        return this.rpcCall('decodescript', [hexstring]);
    }
    async estimateSmartFee(blocks, estimateMode) {
        const params = [blocks];
        if (estimateMode) {
            params.push(estimateMode);
        }
        return this.rpcCall('estimatesmartfee', params);
    }
    async getBestBlockHash() {
        return this.rpcCall('getbestblockhash');
    }
    async getBlockChainInfo() {
        return this.rpcCall('getblockchaininfo');
    }
    async getBlockCount() {
        return this.rpcCall('getblockcount');
    }
    async getBlockHash(height) {
        return this.rpcCall('getblockhash', [height]);
    }
    async getBlockHeader(hash, verbose = true) {
        return this.rpcCall('getblockheader', [hash, verbose]);
    }
    async getBlockStats(hash) {
        return this.rpcCall('getblockstats', [hash]);
    }
    async getChainTips() {
        return this.rpcCall('getchaintips');
    }
    async getDifficulty() {
        return this.rpcCall('getdifficulty');
    }
    async getMempoolAncestors(txId, verbose = false) {
        return this.rpcCall('getmempoolancestors', [txId, verbose]);
    }
    async getMempoolDescendants(txId, verbose = false) {
        return this.rpcCall('getmempooldescendants', [txId, verbose]);
    }
    async getMempoolEntry(txId) {
        return this.rpcCall('getmempoolentry', [txId]);
    }
    async getMempoolInfo() {
        return this.rpcCall('getmempoolinfo');
    }
    async getRawMemPool(verbose = false) {
        return this.rpcCall('getrawmempool', [verbose]);
    }
    async getRawTransaction(txId, verbose = false) {
        return this.rpcCall('getrawtransaction', [txId, verbose]);
    }
    async getTxOut(txId, index, includeMempool = true) {
        return this.rpcCall('gettxout', [txId, index, includeMempool]);
    }
    async getTxOutProof(txIds, blockhash) {
        const params = [txIds];
        if (blockhash) {
            params.push(blockhash);
        }
        return this.rpcCall('gettxoutproof', params);
    }
    async sendRawTransaction(hexstring) {
        return this.rpcCall('sendrawtransaction', [hexstring]);
    }
    async validateAddress(address) {
        return this.rpcCall('validateaddress', [address]);
    }
    async verifyMessage(address, signature, message) {
        return this.rpcCall('verifymessage', [address, signature, message]);
    }
    async verifyTxOutProof(proof) {
        return this.rpcCall('verifytxoutproof', [proof]);
    }
}
exports.AbstractCommonUtxoRpc = AbstractCommonUtxoRpc;
//# sourceMappingURL=AbstractCommonUtxoRpc.js.map