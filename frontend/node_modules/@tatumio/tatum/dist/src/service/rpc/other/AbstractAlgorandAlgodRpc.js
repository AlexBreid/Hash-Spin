"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractAlgorandAlgodRpc = void 0;
const util_1 = require("../../../util");
class AbstractAlgorandAlgodRpc {
    sendPost({ path, body, queryParams, }) {
        const post = {
            path: util_1.Utils.addQueryParams({
                basePath: path,
                strategy: util_1.Utils.camelToDashCase,
                queryParams: queryParams,
            }),
        };
        if (body) {
            post.body = util_1.Utils.convertObjCamelToSnake(body);
        }
        return this.post(post);
    }
    async sendGet({ path, queryParams }) {
        return this.get({
            path: util_1.Utils.addQueryParams({
                basePath: path,
                strategy: util_1.Utils.camelToDashCase,
                queryParams: queryParams,
            }),
        });
    }
    broadcastTransaction(params) {
        return this.sendPost({ path: '/v2/transactions', body: params });
    }
    getAccountApplicationInfo(params) {
        const { applicationId, address, ...rest } = params;
        return this.sendGet({ path: `/v2/accounts/${address}/applications/${applicationId}`, queryParams: rest });
    }
    getAccountAssetInfo(params) {
        const { assetId, address, ...rest } = params;
        return this.sendGet({ path: `/v2/accounts/${address}/assets/${assetId}`, queryParams: rest });
    }
    getAccountInfo(params) {
        const { address, ...rest } = params;
        return this.sendGet({ path: `/v2/accounts/${address}`, queryParams: rest });
    }
    getApplicationBox(params) {
        const { applicationId, ...rest } = params;
        return this.sendGet({ path: `/v2/applications/${applicationId}/box`, queryParams: rest });
    }
    getApplicationBoxes(params) {
        const { applicationId, ...rest } = params;
        return this.sendGet({ path: `/v2/applications/${applicationId}/boxes`, queryParams: rest });
    }
    getApplicationInfo(params) {
        const { applicationId } = params;
        return this.sendGet({ path: `/v2/applications/${applicationId}` });
    }
    getAssetInformation(params) {
        const { assetId } = params;
        return this.sendGet({ path: `/v2/assets/${assetId}` });
    }
    getBlockHash(params) {
        const { round } = params;
        return this.sendGet({ path: `/v2/blocks/${round}` });
    }
    getBlockTransactionIDs(params) {
        const { round } = params;
        return this.sendGet({ path: `/v2/blocks/${round}/txids` });
    }
    getGenesis() {
        return this.sendGet({ path: '/genesis' });
    }
    getLedgerStateDelta(params) {
        const { round } = params;
        return this.sendGet({ path: `/v2/deltas/${round}` });
    }
    getLedgerSupply() {
        return this.sendGet({ path: '/v2/ledger/supply' });
    }
    getLightBlockHeaderProofParams(params) {
        const { round } = params;
        return this.sendGet({ path: `/v2/blocks/${round}/lightheader/proof` });
    }
    getNodeStatus() {
        return this.sendGet({ path: '/v2/status' });
    }
    getNodeStatusAfterRound(params) {
        const { round } = params;
        return this.sendGet({ path: `/v2/status/wait-for-block-after/${round}` });
    }
    getPendingTransaction(params) {
        const { txid } = params;
        return this.sendGet({ path: `/v2/transactions/pending/${txid}` });
    }
    getPendingTransactions(params) {
        return this.sendGet({ path: '/v2/transactions/pending', queryParams: { ...params } });
    }
    getTransactionParams() {
        return this.sendGet({ path: '/v2/transactions/params' });
    }
    getTransactionProof(params) {
        const { txid, round } = params;
        return this.sendGet({ path: `/v2/blocks/${round}/transactions/${txid}/proof` });
    }
    isHealthy() {
        return this.sendGet({ path: '/health' });
    }
    isReady() {
        return this.sendGet({ path: '/ready' });
    }
    simulateTransaction(params) {
        const { request, ...rest } = params;
        return this.sendPost({ path: '/v2/transactions/simulate', body: { request }, queryParams: rest });
    }
    syncLedgerRound(request) {
        const { round } = request;
        return this.sendPost({ path: `/v2/ledger/sync/${round}` });
    }
}
exports.AbstractAlgorandAlgodRpc = AbstractAlgorandAlgodRpc;
//# sourceMappingURL=AbstractAlgorandAlgodRpc.js.map