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
exports.EosLoadBalancerRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
// Need to import like this to keep browser working
const LoadBalancer_1 = require("../generic/LoadBalancer");
const AbstractEosRpc_1 = require("./AbstractEosRpc");
let EosLoadBalancerRpc = class EosLoadBalancerRpc extends AbstractEosRpc_1.AbstractEosRpc {
    constructor(id) {
        super();
        this.loadBalancer = typedi_1.Container.of(id).get(LoadBalancer_1.LoadBalancer);
    }
    destroy() {
        this.loadBalancer.destroy();
    }
    post(post) {
        return this.loadBalancer.post({ ...post, prefix: util_1.Constant.EOS_PREFIX });
    }
    getRpcNodeUrl() {
        return this.loadBalancer.getActiveNormalUrlWithFallback().url;
    }
};
exports.EosLoadBalancerRpc = EosLoadBalancerRpc;
exports.EosLoadBalancerRpc = EosLoadBalancerRpc = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new EosLoadBalancerRpc(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], EosLoadBalancerRpc);
//# sourceMappingURL=EosLoadBalancerRpc.js.map