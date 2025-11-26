"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractUtxoRpc = void 0;
const AbstractCommonUtxoRpc_1 = require("./AbstractCommonUtxoRpc");
class AbstractUtxoRpc extends AbstractCommonUtxoRpc_1.AbstractCommonUtxoRpc {
    async getBlock(hashOrHeight, verbose = 1) {
        return this.rpcCall('getblock', [hashOrHeight, verbose]);
    }
}
exports.AbstractUtxoRpc = AbstractUtxoRpc;
//# sourceMappingURL=AbstractUtxoRpc.js.map