"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractAlgorandIndexerRpc = void 0;
const util_1 = require("../../../util");
class AbstractAlgorandIndexerRpc {
    async sendGet({ path, queryParams }) {
        return this.get({
            path: util_1.Utils.addQueryParams({
                basePath: path,
                strategy: util_1.Utils.camelToDashCase,
                queryParams: queryParams,
            }),
        });
    }
    getAccount(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/v2/accounts/${accountId}`, queryParams: rest });
    }
    getAccountApplications(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/v2/accounts/${accountId}/created-applications`, queryParams: rest });
    }
    getAccountAppsLocalState(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/v2/accounts/${accountId}/apps-local-state`, queryParams: rest });
    }
    getAccountAssets(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/v2/accounts/${accountId}/assets`, queryParams: rest });
    }
    getAccountCreatedAssets(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/v2/accounts/${accountId}/created-assets`, queryParams: rest });
    }
    getAccountTransactions(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/v2/accounts/${accountId}/transactions`, queryParams: rest });
    }
    getAccounts(params) {
        const { ...rest } = params;
        return this.sendGet({ path: `/v2/accounts`, queryParams: rest });
    }
    getApplication(params) {
        const { applicationId, ...rest } = params;
        return this.sendGet({ path: `/v2/applications/${applicationId}`, queryParams: rest });
    }
    getApplicationBox(params) {
        const { applicationId, ...rest } = params;
        return this.sendGet({ path: `/v2/applications/${applicationId}/box`, queryParams: rest });
    }
    getApplicationBoxes(params) {
        const { applicationId, ...rest } = params;
        return this.sendGet({ path: `/v2/applications/${applicationId}/boxes`, queryParams: rest });
    }
    getApplicationLogs(params) {
        const { applicationId, ...rest } = params;
        return this.sendGet({ path: `/v2/applications/${applicationId}/logs`, queryParams: rest });
    }
    getApplications(params) {
        const { ...rest } = params;
        return this.sendGet({ path: `/v2/applications`, queryParams: rest });
    }
    getAsset(params) {
        const { assetId, ...rest } = params;
        return this.sendGet({ path: `/v2/assets/${assetId}`, queryParams: rest });
    }
    getAssetBalances(params) {
        const { assetId, ...rest } = params;
        return this.sendGet({ path: `/v2/assets/${assetId}/balances`, queryParams: rest });
    }
    getAssetTransactions(params) {
        const { assetId, ...rest } = params;
        return this.sendGet({ path: `/v2/assets/${assetId}/transactions`, queryParams: rest });
    }
    getAssets(params) {
        const { ...rest } = params;
        return this.sendGet({ path: `/v2/assets`, queryParams: rest });
    }
    getBlock(params) {
        const { roundNumber, ...rest } = params;
        return this.sendGet({ path: `/v2/blocks/${roundNumber}`, queryParams: rest });
    }
    getHealth() {
        return this.sendGet({ path: `/health` });
    }
    getTransaction(params) {
        const { txid, ...rest } = params;
        return this.sendGet({ path: `/v2/transactions/${txid}`, queryParams: rest });
    }
    getTransactions(params) {
        const { ...rest } = params;
        return this.sendGet({ path: `/v2/transactions`, queryParams: rest });
    }
}
exports.AbstractAlgorandIndexerRpc = AbstractAlgorandIndexerRpc;
//# sourceMappingURL=AbstractAlgorandIndexerRpc.js.map