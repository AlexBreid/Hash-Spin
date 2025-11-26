"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractXrpRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
const generateXrpParams = (required, optional) => {
    const xrpParams = {};
    const props = (required ? Object.entries(required) : []).concat(optional ? Object.entries(optional) : []);
    for (const [name, value] of props) {
        xrpParams[util_1.Utils.camelToSnakeCase(name)] = value;
    }
    return [xrpParams];
};
let AbstractXrpRpc = class AbstractXrpRpc {
    accountChannels(account, options) {
        return this.rpcCall('account_channels', generateXrpParams({
            account,
        }, options));
    }
    accountCurrencies(account, options) {
        return this.rpcCall('account_currencies', generateXrpParams({ account }, options));
    }
    accountInfo(account, options) {
        return this.rpcCall('account_info', generateXrpParams({ account }, options));
    }
    accountLines(account, options) {
        return this.rpcCall('account_lines', generateXrpParams({ account }, options));
    }
    accountNfts(account, options) {
        return this.rpcCall('account_nfts', generateXrpParams({ account }, options));
    }
    accountObjects(account, options) {
        return this.rpcCall('account_objects', generateXrpParams({ account }, options));
    }
    accountOffers(account, options) {
        return this.rpcCall('account_offers', generateXrpParams({ account }, options));
    }
    accountTx(account, options) {
        return this.rpcCall('account_tx', generateXrpParams({ account }, options));
    }
    gatewayBalances(account, options) {
        return this.rpcCall('gateway_balances', generateXrpParams({ account }, options));
    }
    norippleCheck(account, role, options) {
        return this.rpcCall('noripple_check', generateXrpParams({ account, role }, options));
    }
    ledger(options) {
        return this.rpcCall('ledger', generateXrpParams({}, options));
    }
    ledgerClosed() {
        return this.rpcCall('ledger_closed');
    }
    ledgerCurrent() {
        return this.rpcCall('ledger_current');
    }
    ledgerData(options) {
        return this.rpcCall('ledger_data', generateXrpParams({}, options));
    }
    ledgerEntry(options) {
        return this.rpcCall('ledger_entry', generateXrpParams({}, options));
    }
    submit(tx, options) {
        return this.rpcCall('submit', generateXrpParams(typeof tx === 'string' ? { txBlob: tx } : { txJson: tx }, options));
    }
    submitMultisigned(txJson, options) {
        return this.rpcCall('submit_multisigned', generateXrpParams({ txJson }, options));
    }
    transactionEntry(txHash, options) {
        return this.rpcCall('transaction_entry', generateXrpParams({ txHash }, options));
    }
    tx(transaction, options) {
        return this.rpcCall('tx', generateXrpParams({ transaction }, options));
    }
    txHistory(start) {
        return this.rpcCall('txHistory', generateXrpParams({ start }));
    }
    sign(txJson, options) {
        return this.rpcCall('sign', generateXrpParams({ txJson }, options));
    }
    signFor(account, txJson, options) {
        return this.rpcCall('sign_for', generateXrpParams({ account, txJson }, options));
    }
    bookOffers(takerGets, takerPays, options) {
        return this.rpcCall('book_offers', generateXrpParams({ takerGets, takerPays }, options));
    }
    depositAuthorized(sourceAccount, destinationAccount, options) {
        return this.rpcCall('deposit_authorized', generateXrpParams({ sourceAccount, destinationAccount }, options));
    }
    nftBuyOffers(nftId, options) {
        return this.rpcCall('nft_buy_offers', generateXrpParams({ nftId }, options));
    }
    nftSellOffers(nftId, options) {
        return this.rpcCall('nft_sell_offers', generateXrpParams({ nftId }, options));
    }
    ripplePathFind(sourceAccount, destinationAccount, destinationAmount, options) {
        return this.rpcCall('ripple_path_find', generateXrpParams({ sourceAccount, destinationAccount, destinationAmount }, options));
    }
    channelAuthorize(amount, channelId, options) {
        return this.rpcCall('channel_authorize', generateXrpParams({ amount, channelId }, options));
    }
    channelVerify(amount, channelId, publicKey, signature) {
        return this.rpcCall('channel_verify', generateXrpParams({ amount, channelId, publicKey, signature }));
    }
    fee() {
        return this.rpcCall('fee');
    }
    serverInfo() {
        return this.rpcCall('server_info');
    }
    serverState() {
        return this.rpcCall('server_state');
    }
    manifest(publicKey) {
        return this.rpcCall('manifest', generateXrpParams({ publicKey }));
    }
    ping() {
        return this.rpcCall('ping');
    }
    random() {
        return this.rpcCall('random');
    }
};
exports.AbstractXrpRpc = AbstractXrpRpc;
exports.AbstractXrpRpc = AbstractXrpRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractXrpRpc);
//# sourceMappingURL=AbstractXrpRpc.js.map