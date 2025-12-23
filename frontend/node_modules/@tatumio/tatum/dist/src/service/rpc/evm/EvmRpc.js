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
exports.EvmRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
const GenericRpc_1 = require("../generic/GenericRpc");
const AbstractEvmRpc_1 = require("./AbstractEvmRpc");
let EvmRpc = class EvmRpc extends AbstractEvmRpc_1.AbstractEvmRpc {
    constructor(id) {
        super();
        this.genericRpc = typedi_1.Container.of(id).get(GenericRpc_1.GenericRpc);
        this.logger = typedi_1.Container.of(id).get(util_1.LOGGER);
    }
    async rpcCall(method, params) {
        const preparedCall = util_1.Utils.prepareRpcCall(method, params);
        return (await this.genericRpc.rawRpcCall(preparedCall));
    }
    async rawRpcCall(body) {
        return (await this.genericRpc.rawRpcCall(body));
    }
    async rawBatchRpcCall(body) {
        return this.genericRpc.rawBatchRpcCall(body);
    }
    destroy() {
        // do nothing
    }
};
exports.EvmRpc = EvmRpc;
exports.EvmRpc = EvmRpc = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new EvmRpc(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], EvmRpc);
//# sourceMappingURL=EvmRpc.js.map