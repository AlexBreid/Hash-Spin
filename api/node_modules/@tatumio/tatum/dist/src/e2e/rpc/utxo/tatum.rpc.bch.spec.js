"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../../service");
const utxo_e2e_utils_1 = require("./utxo.e2e.utils");
describe('Bitcoin Cash', () => {
    describe('mainnet', () => {
        it('estimatefee', async () => {
            const tatum = await utxo_e2e_utils_1.UtxoE2eUtils.initTatum({
                network: service_1.Network.BITCOIN_CASH,
                type: utxo_e2e_utils_1.UtxoNetworkType.MAIN,
            });
            const result = await tatum.rpc.estimateFee();
            await tatum.destroy();
            expect(result.result).not.toBeNull();
        });
    });
    describe('testnet', () => {
        it('estimatefee', async () => {
            const tatum = await utxo_e2e_utils_1.UtxoE2eUtils.initTatum({
                network: service_1.Network.BITCOIN_CASH,
                type: utxo_e2e_utils_1.UtxoNetworkType.TEST,
            });
            const result = await tatum.rpc.estimateFee();
            await tatum.destroy();
            expect(result.result).not.toBeNull();
        });
    });
});
//# sourceMappingURL=tatum.rpc.bch.spec.js.map