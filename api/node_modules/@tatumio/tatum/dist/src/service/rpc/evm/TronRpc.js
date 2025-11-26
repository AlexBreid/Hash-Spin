"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const tatum_connector_1 = require("../../../connector/tatum.connector");
const util_1 = require("../../../util");
const GenericRpc_1 = require("../generic/GenericRpc");
const AbstractTronRpc_1 = require("./AbstractTronRpc");
let TronRpc = class TronRpc extends AbstractTronRpc_1.AbstractTronRpc {
    constructor(id) {
        super();
        this.genericRpc = typedi_1.Container.of(id).get(GenericRpc_1.GenericRpc);
        this.config = typedi_1.Container.of(id).get(util_1.CONFIG);
        this.connector = typedi_1.Container.of(id).get(tatum_connector_1.TatumConnector);
        this.logger = typedi_1.Container.of(id).get(util_1.LOGGER);
    }
    async rpcCall(method, params) {
        const preparedCall = util_1.Utils.prepareRpcCall(method, params);
        return (await this.connector.rpcCall(util_1.Constant.TRON_SHASTA_BASE_URL.RPC, preparedCall));
    }
    async rawRpcCall(body) {
        return (await this.connector.rpcCall(util_1.Constant.TRON_SHASTA_BASE_URL.RPC, body));
    }
    async rawBatchRpcCall(body) {
        return this.connector.rpcCall(util_1.Constant.TRON_SHASTA_BASE_URL.RPC, body);
    }
    post(post) {
        return this.connector.post({
            basePath: `${util_1.Constant.TRON_SHASTA_BASE_URL.BASE}${post.path}`,
            body: post.body,
        });
    }
    get(get) {
        return this.connector.get({
            basePath: `${util_1.Constant.TRON_SHASTA_BASE_URL.BASE}${get.path}`,
        });
    }
    destroy() {
        // do nothing
    }
    getRpcNodeUrl() {
        return this.genericRpc.getRpcNodeUrl();
    }
};
exports.TronRpc = TronRpc;
exports.TronRpc = TronRpc = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new TronRpc(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], TronRpc);
//# sourceMappingURL=TronRpc.js.map