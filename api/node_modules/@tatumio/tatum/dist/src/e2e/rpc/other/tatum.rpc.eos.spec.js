"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../../service");
const e2e_constant_1 = require("../../e2e.constant");
const e2e_util_1 = require("../../e2e.util");
const getEosRpc = async (testnet) => await service_1.TatumSDK.init({
    network: testnet ? service_1.Network.EOS_TESTNET : service_1.Network.EOS,
    apiKey: {
        v4: testnet ? e2e_constant_1.ApiKeyV3.testnet : e2e_constant_1.ApiKey.mainnet,
    },
    version: service_1.ApiVersion.V3,
    retryCount: 1,
    retryDelay: 2000,
    verbose: e2e_util_1.e2eUtil.isVerbose,
});
// Too unstable
describe.skip('eos', () => {
    describe('mainnet', () => {
        it('getInfo', async () => {
            const tatum = await getEosRpc();
            const result = await tatum.rpc.getInfo();
            expect(result).toBeDefined();
            expect(result).toHaveProperty('server_version');
            expect(result).toHaveProperty('chain_id');
            expect(result).toHaveProperty('head_block_num');
            expect(result).toHaveProperty('last_irreversible_block_num');
            expect(result).toHaveProperty('last_irreversible_block_id');
        });
        it('getAccount', async () => {
            const tatum = await getEosRpc();
            const result = await tatum.rpc.getAccount({ accountName: 'eosasia11111' });
            expect(result).toBeDefined();
            expect(result).toHaveProperty('account_name');
            expect(result).toHaveProperty('head_block_num');
            expect(result).toHaveProperty('head_block_time');
            expect(result).toHaveProperty('cpu_limit.used');
            expect(result).toHaveProperty('permissions');
            expect(result).toHaveProperty('total_resources.net_weight');
            expect(result).toHaveProperty('voter_info.owner');
        });
        it('getCurrencyStats', async () => {
            const tatum = await getEosRpc();
            const result = await tatum.rpc.getCurrencyStats({ code: 'eosio.token', symbol: 'EOS' });
            expect(result).toBeDefined();
            expect(result).toHaveProperty('EOS.max_supply');
            expect(result).toHaveProperty('EOS.issuer');
        });
        it('getCurrencyBalance', async () => {
            const tatum = await getEosRpc();
            const result = await tatum.rpc.getCurrencyBalance({
                code: 'eosio.token',
                symbol: 'EOS',
                account: 'eosio',
            });
            expect(result).toBeDefined();
            expect(result).toHaveLength(1);
        });
        it('getTableRows', async () => {
            const tatum = await getEosRpc();
            const result = await tatum.rpc.getTableRows({
                code: 'eosio',
                table: 'voters',
                scope: 'eosio',
                keyType: 'name',
                limit: 100,
                reverse: false,
                showPayer: false,
            });
            expect(result).toBeDefined();
        });
    });
    describe('testnet', () => {
        it('getNowBlock', async () => {
            const tatum = await getEosRpc(true);
            const result = await tatum.rpc.getInfo();
            expect(result).toBeDefined();
            expect(result).toHaveProperty('server_version');
            expect(result).toHaveProperty('chain_id');
            expect(result).toHaveProperty('head_block_num');
            expect(result).toHaveProperty('last_irreversible_block_num');
            expect(result).toHaveProperty('last_irreversible_block_id');
        });
        it('getCurrencyStats', async () => {
            const tatum = await getEosRpc(true);
            const result = await tatum.rpc.getCurrencyStats({ code: 'eosio.token', symbol: 'EOS' });
            expect(result).toBeDefined();
            expect(result).toHaveProperty('EOS.max_supply');
            expect(result).toHaveProperty('EOS.issuer');
        });
        it('getCurrencyBalance', async () => {
            const tatum = await getEosRpc(true);
            const result = await tatum.rpc.getCurrencyBalance({
                code: 'eosio.token',
                symbol: 'EOS',
                account: 'eosio',
            });
            expect(result).toBeDefined();
            expect(result).toHaveLength(1);
        });
        it('getTableRows', async () => {
            const tatum = await getEosRpc(true);
            const result = await tatum.rpc.getTableRows({
                code: 'eosio',
                table: 'voters',
                scope: 'eosio',
                keyType: 'name',
                limit: 100,
                reverse: false,
                showPayer: false,
            });
            expect(result).toBeDefined();
        });
    });
});
//# sourceMappingURL=tatum.rpc.eos.spec.js.map