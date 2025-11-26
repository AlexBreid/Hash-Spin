"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../../service");
const e2e_extensions_1 = require("./e2e.extensions");
const mockTestExtension = {
    dummyMethod: jest.fn(),
    init: jest.fn(),
    destroy: jest.fn(),
    network: jest.fn(),
};
describe('Tatum Extension Ecosystem', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('General Extension', () => {
        it('should work after being registered', async () => {
            const tatum = await service_1.TatumSDK.init({
                network: service_1.Network.ETHEREUM_SEPOLIA,
                configureExtensions: [{ type: e2e_extensions_1.TestExtension, config: mockTestExtension }],
            });
            await tatum.extension(e2e_extensions_1.TestExtension).sayHello();
            await tatum.destroy();
            expect(mockTestExtension.dummyMethod).toHaveBeenCalled();
            expect(mockTestExtension.init).toHaveBeenCalled();
            expect(mockTestExtension.destroy).toHaveBeenCalled();
            expect(mockTestExtension.network).toBeCalledWith(service_1.Network.ETHEREUM_SEPOLIA);
        });
        it('should fail if network not supported', async () => {
            try {
                const tatum = await service_1.TatumSDK.init({
                    network: service_1.Network.BITCOIN,
                    configureExtensions: [e2e_extensions_1.TestExtension],
                });
                expect(true).toBe(false);
                await tatum.destroy();
            }
            catch (e) {
                if (e instanceof Error) {
                    expect(e.message).toBe('Extension TestExtension is not supported on bitcoin-mainnet network.');
                }
                else {
                    expect(true).toBe(false);
                }
            }
        });
    });
    describe('Wallet Extension', () => {
        it('should work after being registered', async () => {
            const tatum = await service_1.TatumSDK.init({
                network: service_1.Network.ETHEREUM_SEPOLIA,
                configureWalletProviders: [{ type: e2e_extensions_1.TestWalletProvider, config: mockTestExtension }],
            });
            const result = await tatum.walletProvider.use(e2e_extensions_1.TestWalletProvider).getWallet();
            await tatum.walletProvider.use(e2e_extensions_1.TestWalletProvider).signAndBroadcast('payload');
            await tatum.destroy();
            expect(result).toBe('connected');
            expect(mockTestExtension.init).toHaveBeenCalled();
            expect(mockTestExtension.destroy).toHaveBeenCalled();
            expect(mockTestExtension.network).toBeCalledWith(service_1.Network.ETHEREUM_SEPOLIA);
            expect(mockTestExtension.dummyMethod).toBeCalledTimes(2);
        });
    });
    describe('Configurable Wallet Extension', () => {
        it('should work after being registered without config if optional', async () => {
            const tatum = await service_1.TatumSDK.init({
                network: service_1.Network.ETHEREUM_SEPOLIA,
                configureWalletProviders: [e2e_extensions_1.TestWalletProvider],
            });
            const result = await tatum.walletProvider.use(e2e_extensions_1.TestWalletProvider).getWallet();
            await tatum.walletProvider.use(e2e_extensions_1.TestWalletProvider).signAndBroadcast('payload');
            await tatum.destroy();
            expect(result).toBe('connected');
        });
    });
});
//# sourceMappingURL=tatum.extensions.spec.js.map