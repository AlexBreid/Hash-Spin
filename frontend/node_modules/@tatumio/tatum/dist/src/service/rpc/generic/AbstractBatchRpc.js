"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractBatchRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const tatum_connector_1 = require("../../../connector/tatum.connector");
const util_1 = require("../../../util");
class AbstractBatchRpc {
    constructor(id) {
        this.id = id;
        this.connector = typedi_1.Container.of(this.id).get(tatum_connector_1.TatumConnector);
        this.config = typedi_1.Container.of(this.id).get(util_1.CONFIG);
    }
    getRpcNodeUrl(subPath) {
        return util_1.Utils.getV3RpcUrl(this.config, subPath);
    }
    rawRpcCall(body) {
        return this.connector.rpcCall(this.getRpcNodeUrl(), body);
    }
    rawBatchRpcCall(body) {
        return this.connector.rpcCall(this.getRpcNodeUrl(), body);
    }
    destroy() {
        // do nothing
    }
}
exports.AbstractBatchRpc = AbstractBatchRpc;
//# sourceMappingURL=AbstractBatchRpc.js.map