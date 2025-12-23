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
exports.KadenaLoadBalancerRpc = void 0;
const typedi_1 = require("typedi");
// Need to import like this to keep browser working
const LoadBalancer_1 = require("../generic/LoadBalancer");
const AbstractKadenaRpc_1 = require("./AbstractKadenaRpc");
let KadenaLoadBalancerRpc = class KadenaLoadBalancerRpc extends AbstractKadenaRpc_1.AbstractKadenaRpc {
    constructor(id) {
        super();
        this.loadBalancer = typedi_1.Container.of(id).get(LoadBalancer_1.LoadBalancer);
    }
    destroy() {
        this.loadBalancer.destroy();
    }
    getRpcNodeUrl() {
        return this.loadBalancer.getActiveNormalUrlWithFallback().url;
    }
    get(get) {
        return this.loadBalancer.get(get);
    }
    post(post) {
        return this.loadBalancer.post(post);
    }
    put(put) {
        return this.loadBalancer.put(put);
    }
};
exports.KadenaLoadBalancerRpc = KadenaLoadBalancerRpc;
exports.KadenaLoadBalancerRpc = KadenaLoadBalancerRpc = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new KadenaLoadBalancerRpc(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], KadenaLoadBalancerRpc);
//# sourceMappingURL=KadenaLoadBalancerRpc.js.map