"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../../service");
const e2e_constant_1 = require("../../e2e.constant");
const e2e_util_1 = require("../../e2e.util");
const getStellarRpc = async (testnet) => await service_1.TatumSDK.init({
    network: testnet ? service_1.Network.STELLAR_TESTNET : service_1.Network.STELLAR,
    verbose: e2e_util_1.e2eUtil.isVerbose,
    ...(testnet && { apiKey: { v3: e2e_constant_1.ApiKeyV3.testnet } }),
    ...(!testnet && { apiKey: e2e_constant_1.ApiKey.mainnet }),
    version: testnet ? service_1.ApiVersion.V3 : service_1.ApiVersion.V4,
});
describe.skip('Stellar', () => {
    let tatum;
    describe('mainnet', () => {
        beforeEach(async () => {
            tatum = await getStellarRpc(false);
        });
        afterEach(async () => {
            await tatum.destroy();
        });
        it('should get accounts', async () => {
            const response = await tatum.rpc.getAccounts({
                asset: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
            });
            expect(response).toBeDefined();
        });
        // TODO: Unstable
        it.skip('should get account detail', async () => {
            const response = await tatum.rpc.getAccount({
                accountId: 'GA2224DCGO3WHC4EALA2PR2BZEMAYZPBPTHS243ZYYWQMBWRPJSZH5A6',
            });
            expect(response).toBeDefined();
        });
        it('should get fee stats', async () => {
            const response = await tatum.rpc.getFeeStats();
            expect(response).toBeDefined();
        });
        it.skip('should get ledger', async () => {
            const response = await tatum.rpc.getLedger({
                sequence: 49750265,
            });
            expect(response).toBeDefined();
        });
        it('should get offers', async () => {
            const response = await tatum.rpc.getOffers();
            expect(response).toBeDefined();
        });
        describe('should get strict send', () => {
            it('destinationAccount', async () => {
                const response = await tatum.rpc.getStrictSendPaymentPaths({
                    sourceAssetType: 'native',
                    sourceAmount: '1',
                    destinationAccount: 'GB3LIKQ6GOJ6D4EYKVS47L2SBY66SJO4MN4CZCMUPNBUJ2L3PF62ECBA',
                });
                expect(response).toBeDefined();
            });
            it('destinationAssets', async () => {
                const response = await tatum.rpc.getStrictSendPaymentPaths({
                    sourceAssetType: 'native',
                    sourceAmount: '1',
                    sourceAssets: ['USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'],
                    destinationAssets: ['USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'],
                });
                expect(response).toBeDefined();
            });
        });
        describe('should get strict receive', () => {
            it('sourceAssets', async () => {
                const response = await tatum.rpc.getStrictReceivePaymentPaths({
                    destinationAssetType: 'native',
                    destinationAmount: '1',
                    sourceAssets: ['USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'],
                });
                expect(response).toBeDefined();
            });
            it('sourceAccount', async () => {
                const response = await tatum.rpc.getStrictReceivePaymentPaths({
                    destinationAssetType: 'native',
                    destinationAmount: '1',
                    sourceAccount: 'GB3LIKQ6GOJ6D4EYKVS47L2SBY66SJO4MN4CZCMUPNBUJ2L3PF62ECBA',
                });
                expect(response).toBeDefined();
            });
        });
    });
    describe('testnet', () => {
        beforeEach(async () => {
            tatum = await getStellarRpc(true);
        });
        afterEach(async () => {
            await tatum.destroy();
        });
        it('should get accounts', async () => {
            const response = await tatum.rpc.getAccounts({
                asset: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
            });
            expect(response).toBeDefined();
        });
        // TODO: Unstable
        it.skip('should get account detail', async () => {
            const response = await tatum.rpc.getAccount({
                accountId: 'GDNTXNPBK4YLQKBGPCZ5CAHUGQIXKKGSJAWQGO5XR73TQCAYSWQOCCFP',
            });
            expect(response).toBeDefined();
        });
        it('should get fee stats', async () => {
            const response = await tatum.rpc.getFeeStats();
            expect(response).toBeDefined();
        });
        it('should get ledger', async () => {
            const response = await tatum.rpc.getLedgers();
            expect(response).toBeDefined();
        });
        it('should get offers', async () => {
            const response = await tatum.rpc.getOffers();
            expect(response).toBeDefined();
        });
        describe('should get strict send', () => {
            it('destinationAccount', async () => {
                const response = await tatum.rpc.getStrictSendPaymentPaths({
                    sourceAssetType: 'native',
                    sourceAmount: '1',
                    destinationAccount: 'GB3LIKQ6GOJ6D4EYKVS47L2SBY66SJO4MN4CZCMUPNBUJ2L3PF62ECBA',
                });
                expect(response).toBeDefined();
            });
            it('destinationAssets', async () => {
                const response = await tatum.rpc.getStrictSendPaymentPaths({
                    sourceAssetType: 'native',
                    sourceAmount: '1',
                    sourceAssets: ['USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'],
                    destinationAssets: ['USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'],
                });
                expect(response).toBeDefined();
            });
        });
        describe('should get strict receive', () => {
            it('sourceAssets', async () => {
                const response = await tatum.rpc.getStrictReceivePaymentPaths({
                    destinationAssetType: 'native',
                    destinationAmount: '1',
                    sourceAssets: ['USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'],
                });
                expect(response).toBeDefined();
            });
            it('sourceAccount', async () => {
                const response = await tatum.rpc.getStrictReceivePaymentPaths({
                    destinationAssetType: 'native',
                    destinationAmount: '1',
                    sourceAccount: 'GDNTXNPBK4YLQKBGPCZ5CAHUGQIXKKGSJAWQGO5XR73TQCAYSWQOCCFP',
                });
                expect(response).toBeDefined();
            });
        });
    });
});
//# sourceMappingURL=tatum.rpc.stellar.spec.js.map