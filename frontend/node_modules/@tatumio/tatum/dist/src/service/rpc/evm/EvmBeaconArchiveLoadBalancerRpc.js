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
exports.EvmBeaconArchiveLoadBalancerRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
// Need to import like this to keep browser working
const LoadBalancer_1 = require("../generic/LoadBalancer");
const BeaconV1EvmRpc_1 = require("./BeaconV1EvmRpc");
const EvmArchiveLoadBalancerRpc_1 = require("./EvmArchiveLoadBalancerRpc");
let EvmBeaconArchiveLoadBalancerRpc = class EvmBeaconArchiveLoadBalancerRpc extends EvmArchiveLoadBalancerRpc_1.EvmArchiveLoadBalancerRpc {
    constructor(id) {
        super(id);
        this.id = id;
        this.beacon = {
            v1: typedi_1.Container.of(this.id).get(BeaconV1EvmRpc_1.BeaconV1EvmRpc),
        };
        this.loadBalancer = typedi_1.Container.of(id).get(LoadBalancer_1.LoadBalancer);
    }
};
exports.EvmBeaconArchiveLoadBalancerRpc = EvmBeaconArchiveLoadBalancerRpc;
exports.EvmBeaconArchiveLoadBalancerRpc = EvmBeaconArchiveLoadBalancerRpc = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new EvmBeaconArchiveLoadBalancerRpc(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], EvmBeaconArchiveLoadBalancerRpc);
//# sourceMappingURL=EvmBeaconArchiveLoadBalancerRpc.js.map