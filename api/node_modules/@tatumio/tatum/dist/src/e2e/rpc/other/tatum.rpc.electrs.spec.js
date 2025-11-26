"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../../service");
const e2e_util_1 = require("../../e2e.util");
const getElectrsRpc = async (testnet) => await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(testnet ? service_1.Network.BITCOIN_ELECTRS_TESTNET : service_1.Network.BITCOIN_ELECTRS));
describe.skip.each([
    [true],
    [false]
])('Electrs (%s)', (testnet) => {
    it('blockchain.headers.subscribe', async () => {
        const electrs = await getElectrsRpc(testnet);
        const result = await electrs.rpc.blockchainHeadersSubscribe();
        await electrs.destroy();
        expect(result.result?.hex).toBeDefined();
        expect(result.result?.height).toBeDefined();
    });
    it('server.banner', async () => {
        const electrs = await getElectrsRpc(testnet);
        const result = await electrs.rpc.serverBanner();
        await electrs.destroy();
        expect(result.result).toBeDefined();
    });
});
//# sourceMappingURL=tatum.rpc.electrs.spec.js.map