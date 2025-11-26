"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractDogeRpc = void 0;
const AbstractCommonUtxoRpc_1 = require("./AbstractCommonUtxoRpc");
class AbstractDogeRpc extends AbstractCommonUtxoRpc_1.AbstractCommonUtxoRpc {
    async getBlock(hashOrHeight, verbose = true) {
        return this.rpcCall('getblock', [hashOrHeight, verbose]);
    }
}
exports.AbstractDogeRpc = AbstractDogeRpc;
//# sourceMappingURL=AbstractDogeRpc.js.map