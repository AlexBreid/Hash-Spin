"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../../service");
const e2e_util_1 = require("../../e2e.util");
const getCasperRpc = async () => await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(service_1.Network.CASPER));
describe.skip('Casper (%s)', () => {
    it('info_get_status', async () => {
        const casper = await getCasperRpc();
        const result = await casper.rpc.infoGetStatus();
        await casper.destroy();
        expect(result.result?.api_version).toBeDefined();
    });
    it('info_get_chainspec', async () => {
        const casper = await getCasperRpc();
        const result = await casper.rpc.infoGetChainspec();
        await casper.destroy();
        expect(result.result?.api_version).toBeDefined();
    });
    it('chain_get_block - heigh', async () => {
        const casper = await getCasperRpc();
        const result = await casper.rpc.chainGetBlock(3126090);
        await casper.destroy();
        expect(result.result?.block?.header).toBeDefined();
    });
    it('chain_get_block - hash', async () => {
        const casper = await getCasperRpc();
        const result = await casper.rpc.chainGetBlock('086459adc0b4d2e084e6214b34ad8efbc1d4980ca166b22d4d2ee99cee2b3bff');
        await casper.destroy();
        expect(result.result?.block?.header).toBeDefined();
    });
});
//# sourceMappingURL=tatum.rpc.casper.spec.js.map