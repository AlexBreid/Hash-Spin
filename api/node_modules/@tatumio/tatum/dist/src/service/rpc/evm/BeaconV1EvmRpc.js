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
exports.BeaconV1EvmRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const LoadBalancer_1 = require("../generic/LoadBalancer");
const AbstractBeaconV1EvmRpc_1 = require("./AbstractBeaconV1EvmRpc");
let BeaconV1EvmRpc = class BeaconV1EvmRpc extends AbstractBeaconV1EvmRpc_1.AbstractBeaconV1EvmRpc {
    constructor(id) {
        super();
        this.loadBalancer = typedi_1.Container.of(id).get(LoadBalancer_1.LoadBalancer);
    }
    destroy() {
        this.loadBalancer.destroy();
    }
    get(get) {
        return this.loadBalancer.get(get);
    }
};
exports.BeaconV1EvmRpc = BeaconV1EvmRpc;
exports.BeaconV1EvmRpc = BeaconV1EvmRpc = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new BeaconV1EvmRpc(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], BeaconV1EvmRpc);
//# sourceMappingURL=BeaconV1EvmRpc.js.map