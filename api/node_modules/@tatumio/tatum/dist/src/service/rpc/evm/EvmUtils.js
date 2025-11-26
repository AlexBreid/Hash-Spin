"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvmUtils = exports.POSSIBLE_ARCHIVE_METHODS = exports.ARCHIVE_METHODS = void 0;
const bignumber_js_1 = require("bignumber.js");
const decode_1 = require("../../../util/decode");
exports.ARCHIVE_METHODS = ['getCode', 'call'];
exports.POSSIBLE_ARCHIVE_METHODS = [
    { method: 'getStorageAt', index: 2 },
    { method: 'getBalance', index: 1 },
    { method: 'getBlockByNumber', index: 0 },
];
exports.EvmUtils = {
    isArchiveMethod(rpc) {
        const isArchiveMethod = exports.ARCHIVE_METHODS.find((method) => rpc.method.includes(method)) ||
            rpc.method?.includes('debug') ||
            rpc.method?.includes('trace');
        if (isArchiveMethod) {
            return true;
        }
        const possibleArchiveMethod = exports.POSSIBLE_ARCHIVE_METHODS.find((possibleArchiveMethod) => rpc.method.includes(possibleArchiveMethod.method));
        if (possibleArchiveMethod) {
            const param = rpc?.params?.[possibleArchiveMethod.index];
            return this.isParamForArchiveNode(param);
        }
        if (rpc.method.includes('getLogs')) {
            const param = rpc?.params?.[1] || {};
            return this.isParamForArchiveNode(param.fromBlock) || this.isParamForArchiveNode(param.toBlock);
        }
        return false;
    },
    isParamForArchiveNode(param) {
        return !!param && param !== 'latest';
    },
    toBigNumber(response) {
        if (response.result) {
            response.result = new bignumber_js_1.BigNumber(response.result);
        }
        return response;
    },
    toDecodedString(response) {
        if (response.result) {
            response.result = (0, decode_1.decodeHexString)(response.result);
        }
        return response;
    }
};
//# sourceMappingURL=EvmUtils.js.map