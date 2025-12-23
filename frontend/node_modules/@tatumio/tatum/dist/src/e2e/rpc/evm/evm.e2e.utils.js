"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvmE2eUtils = void 0;
const service_1 = require("../../../service");
const network_utils_1 = require("../../../util/network.utils");
const e2e_util_1 = require("../../e2e.util");
exports.EvmE2eUtils = {
    initTatum: async (network, apiKey, url) => service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network, apiKey, url)),
    e2e: (evmE2eI) => {
        const { network, data, skipEstimateGas, apiKey, url } = evmE2eI;
        it('eth_blockNumber', async () => {
            const tatum = await exports.EvmE2eUtils.initTatum(network, apiKey, url);
            const { result } = await tatum.rpc.blockNumber();
            await tatum.destroy();
            expect(result?.toNumber()).toBeGreaterThan(0);
        });
        it('eth_chainId', async () => {
            const tatum = await exports.EvmE2eUtils.initTatum(network, apiKey, url);
            const { result } = await tatum.rpc.chainId();
            tatum.rpc.destroy();
            expect(result?.toNumber()).toBe(network_utils_1.NetworkUtils.getChainId(network));
        });
        if (!skipEstimateGas) {
            it('eth_estimateGas', async () => {
                const tatum = await exports.EvmE2eUtils.initTatum(network, apiKey, url);
                const estimateGas = data?.estimateGas ?? {
                    from: '0xb4c9E4617a16Be36B92689b9e07e9F64757c1792',
                    to: '0x4675C7e5BaAFBFFbca748158bEcBA61ef3b0a263',
                    value: '0x0',
                };
                const { result } = await tatum.rpc.estimateGas(estimateGas);
                await tatum.destroy();
                expect(result?.toNumber()).toBeGreaterThanOrEqual(0);
            });
        }
        it('eth_gasPrice', async () => {
            const tatum = await exports.EvmE2eUtils.initTatum(network, apiKey, url);
            const { result } = await tatum.rpc.gasPrice();
            await tatum.destroy();
            expect(result?.toNumber()).toBeGreaterThan(0);
        });
        it('web3_clientVersion', async () => {
            const tatum = await exports.EvmE2eUtils.initTatum(network, apiKey, url);
            const { result } = await tatum.rpc.clientVersion();
            await tatum.destroy();
            expect(result).toBeTruthy();
        });
        it('eth_getBlockByNumber', async () => {
            const tatum = await exports.EvmE2eUtils.initTatum(network, apiKey, url);
            const { result } = await tatum.rpc.blockNumber();
            const { result: block } = await tatum.rpc.getBlockByNumber(result.toNumber() - 1000);
            await tatum.destroy();
            expect(block.timestamp).toBeDefined();
            expect(block.size).toBeDefined();
        });
    },
};
//# sourceMappingURL=evm.e2e.utils.js.map