"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dto_1 = require("../dto");
const service_1 = require("../service");
const e2e_constant_1 = require("./e2e.constant");
describe('Tatum Init', () => {
    it('Testnet', async () => {
        const tatum = await service_1.TatumSDK.init({
            network: dto_1.Network.BITCOIN_TESTNET,
            apiKey: e2e_constant_1.ApiKey.testnet,
        });
        const { result } = await tatum.rpc.getBlockChainInfo();
        expect(result.chain).toBe('test');
        await tatum.destroy();
    });
    it('Mainnet', async () => {
        const tatum = await service_1.TatumSDK.init({
            network: dto_1.Network.BITCOIN,
            apiKey: e2e_constant_1.ApiKey.mainnet,
        });
        const { result } = await tatum.rpc.getBlockChainInfo();
        expect(result.chain).toBe('main');
        await tatum.destroy();
    });
    it('Multiple Instances', async () => {
        const mainnet = await service_1.TatumSDK.init({
            network: dto_1.Network.BITCOIN,
            apiKey: e2e_constant_1.ApiKey.mainnet,
        });
        const testnet = await service_1.TatumSDK.init({
            network: dto_1.Network.BITCOIN_TESTNET,
            apiKey: e2e_constant_1.ApiKey.testnet,
        });
        const { result: resultMainnet } = await mainnet.rpc.getBlockChainInfo();
        expect(resultMainnet.chain).toBe('main');
        const { result: resultTestnet } = await testnet.rpc.getBlockChainInfo();
        expect(resultTestnet.chain).toBe('test');
        await testnet.destroy();
        await mainnet.destroy();
    });
});
//# sourceMappingURL=tatum.spec.js.map