"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../../service");
const e2e_util_1 = require("../../e2e.util");
const getKadenaRpc = async (testnet) => await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(testnet ? service_1.Network.KADENA_TESTNET : service_1.Network.KADENA));
const networks = [
    {
        isTestnet: false,
        network: {
            chain: '0',
            nodeVersion: 'mainnet01',
            apiVersion: '0.0',
        },
        blockHash: 'SNAMXHBvZtAbeS19x12bZV2p5d1E4BaxrggceNdUxbw',
        lower: ['RClyuyZAacwvPpmLXKbTwrIRXWeUSjiNhJVP2esH8KM'],
        upper: ['QxGCAz5AY1Y41nh1yWtgqhKhZ9pPiPRagFdIKNqBH74'],
    },
    {
        isTestnet: true,
        network: {
            chain: '0',
            nodeVersion: 'testnet04',
            apiVersion: '0.0',
        },
        blockHash: 'r21zg8E011awAbEghzNBOI4RtKUZ-wHLkUwio-5dKpE',
        lower: ['RClyuyZAacwvPpmLXKbTwrIRXWeUSjiNhJVP2esH8KM'],
        upper: ['r21zg8E011awAbEghzNBOI4RtKUZ-wHLkUwio-5dKpE'],
    },
];
describe.skip('Kadena', () => {
    networks.forEach(({ isTestnet, network, blockHash, lower, upper }) => {
        describe(`${isTestnet ? 'Testnet' : 'Mainnet'}`, () => {
            it('getInfo', async () => {
                const tatum = await getKadenaRpc(isTestnet);
                const result = await tatum.rpc.getNodeInfo();
                await tatum.destroy();
                expect(result).toBeDefined();
                expect(result.nodeApiVersion).toBeDefined();
                expect(result.nodeVersion).toBeDefined();
                expect(result.nodeLatestBehaviorHeight).toBeDefined();
            });
            it('getBlock', async () => {
                const tatum = await getKadenaRpc(isTestnet);
                const result = await tatum.rpc.getBlock({ network });
                await tatum.destroy();
                expect(result).toBeDefined();
                expect(result.items).toBeDefined();
                expect(result.limit).toBeDefined();
                expect(result.next).toBeDefined();
            });
            it('getBlockHeaderByHash', async () => {
                const tatum = await getKadenaRpc(isTestnet);
                const block = await tatum.rpc.getBlockHeaderByHash({ network, blockHash });
                await tatum.destroy();
                expect(block).toBeDefined();
            });
            it('getBlockHeaders', async () => {
                const tatum = await getKadenaRpc(isTestnet);
                const block = await tatum.rpc.getBlockHeaders({ network });
                await tatum.destroy();
                expect(block).toBeDefined();
                expect(block.items).toBeDefined();
                expect(block.next).toBeDefined();
                expect(block.limit).toBeDefined();
            });
            it('getBlockHeaderBranches', async () => {
                const tatum = await getKadenaRpc(isTestnet);
                const block = await tatum.rpc.getBlockHeaderBranches({ network, lower, upper });
                await tatum.destroy();
                expect(block).toBeDefined();
                expect(block.items).toBeDefined();
                expect(block.next).toBeDefined();
                expect(block.limit).toBeDefined();
            });
            it('getBlockHashes', async () => {
                const tatum = await getKadenaRpc(isTestnet);
                const block = await tatum.rpc.getBlockHashes({ network });
                await tatum.destroy();
                expect(block).toBeDefined();
                expect(block.items).toBeDefined();
                expect(block.next).toBeDefined();
                expect(block.limit).toBeDefined();
            });
        });
    });
});
//# sourceMappingURL=tatum.rpc.kadena.spec.js.map