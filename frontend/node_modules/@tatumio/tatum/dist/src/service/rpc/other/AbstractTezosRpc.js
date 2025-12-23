"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractTezosRpc = void 0;
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
let AbstractTezosRpc = class AbstractTezosRpc {
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
    getBlock(params) {
        const { chainId, block } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/${block}` });
    }
    getManagerKey(address, params) {
        const { chainId, block } = params;
        return this.sendGet({
            path: `/chains/${chainId}/blocks/${block}/context/constants/${address}/manager_key`,
        });
    }
    getConstants(params) {
        const { chainId, block } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/${block}/context/constants` });
    }
    getBlockHash(params) {
        const { chainId, block } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/${block}/hash` });
    }
    getBlockHashes(params) {
        const { chainId, ...rest } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks`, queryParams: rest });
    }
    getBlockHeader(params) {
        const { chainId, block } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/${block}/header` });
    }
    getBlockShell(params) {
        const { chainId, block } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/${block}/header/shell` });
    }
    getBlocksHead(params) {
        const { chainId } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/head` });
    }
    getChainId(params) {
        const { chainId } = params;
        return this.sendGet({ path: `/chains/${chainId}/chain_id` });
    }
    getCheckpoint(params) {
        const { chainId } = params;
        return this.sendGet({ path: `/chains/${chainId}/checkpoint` });
    }
    getConfig() {
        return this.sendGet({ path: `/config/` });
    }
    getContractDelegate(params) {
        const { chainId, block, contractId } = params;
        return this.sendGet({
            path: `/chains/${chainId}/blocks/${block}/context/contracts/${contractId}/delegate`,
        });
    }
    getContract(params) {
        const { chainId, contractId, block, ...rest } = params;
        return this.sendGet({
            path: `/chains/${chainId}/blocks/${block}/context/contracts/${contractId}`,
            queryParams: rest,
        });
    }
    getContractBalance(params) {
        const { chainId, block, contractId } = params;
        return this.sendGet({
            path: `/chains/${chainId}/blocks/${block}/context/contracts/${contractId}/balance`,
        });
    }
    getContractBalanceAndFrozenBonds(params) {
        const { chainId, block, contractId } = params;
        return this.sendGet({
            path: `/chains/${chainId}/blocks/${block}/context/contracts/${contractId}/balance_and_frozen_bonds`,
        });
    }
    getContractBigMapValue(params) {
        const { chainId, block, contractId, ...rest } = params;
        return this.sendPost({
            path: `/chains/${chainId}/blocks/${block}/context/contracts/${contractId}/big_map_get`,
            body: rest,
        });
    }
    getContractCounter(params) {
        const { chainId, block, contractId } = params;
        return this.sendGet({
            path: `/chains/${chainId}/blocks/${block}/context/contracts/${contractId}/counter`,
        });
    }
    getContractEntrypoint(params) {
        const { chainId, block, contractId, entrypoint, ...rest } = params;
        return this.sendGet({
            path: `/chains/${chainId}/blocks/${block}/context/contracts/${contractId}/entrypoints/${entrypoint}`,
            queryParams: rest,
        });
    }
    getContractEntrypoints(params) {
        const { chainId, block, contractId, ...rest } = params;
        return this.sendGet({
            path: `/chains/${chainId}/blocks/${block}/context/contracts/${contractId}/entrypoints`,
            queryParams: rest,
        });
    }
    getContractManagerKey(params) {
        const { chainId, block, contractId } = params;
        return this.sendGet({
            path: `/chains/${chainId}/blocks/${block}/context/contracts/${contractId}/manager_key`,
        });
    }
    getContractTickets(params) {
        const { chainId, block, contractId } = params;
        return this.sendGet({
            path: `/chains/${chainId}/blocks/${block}/context/contracts/${contractId}/all_ticket_balances`,
        });
    }
    getContracts(params) {
        const { chainId, block } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/${block}/context/contracts` });
    }
    getErrorsSchema() {
        return this.sendGet({ path: `/errors/` });
    }
    getHistoryMode() {
        return this.sendGet({ path: `/config/history_mode` });
    }
    getInvalidBlocks(params) {
        const { chainId } = params;
        return this.sendGet({ path: `/chains/${chainId}/invalid_blocks` });
    }
    getLevelsCaboose(params) {
        const { chainId } = params;
        return this.sendGet({ path: `/chains/${chainId}/levels/caboose` });
    }
    getLevelsCheckpoint(params) {
        const { chainId } = params;
        return this.sendGet({ path: `/chains/${chainId}/levels/checkpoint` });
    }
    getLevelsSavepoint(params) {
        const { chainId } = params;
        return this.sendGet({ path: `/chains/${chainId}/levels/savepoint` });
    }
    getNetworkDal() {
        return this.sendGet({ path: `/config/network/dal` });
    }
    getNodeVersion() {
        return this.sendGet({ path: `/version/` });
    }
    getOperationHashes(params) {
        const { chainId, block } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/${block}/operations_hashes` });
    }
    getOperations(params) {
        const { chainId, block } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/${block}/operations_hashes` });
    }
    getProtocol(params) {
        const { protocolHash, chainId, block } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/${block}/protocols/${protocolHash}` });
    }
    getProtocols(params) {
        const { chainId, block } = params;
        return this.sendGet({ path: `/chains/${chainId}/blocks/${block}/protocols` });
    }
    getUserActivatedProtocolOverrides() {
        return this.sendGet({ path: `/config/network/user_activated_protocol_overrides` });
    }
    getUserActivatedUpgrades() {
        return this.sendGet({ path: `/config/network/user_activated_upgrades` });
    }
    isBootstrapped(params) {
        const { chainId } = params;
        return this.sendGet({ path: `/chains/${chainId}/is_bootstrapped` });
    }
    simulateOperation(params) {
        const { chainId, block, ...rest } = params;
        return this.sendPost({
            path: `/chains/${chainId}/blocks/${block}/helpers/scripts/simulate_operation`,
            body: rest,
        });
    }
    preapplyOperations(params) {
        const { chainId, block, operations } = params;
        return this.sendPost({
            path: `/chains/${chainId}/blocks/${block}/helpers/preapply/operations`,
            body: operations,
        });
    }
    injectOperation(params) {
        const { operationBytes, ...rest } = params;
        return this.sendPost({ path: `/injection/operation`, body: operationBytes, queryParams: rest });
    }
    injectBlock(params) {
        const { data, operations, ...rest } = params;
        return this.sendPost({ path: `/injection/block`, body: { data, operations }, queryParams: rest });
    }
    injectProtocol(params) {
        const { components, expectedEnvVersion, ...rest } = params;
        return this.sendPost({
            path: `/injection/protocol`,
            body: { components, expectedEnvVersion },
            queryParams: rest,
        });
    }
};
exports.AbstractTezosRpc = AbstractTezosRpc;
exports.AbstractTezosRpc = AbstractTezosRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractTezosRpc);
//# sourceMappingURL=AbstractTezosRpc.js.map