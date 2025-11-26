"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../../service");
const e2e_util_1 = require("../../e2e.util");
const getCosmosRosettaRpc = async () => await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(service_1.Network.COSMOS_ROSETTA));
const networks = [{ blockchain: 'cosmos', network: 'mainnet' }];
describe.skip.each(networks)('Cosmos Rosetta', ({ network, blockchain }) => {
    describe('Mainnet', () => {
        let tatum;
        beforeEach(async () => {
            tatum = await getCosmosRosettaRpc();
        });
        afterEach(async () => {
            await tatum.destroy();
        });
        it('should get network status', async () => {
            const response = await tatum.rpc.getNetworkStatus({
                networkIdentifier: { blockchain, network },
            });
            expect(response).toBeDefined();
        });
        it('should get network list', async () => {
            const response = await tatum.rpc.getNetworkList({});
            expect(response).toBeDefined();
        });
        it('should get block', async () => {
            const response = await tatum.rpc.getBlock({
                networkIdentifier: { blockchain, network },
                blockIdentifier: { index: 19853111 },
            });
            expect(response).toBeDefined();
        });
        it.skip('should get all accounts', async () => {
            const response = await tatum.rpc.getAccounts();
            expect(response).toBeDefined();
        });
        it('should get all params', async () => {
            const response = await tatum.rpc.getAllParams();
            expect(response).toBeDefined();
        });
        it('should get all community pool', async () => {
            const response = await tatum.rpc.getCommunityPool();
            expect(response).toBeDefined();
        });
    });
});
//# sourceMappingURL=tatum.rpc.cosmos.rosetta.spec.js.map