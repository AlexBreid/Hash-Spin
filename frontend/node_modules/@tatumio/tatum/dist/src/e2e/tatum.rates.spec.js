"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../service");
const e2e_constant_1 = require("./e2e.constant");
describe('Rates', () => {
    let tatum;
    beforeEach(async () => {
        tatum = await service_1.TatumSDK.init({
            network: service_1.Network.ETHEREUM_SEPOLIA,
            retryDelay: 1000,
            retryCount: 2,
            version: service_1.ApiVersion.V4,
            apiKey: e2e_constant_1.ApiKey.testnet,
        });
    });
    afterEach(() => {
        tatum.destroy();
    });
    it('get ETH/EUR', async () => {
        const res = await tatum.rates.getCurrentRate('BTC', 'EUR');
        expect(res.data.value).toBeDefined();
    });
    it('get batch', async () => {
        const res = await tatum.rates.getCurrentRateBatch([
            { currency: 'BTC', basePair: 'EUR' },
            { currency: 'ETH', basePair: 'EUR' },
        ]);
        expect(res.data[1].value).toBeDefined();
    });
});
//# sourceMappingURL=tatum.rates.spec.js.map