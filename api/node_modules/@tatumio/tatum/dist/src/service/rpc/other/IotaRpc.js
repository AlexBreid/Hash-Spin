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
exports.IotaRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const AbstractIotaRpc_1 = require("./AbstractIotaRpc");
const connector_1 = require("../../../connector");
const util_1 = require("../../../util");
let IotaRpc = class IotaRpc extends AbstractIotaRpc_1.AbstractIotaRpc {
    constructor(id) {
        super();
        this.connector = typedi_1.Container.of(id).get(connector_1.TatumConnector);
        this.config = typedi_1.Container.of(id).get(util_1.CONFIG);
    }
    getRpcNodeUrl() {
        return util_1.Utils.getV3RpcUrl(this.config);
    }
    get(get) {
        const basePath = util_1.Utils.getV3RpcUrl(this.config);
        return this.connector.get({ ...get, basePath });
    }
    post(post) {
        const basePath = util_1.Utils.getV3RpcUrl(this.config);
        return this.connector.post({ ...post, basePath });
    }
    put(put) {
        const basePath = util_1.Utils.getV3RpcUrl(this.config);
        return this.connector.put({ ...put, basePath });
    }
    delete(get) {
        const basePath = util_1.Utils.getV3RpcUrl(this.config);
        return this.connector.delete({ ...get, basePath });
    }
};
exports.IotaRpc = IotaRpc;
exports.IotaRpc = IotaRpc = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new IotaRpc(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], IotaRpc);
//# sourceMappingURL=IotaRpc.js.map