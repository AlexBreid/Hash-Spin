"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractKadenaRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
let AbstractKadenaRpc = class AbstractKadenaRpc {
    urlWithPrefix({ apiVersion, chain, nodeVersion }) {
        if (chain) {
            return `/chainweb/${apiVersion}/${nodeVersion}/chain/${chain}`;
        }
        return `/chainweb/${apiVersion}/${nodeVersion}`;
    }
    prepareRequest({ path, body, queryParams, network }) {
        return {
            path: util_1.Utils.addQueryParams({
                basePath: path,
                strategy: util_1.Utils.camelToDashCase,
                queryParams: queryParams,
            }),
            prefix: network ? this.urlWithPrefix(network) : undefined,
            body,
        };
    }
    sendPost(request) {
        return this.post(this.prepareRequest(request));
    }
    sendPut(request) {
        return this.put(this.prepareRequest(request));
    }
    async sendGet({ path, queryParams, network, }) {
        return this.get({
            path: util_1.Utils.addQueryParams({
                basePath: path,
                strategy: util_1.Utils.camelToDashCase,
                queryParams: queryParams,
            }),
            prefix: network ? this.urlWithPrefix(network) : undefined,
        });
    }
    getCurrentCut(params) {
        const { network, ...rest } = params;
        return this.sendGet({ path: `/cut`, queryParams: rest, network });
    }
    publishCut(params) {
        const { network, ...rest } = params;
        return this.sendPut({ path: '/cut', body: rest, network });
    }
    getBlockHashes(params) {
        const { network, query } = params;
        return this.sendGet({
            path: `/hash`,
            queryParams: query,
            network,
        });
    }
    getBlockHashBranches(params) {
        const { network, query, ...rest } = params;
        return this.sendPost({
            path: `/hash/branch`,
            queryParams: query,
            body: rest,
            network,
        });
    }
    getBlock(params) {
        const { network, query } = params;
        return this.sendGet({
            path: `/block`,
            queryParams: query,
            network,
        });
    }
    getBlockBranches(params) {
        const { network, query, ...rest } = params;
        return this.sendPost({
            path: `/block/branch`,
            queryParams: query,
            body: rest,
        });
    }
    getBlockHeaders(params) {
        const { network, query } = params;
        return this.sendGet({
            path: `/header`,
            queryParams: query,
            network,
        });
    }
    getBlockHeaderByHash(params) {
        const { network, blockHash } = params;
        return this.sendGet({
            path: `/header/${blockHash}`,
            network,
        });
    }
    getBlockHeaderBranches(params) {
        const { network, query, ...rest } = params;
        return this.sendPost({
            path: `/header/branch`,
            queryParams: query,
            body: rest,
            network,
        });
    }
    getPayloadByHash(params) {
        const { network, payloadHash, height } = params;
        return this.sendGet({
            path: `/payload/${payloadHash}`,
            queryParams: { height },
            network,
        });
    }
    getBatchOfBlockPayload(params) {
        const { network, body } = params;
        return this.sendPost({
            path: `/payload/batch`,
            body: body,
            network,
        });
    }
    getBlockPayloadWithOutputs(params) {
        const { network, payloadHash, height } = params;
        return this.sendGet({
            path: `/payload/${payloadHash}/outputs`,
            queryParams: { height },
            network,
        });
    }
    getBatchBlockPayloadWithOutputs(params) {
        const { network, body } = params;
        return this.sendPost({
            path: `/payload/outputs/batch`,
            body,
            network,
        });
    }
    getPendingTransactions(params) {
        const { network, ...rest } = params;
        return this.sendGet({
            path: `/mempool/getPending`,
            queryParams: rest,
            network,
        });
    }
    checkPendingTransactionsInMempool(params) {
        const { network, headers } = params;
        return this.sendPost({
            path: `/mempool/member`,
            body: headers,
            network,
        });
    }
    lookupMempoolTransactions(params) {
        const { network, headers } = params;
        return this.sendPost({
            path: `/mempool/lookup`,
            body: headers,
            network,
        });
    }
    insertTransactionsIntoMempool(params) {
        const { network, body } = params;
        return this.sendPut({
            path: `/mempool/insert`,
            body,
            network,
        });
    }
    checkNodeHealth() {
        return this.sendGet({
            path: '/health',
        });
    }
    getNodeInfo() {
        return this.sendGet({
            path: '/info',
        });
    }
    getCutNetworkPeerInfo(params) {
        const { network, next, limit } = params;
        return this.sendGet({
            path: '/cut/peer',
            queryParams: {
                limit,
                next,
            },
            network,
        });
    }
    putCutNetworkPeerInfo(peerData) {
        return this.sendPut({
            path: '/cut/peer',
            body: peerData,
        });
    }
};
exports.AbstractKadenaRpc = AbstractKadenaRpc;
exports.AbstractKadenaRpc = AbstractKadenaRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractKadenaRpc);
//# sourceMappingURL=AbstractKadenaRpc.js.map