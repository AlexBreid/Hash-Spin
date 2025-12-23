"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractStellarRpc = void 0;
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
let AbstractStellarRpc = class AbstractStellarRpc {
    async sendGet({ path, queryParams }) {
        if (queryParams && Object.keys(queryParams).length > 0) {
            return this.get({
                path: util_1.Utils.addQueryParams({
                    basePath: path,
                    strategy: util_1.Utils.camelToSnakeCase,
                    queryParams: queryParams,
                }),
            });
        }
        return this.get({ path });
    }
    async sendPost({ path, body, queryParams, }) {
        const post = {
            path,
        };
        if (queryParams && Object.keys(queryParams).length > 0) {
            post.path = util_1.Utils.addQueryParams({
                basePath: path,
                strategy: util_1.Utils.camelToSnakeCase,
                queryParams: queryParams,
            });
        }
        if (body) {
            if (typeof body === 'object') {
                post.body = util_1.Utils.convertObjCamelToSnake(body);
            }
            else {
                post.body = body;
            }
        }
        return this.post(post);
    }
    getAccounts(params) {
        return this.sendGet({ path: '/accounts', queryParams: params });
    }
    getAccount(params) {
        return this.sendGet({ path: `/accounts/${params.accountId}` });
    }
    getAccountTransactions(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/accounts/${accountId}/transactions`, queryParams: rest });
    }
    getAccountOperations(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/accounts/${accountId}/operations`, queryParams: rest });
    }
    getAccountPayments(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/accounts/${accountId}/payments`, queryParams: rest });
    }
    getAccountEffects(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/accounts/${accountId}/effects`, queryParams: rest });
    }
    getAccountOffers(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/accounts/${accountId}/offers`, queryParams: rest });
    }
    getAccountTrades(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/accounts/${accountId}/trades`, queryParams: rest });
    }
    getAccountData(params) {
        const { accountId, ...rest } = params;
        return this.sendGet({ path: `/accounts/${accountId}/data/${rest.key}` });
    }
    getAssets(params) {
        return this.sendGet({ path: '/assets', queryParams: params });
    }
    getClaimableBalances(params) {
        return this.sendGet({ path: '/claimable_balances', queryParams: params });
    }
    getClaimableBalance(params) {
        return this.sendGet({ path: `/claimable_balances/${params.claimableBalanceId}` });
    }
    getClaimableTransactions(params) {
        const { claimableBalanceId, ...rest } = params;
        return this.sendGet({ path: `/claimable_balances/${claimableBalanceId}/transactions`, queryParams: rest });
    }
    getClaimableOperations(params) {
        const { claimableBalanceId, ...rest } = params;
        return this.sendGet({ path: `/claimable_balances/${claimableBalanceId}/operations`, queryParams: rest });
    }
    getEffects(params) {
        return this.sendGet({ path: '/effects', queryParams: params });
    }
    getFeeStats() {
        return this.sendGet({ path: '/fee_stats' });
    }
    getLiquidityPools(params) {
        return this.sendGet({ path: '/liquidity_pools', queryParams: params });
    }
    getLiquidityPool(params) {
        const { liquidityPoolId, ...rest } = params;
        return this.sendGet({ path: `/liquidity_pools/${liquidityPoolId}`, queryParams: rest });
    }
    getLiquidityPoolEffects(params) {
        const { liquidityPoolId, ...rest } = params;
        return this.sendGet({ path: `/liquidity_pools/${liquidityPoolId}/effects`, queryParams: rest });
    }
    getLiquidityPoolTrades(params) {
        const { liquidityPoolId, ...rest } = params;
        return this.sendGet({ path: `/liquidity_pools/${liquidityPoolId}/trades`, queryParams: rest });
    }
    getLiquidityPoolTransactions(params) {
        const { liquidityPoolId, ...rest } = params;
        return this.sendGet({ path: `/liquidity_pools/${liquidityPoolId}/transactions`, queryParams: rest });
    }
    getLiquidityPoolOperations(params) {
        const { liquidityPoolId, ...rest } = params;
        return this.sendGet({ path: `/liquidity_pools/${liquidityPoolId}/operations`, queryParams: rest });
    }
    getLedger(params) {
        const { sequence, ...rest } = params;
        return this.sendGet({ path: `/ledgers/${sequence}`, queryParams: rest });
    }
    getLedgerTransactions(params) {
        const { sequence, ...rest } = params;
        return this.sendGet({ path: `/ledgers/${sequence}/transactions`, queryParams: rest });
    }
    getLedgerPayments(params) {
        const { sequence, ...rest } = params;
        return this.sendGet({ path: `/ledgers/${sequence}/payments`, queryParams: rest });
    }
    getLedgerOperations(params) {
        const { sequence, ...rest } = params;
        return this.sendGet({ path: `/ledgers/${sequence}/operations`, queryParams: rest });
    }
    getLedgerEffects(params) {
        const { sequence, ...rest } = params;
        return this.sendGet({ path: `/ledgers/${sequence}/effects`, queryParams: rest });
    }
    getLedgers(params) {
        return this.sendGet({ path: '/ledgers', queryParams: params });
    }
    getOffers(params) {
        return this.sendGet({ path: '/offers', queryParams: params });
    }
    getOffer(params) {
        const { offerId, ...rest } = params;
        return this.sendGet({ path: `/offers/${offerId}`, queryParams: rest });
    }
    getOfferTrades(params) {
        const { offerId, ...rest } = params;
        return this.sendGet({ path: `/offers/${offerId}/trades`, queryParams: rest });
    }
    getOrderBook(params) {
        const { sellingAssetType, ...rest } = params;
        return this.sendGet({ path: `/order_book/${sellingAssetType}`, queryParams: rest });
    }
    getTradeAggregations(params) {
        const { baseAssetType, counterAssetType, ...rest } = params;
        return this.sendGet({
            path: `trade_aggregations/${baseAssetType}${counterAssetType}`,
            queryParams: rest,
        });
    }
    getTrades(params) {
        return this.sendGet({ path: '/trades', queryParams: params });
    }
    getTransaction(params) {
        const { transactionHash, ...rest } = params;
        return this.sendGet({ path: `/transactions/${transactionHash}`, queryParams: rest });
    }
    getTransactionOperations(params) {
        const { transactionHash, ...rest } = params;
        return this.sendGet({ path: `/transactions/${transactionHash}/operations`, queryParams: rest });
    }
    getTransactionEffects(params) {
        const { transactionHash, ...rest } = params;
        return this.sendGet({ path: `/transactions/${transactionHash}/effects`, queryParams: rest });
    }
    getTransactions(params) {
        return this.sendGet({ path: '/transactions', queryParams: params });
    }
    getOperation(params) {
        const { id, ...rest } = params;
        return this.sendGet({ path: `/operations/${id}`, queryParams: rest });
    }
    getOperationEffects(params) {
        const { id, ...rest } = params;
        return this.sendGet({ path: `/operations/${id}/effects`, queryParams: rest });
    }
    getOperations(params) {
        return this.sendGet({ path: '/operations', queryParams: params });
    }
    getPayments(params) {
        return this.sendGet({ path: '/payments', queryParams: params });
    }
    getStrictReceivePaymentPaths(params) {
        const { sourceAssets, ...rest } = params;
        const sourceAssetsString = sourceAssets?.join(',');
        return this.sendGet({
            path: `/paths/strict-receive`,
            queryParams: {
                ...rest,
                ...(sourceAssetsString && { sourceAssets: sourceAssetsString }),
            },
        });
    }
    getStrictSendPaymentPaths(params) {
        const { destinationAssets, sourceAssets, ...rest } = params;
        const destinationAssetsString = destinationAssets?.join(',');
        const sourceAssetsString = sourceAssets?.join(',');
        return this.sendGet({
            path: `/paths/strict-send`,
            queryParams: {
                ...rest,
                ...(destinationAssetsString && { destinationAssets: destinationAssetsString }),
                ...(sourceAssetsString && { sourceAssets: sourceAssetsString }),
            },
        });
    }
    submitTransaction(params) {
        return this.sendPost({ path: '/transactions', queryParams: params });
    }
};
exports.AbstractStellarRpc = AbstractStellarRpc;
exports.AbstractStellarRpc = AbstractStellarRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractStellarRpc);
//# sourceMappingURL=AbstractStellarRpc.js.map