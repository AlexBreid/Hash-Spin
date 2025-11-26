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
exports.UtxoRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
const generic_1 = require("../generic");
const AbstractUtxoRpc_1 = require("./AbstractUtxoRpc");
let UtxoRpc = class UtxoRpc extends AbstractUtxoRpc_1.AbstractUtxoRpc {
    constructor(id) {
        super();
        this.genericRpc = typedi_1.Container.of(id).get(generic_1.GenericRpc);
    }
    async rpcCall(method, params) {
        const preparedCall = util_1.Utils.prepareRpcCall(method, params);
        return (await this.genericRpc.rawRpcCall(preparedCall));
    }
    async rawBatchRpcCall(body) {
        return this.genericRpc.rawBatchRpcCall(body);
    }
    async rawRpcCall(body) {
        return (await this.genericRpc.rawRpcCall(body));
    }
    destroy() {
        // do nothing
    }
    getRpcNodeUrl() {
        return this.genericRpc.getRpcNodeUrl();
    }
};
exports.UtxoRpc = UtxoRpc;
exports.UtxoRpc = UtxoRpc = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new UtxoRpc(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], UtxoRpc);
//# sourceMappingURL=UtxoRpc.js.map