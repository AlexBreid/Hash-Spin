"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../../service");
const evm_e2e_utils_1 = require("./evm.e2e.utils");
const run = async (network, url) => {
    it('zks_getL1GasPrice', async () => {
        const tatum = await evm_e2e_utils_1.EvmE2eUtils.initTatum(network, undefined, url);
        const { result } = await tatum.rpc.zksGetL1GasPrice();
        await tatum.destroy();
        expect(result).toBeDefined();
    });
    it('zks_getBlockDetails', async () => {
        const tatum = await evm_e2e_utils_1.EvmE2eUtils.initTatum(network, undefined, url);
        const { result } = await tatum.rpc.zksGetBlockDetails(39830202);
        await tatum.destroy();
        expect(result).toBeDefined();
    });
    it('zks_getBaseTokenL1Address', async () => {
        const tatum = await evm_e2e_utils_1.EvmE2eUtils.initTatum(network, undefined, url);
        const { result } = await tatum.rpc.zksGetBaseTokenL1Address();
        await tatum.destroy();
        expect(result).toBeDefined();
    });
    it('zks_getFeeParams', async () => {
        const tatum = await evm_e2e_utils_1.EvmE2eUtils.initTatum(network, undefined, url);
        const { result } = await tatum.rpc.zksGetFeeParams();
        await tatum.destroy();
        expect(result).toBeDefined();
    });
};
describe.each([
    { network: service_1.Network.ZK_SYNC, url: 'https://mainnet.era.zksync.io' },
    { network: service_1.Network.ZK_SYNC_TESTNET, url: 'https://sepolia.era.zksync.dev' },
])('RPC ZkSync', (network) => {
    const { network: networkName, url } = network;
    describe(networkName, () => {
        run(networkName, url);
    });
});
//# sourceMappingURL=tatum.rpc.zksync.spec.js.map