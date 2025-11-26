"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtxoE2eUtils = exports.UtxoNetworkType = void 0;
const service_1 = require("../../../service");
const e2e_util_1 = require("../../e2e.util");
var UtxoNetworkType;
(function (UtxoNetworkType) {
    UtxoNetworkType["MAIN"] = "main";
    UtxoNetworkType["TEST"] = "test";
    UtxoNetworkType["TESTNET4"] = "testnet4";
})(UtxoNetworkType || (exports.UtxoNetworkType = UtxoNetworkType = {}));
exports.UtxoE2eUtils = {
    initTatum: async (params) => service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(params.network, params.apiKey)),
    e2e: (params) => {
        const { type } = params;
        it('chain info', async () => {
            const tatum = await exports.UtxoE2eUtils.initTatum(params);
            const { result } = await tatum.rpc.getBlockChainInfo();
            await tatum.destroy();
            expect(result.chain).toBe(type);
        });
        it('chain info raw call', async () => {
            const tatum = await exports.UtxoE2eUtils.initTatum(params);
            const info = await tatum.rpc.rawRpcCall({
                method: 'getblockchaininfo',
                id: '1',
                jsonrpc: '2.0',
            });
            await tatum.destroy();
            expect(info.result.chain).toBe(type);
        });
        it('best block hash', async () => {
            const tatum = await exports.UtxoE2eUtils.initTatum(params);
            const { result } = await tatum.rpc.getBestBlockHash();
            await tatum.destroy();
            expect(result).toBeTruthy();
        });
        it('block count', async () => {
            const tatum = await exports.UtxoE2eUtils.initTatum(params);
            const { result } = await tatum.rpc.getBlockCount();
            await tatum.destroy();
            expect(result).toBeGreaterThan(0);
        });
        it('difficulty', async () => {
            const tatum = await exports.UtxoE2eUtils.initTatum(params);
            const { result } = await tatum.rpc.getDifficulty();
            await tatum.destroy();
            expect(result).toBeGreaterThan(0);
        });
        it('mempool info', async () => {
            const tatum = await exports.UtxoE2eUtils.initTatum(params);
            const { result } = await tatum.rpc.getMempoolInfo();
            await tatum.destroy();
            expect(result).toBeDefined();
        });
        if (!params.skipEstimateSmartFee) {
            it('estimatesmartfee', async () => {
                const tatum = await exports.UtxoE2eUtils.initTatum(params);
                const result = await tatum.rpc.estimateSmartFee(6);
                await tatum.destroy();
                expect(result.result).not.toBeNull();
            });
        }
    },
};
//# sourceMappingURL=utxo.e2e.utils.js.map