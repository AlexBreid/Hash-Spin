"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractTronRpc = void 0;
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
const AbstractEvmRpc_1 = require("./AbstractEvmRpc");
let AbstractTronRpc = class AbstractTronRpc extends AbstractEvmRpc_1.AbstractEvmRpc {
    sendPost({ path, body, notConvertCamelToSnake, }) {
        const post = {
            path,
        };
        if (body) {
            post.body = notConvertCamelToSnake ? body : util_1.Utils.convertObjCamelToSnake(body);
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
    accountPermissionUpdate(ownerAddress, actives, owner, options) {
        return this.sendPost({
            path: '/wallet/accountpermissionupdate',
            body: { ownerAddress, actives, owner, ...options },
        });
    }
    broadcastHex(transaction) {
        return this.sendPost({
            path: '/wallet/broadcasthex',
            body: { transaction },
        });
    }
    broadcastTransaction(rawBody) {
        return this.sendPost({
            path: '/wallet/broadcasttransaction',
            body: rawBody,
            notConvertCamelToSnake: true,
        });
    }
    clearAbi(ownerAddress, contractAddress, options) {
        return this.sendPost({
            path: '/wallet/clearabi',
            body: { ownerAddress, contractAddress, ...options },
        });
    }
    createAccount(ownerAddress, accountAddress, options) {
        return this.sendPost({
            path: '/wallet/createaccount',
            body: { ownerAddress, accountAddress, ...options },
            notConvertCamelToSnake: true,
        });
    }
    createAssetIssue(ownerAddress, name, abbr, totalSupply, trxNum, num, startTime, endTime, url, options) {
        return this.sendPost({
            path: '/wallet/createassetissue',
            body: { ownerAddress, name, abbr, totalSupply, trxNum, num, startTime, endTime, url, ...options },
            notConvertCamelToSnake: true,
        });
    }
    createTransaction(ownerAddress, toAddress, amount, options) {
        return this.sendPost({
            path: '/wallet/createtransaction',
            body: { ownerAddress, toAddress, amount, ...options },
        });
    }
    delegateResource(ownerAddress, receiverAddress, balance, resource, lock, options) {
        return this.sendPost({
            path: '/wallet/delegateresource',
            body: {
                ownerAddress,
                receiverAddress,
                balance,
                resource,
                lock,
                ...options,
            },
        });
    }
    deployContract(abi, bytecode, ownerAddress, name, options) {
        return this.sendPost({
            path: '/wallet/deploycontract',
            body: {
                abi,
                bytecode,
                ownerAddress,
                name,
                ...options,
            },
        });
    }
    estimateEnergy(ownerAddress, contractAddress, functionSelector, parameter, options) {
        return this.sendPost({
            path: '/wallet/estimateenergy',
            body: {
                ownerAddress,
                contractAddress,
                functionSelector,
                parameter,
                ...options,
            },
        });
    }
    freezeBalance(ownerAddress, frozenBalance, frozenDuration, resource, options) {
        return this.sendPost({
            path: '/wallet/freezebalance',
            body: {
                ownerAddress,
                frozenBalance,
                frozenDuration,
                resource,
                ...options,
            },
        });
    }
    freezeBalanceV2(ownerAddress, frozenBalance, resource, options) {
        return this.sendPost({
            path: '/wallet/freezebalancev2',
            body: { ownerAddress, frozenBalance, resource, ...options },
        });
    }
    getAccount(address, options) {
        return this.sendPost({
            path: '/wallet/getaccount',
            body: { address, ...options },
        });
    }
    getAccountBalance(accountIdentifier, blockIdentifier, options) {
        return this.sendPost({
            path: '/wallet/getaccountbalance',
            body: { accountIdentifier, blockIdentifier, ...options },
        });
    }
    getAccountNet(address, options) {
        return this.sendPost({
            path: '/wallet/getaccountnet',
            body: { address, ...options },
        });
    }
    getAccountResources(address, options) {
        return this.sendPost({
            path: '/wallet/getaccountresource',
            body: { address, ...options },
        });
    }
    getAssetIssueByAccount(address, options) {
        return this.sendPost({
            path: '/wallet/getassetissuebyaccount',
            body: { address, ...options },
        });
    }
    getAssetIssueById(value) {
        return this.sendPost({
            path: '/wallet/getassetissuebyid',
            body: { value },
        });
    }
    getAssetIssueByName(value) {
        return this.sendPost({
            path: '/wallet/getassetissuebyname',
            body: { value },
        });
    }
    getAssetIssueList() {
        return this.sendPost({
            path: '/wallet/getassetissuelist',
        });
    }
    getAssetIssueListByName(value) {
        return this.sendPost({
            path: '/wallet/getassetissuelistbyname',
            body: util_1.Utils.convertObjCamelToSnake({ value }),
        });
    }
    getAvailableUnfreezeCount(ownerAddress, options) {
        return this.sendPost({
            path: '/wallet/getavailableunfreezecount',
            body: util_1.Utils.convertObjCamelToSnake({ ownerAddress, ...options }),
        });
    }
    getBandwidthPrices() {
        return this.sendPost({
            path: '/wallet/getbandwidthprices',
        });
    }
    getBlock(idOrNum, options) {
        return this.sendPost({
            path: '/wallet/getblock',
            body: { idOrNum, ...options },
        });
    }
    getBlockBalance(hash, number, options) {
        return this.sendPost({
            path: '/wallet/getblockbalance',
            body: { hash, number, ...options },
        });
    }
    getBlockById(id) {
        return this.sendPost({
            path: '/wallet/getblockbyid',
            body: { value: id },
        });
    }
    getBlockByLatestNum(num) {
        return this.sendPost({
            path: '/wallet/getblockbylatestnum',
            body: { num },
        });
    }
    getBlockByLimitNext(startNum, endNum) {
        return this.sendPost({
            path: '/wallet/getblockbylimitnext',
            body: { startNum, endNum },
            notConvertCamelToSnake: true,
        });
    }
    getBlockByNum(num) {
        return this.sendPost({
            path: '/wallet/getblockbynum',
            body: { num },
        });
    }
    getBurnTRX() {
        return this.sendGet({
            path: '/wallet/getburntrx',
        });
    }
    getCanDelegatedMaxSize(ownerAddress, type, options) {
        return this.sendPost({
            path: '/wallet/getcandelegatedmaxsize',
            body: { ownerAddress, type, ...options },
        });
    }
    getCanWithdrawUnfreezeAmount(ownerAddress, options) {
        return this.sendPost({
            path: '/wallet/getcanwithdrawunfreezeamount',
            body: { ownerAddress, ...options },
        });
    }
    getChainParameters() {
        return this.sendGet({
            path: '/wallet/getchainparameters',
        });
    }
    getContract(value, options) {
        return this.sendPost({
            path: '/wallet/getcontract',
            body: { value, ...options },
        });
    }
    getContractInfo(value, options) {
        return this.sendPost({
            path: '/wallet/getcontractinfo',
            body: { value, ...options },
        });
    }
    getDelegatedResource(fromAddress, toAddress, options) {
        return this.sendPost({
            path: '/wallet/getdelegatedresource',
            body: { fromAddress, toAddress, ...options },
        });
    }
    getDelegatedResourceAccountIndex(value, options) {
        return this.sendPost({
            path: '/wallet/getdelegatedresourceaccountindex',
            body: { value, ...options },
        });
    }
    getDelegatedResourceAccountIndexV2(value, options) {
        return this.sendPost({
            path: '/wallet/getdelegatedresourceaccountindexv2',
            body: { value, ...options },
        });
    }
    getDelegatedResourceV2(fromAddress, toAddress, options) {
        return this.sendPost({
            path: '/wallet/getdelegatedresourcev2',
            body: { fromAddress, toAddress, ...options },
        });
    }
    getEnergyPrices() {
        return this.sendGet({
            path: '/wallet/getenergyprices',
        });
    }
    getNodeInfo() {
        return this.sendGet({
            path: '/wallet/getnodeinfo',
        });
    }
    getNowBlock() {
        return this.sendPost({
            path: '/wallet/getnowblock',
        });
    }
    getPaginatedAssetIssueList(offset, limit) {
        return this.sendPost({
            path: '/wallet/getpaginatedassetissuelist',
            body: { offset, limit },
        });
    }
    getTransactionById(value, options) {
        return this.sendPost({
            path: '/wallet/gettransactionbyid',
            body: { value, ...options },
        });
    }
    getTransactionInfoByBlockNum(num) {
        return this.sendPost({
            path: '/wallet/gettransactioninfobyblocknum',
            body: { num },
        });
    }
    getTransactionInfoById(value) {
        return this.sendPost({
            path: '/wallet/gettransactioninfobyid',
            body: { value },
        });
    }
    listNodes() {
        return this.sendGet({
            path: '/wallet/listnodes',
        });
    }
    participateAssetIssue(toAddress, ownerAddress, assetName, amount, options) {
        return this.sendPost({
            path: '/wallet/participateassetissue',
            body: { toAddress, ownerAddress, assetName, amount, ...options },
        });
    }
    transferAsset(ownerAddress, toAddress, assetName, amount, options) {
        return this.sendPost({
            path: '/wallet/transferasset',
            body: { ownerAddress, toAddress, assetName, amount, ...options },
        });
    }
    triggerConstantContract(ownerAddress, contractAddress, functionSelector, parameter, options) {
        return this.sendPost({
            path: '/wallet/triggerconstantcontract',
            body: {
                ownerAddress,
                contractAddress,
                functionSelector,
                parameter,
                ...options,
            },
        });
    }
    triggerSmartContract(ownerAddress, contractAddress, functionSelector, parameter, options) {
        return this.sendPost({
            path: '/wallet/triggersmartcontract',
            body: {
                ownerAddress,
                contractAddress,
                functionSelector,
                parameter,
                ...options,
            },
        });
    }
    unDelegateResource(ownerAddress, receiverAddress, balance, resource, lock, options) {
        return this.sendPost({
            path: '/wallet/undelegateresource',
            body: {
                ownerAddress,
                receiverAddress,
                balance,
                resource,
                lock,
                ...options,
            },
        });
    }
    unfreezeAsset(ownerAddress, options) {
        return this.sendPost({
            path: '/wallet/unfreezeasset',
            body: { ownerAddress, ...options },
        });
    }
    unfreezeBalance(ownerAddress, resource, options) {
        return this.sendPost({
            path: '/wallet/unfreezebalance',
            body: { ownerAddress, resource, ...options },
        });
    }
    unfreezeBalanceV2(ownerAddress, unfreezeBalance, resource, options) {
        return this.sendPost({
            path: '/wallet/unfreezebalancev2',
            body: { ownerAddress, unfreezeBalance, resource, ...options },
        });
    }
    updateAccount(ownerAddress, accountName, options) {
        return this.sendPost({
            path: '/wallet/updateaccount',
            body: { ownerAddress, accountName, ...options },
        });
    }
    updateAsset(ownerAddress, url, options) {
        return this.sendPost({
            path: '/wallet/updateasset',
            body: { ownerAddress, url, ...options },
        });
    }
    updateEnergyLimit(ownerAddress, contractAddress, originEnergyLimit, options) {
        return this.sendPost({
            path: '/wallet/updateenergylimit',
            body: { ownerAddress, contractAddress, originEnergyLimit, ...options },
        });
    }
    updateSetting(ownerAddress, contractAddress, consumeUserResourcePercent, options) {
        return this.sendPost({
            path: '/wallet/updatesetting',
            body: {
                ownerAddress,
                contractAddress,
                consumeUserResourcePercent,
                ...options,
            },
        });
    }
    validateAddress(address, options) {
        return this.sendPost({
            path: '/wallet/validateaddress',
            body: { address, ...options },
        });
    }
    withdrawExpireUnfreeze(ownerAddress, options) {
        return this.sendPost({
            path: '/wallet/withdrawexpireunfreeze',
            body: { ownerAddress, ...options },
        });
    }
};
exports.AbstractTronRpc = AbstractTronRpc;
exports.AbstractTronRpc = AbstractTronRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractTronRpc);
//# sourceMappingURL=AbstractTronRpc.js.map