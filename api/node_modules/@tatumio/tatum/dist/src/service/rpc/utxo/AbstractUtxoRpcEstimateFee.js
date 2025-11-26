"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractUtxoRpcEstimateFee = void 0;
const AbstractUtxoRpc_1 = require("./AbstractUtxoRpc");
class AbstractUtxoRpcEstimateFee extends AbstractUtxoRpc_1.AbstractUtxoRpc {
    estimateFee() {
        return this.rpcCall('estimatefee');
    }
}
exports.AbstractUtxoRpcEstimateFee = AbstractUtxoRpcEstimateFee;
//# sourceMappingURL=AbstractUtxoRpcEstimateFee.js.map