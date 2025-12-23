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
exports.TronLoadBalancerRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
// Need to import like this to keep browser working
const AbstractTronRpc_1 = require("./AbstractTronRpc");
const LoadBalancer_1 = require("../generic/LoadBalancer");
let TronLoadBalancerRpc = class TronLoadBalancerRpc extends AbstractTronRpc_1.AbstractTronRpc {
    constructor(id) {
        super();
        this.loadBalancer = typedi_1.Container.of(id).get(LoadBalancer_1.TronLoadBalancer);
        this.logger = typedi_1.Container.of(id).get(util_1.LOGGER);
    }
    async rpcCall(method, params) {
        const preparedCall = util_1.Utils.prepareRpcCall(method, params);
        return (await this.loadBalancer.rawRpcCall(preparedCall));
    }
    async rawRpcCall(body) {
        return this.loadBalancer.rawRpcCall(body);
    }
    rawBatchRpcCall(body) {
        return this.loadBalancer.rawBatchRpcCall(body);
    }
    destroy() {
        this.loadBalancer.destroy();
    }
    post(post) {
        return this.loadBalancer.post(post);
    }
    get(get) {
        return this.loadBalancer.get(get);
    }
    getRpcNodeUrl() {
        return this.loadBalancer.getActiveNormalUrlWithFallback().url;
    }
};
exports.TronLoadBalancerRpc = TronLoadBalancerRpc;
exports.TronLoadBalancerRpc = TronLoadBalancerRpc = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new TronLoadBalancerRpc(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], TronLoadBalancerRpc);
//# sourceMappingURL=TronLoadBalancerRpc.js.map