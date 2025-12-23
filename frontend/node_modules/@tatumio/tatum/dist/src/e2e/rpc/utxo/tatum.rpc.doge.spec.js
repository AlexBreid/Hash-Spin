"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../../service");
const utxo_e2e_utils_1 = require("./utxo.e2e.utils");
describe('Doge', () => {
    describe('mainnet', () => {
        it('createrawtransaction', async () => {
            const tatum = await utxo_e2e_utils_1.UtxoE2eUtils.initTatum({ network: service_1.Network.DOGECOIN, type: utxo_e2e_utils_1.UtxoNetworkType.MAIN });
            const result = await tatum.rpc.createRawTransaction([
                {
                    txid: '2a68e952c4ebba0cebfbc0b87a2779a50d53a4b4b4e498c2ffee213c0874f0ce',
                    vout: 1,
                },
            ], {
                DDTtqnuZ5kfRT5qh2c7sNtqrJmV3iXYdGG: 0.0000031,
            });
            expect(result.result).not.toBeNull();
            await tatum.destroy();
        });
        it('getblock', async () => {
            const tatum = await utxo_e2e_utils_1.UtxoE2eUtils.initTatum({
                network: service_1.Network.DOGECOIN,
                type: utxo_e2e_utils_1.UtxoNetworkType.MAIN,
            });
            const hash = '4cddee0cb7cc1e7a5d6a099285461e0470b2af8078dae35d5ac77e7c57bbc997';
            const response1 = await tatum.rpc.getBlock(hash, true);
            expect(response1).toBeDefined();
            expect(response1.result).toStrictEqual(expect.objectContaining({
                hash,
                version: 6422788,
                height: 5092153,
                size: 998443,
                merkleroot: '8918a6f70a0ca3c9b4f745c86a7aa3a3d67d18b9c658eacb571c13d7fed0c7a7',
                chainwork: '000000000000000000000000000000000000000000000f2239716b279a602583',
            }));
            const response2 = await tatum.rpc.getBlock(hash, false);
            expect(response2).toBeDefined();
            expect(typeof response2.result).toBe('string');
            await tatum.destroy();
        });
    });
});
//# sourceMappingURL=tatum.rpc.doge.spec.js.map