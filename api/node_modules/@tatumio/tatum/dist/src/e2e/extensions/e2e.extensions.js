"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestWalletProvider = exports.TestExtension = void 0;
const dto_1 = require("../../dto");
const service_1 = require("../../service");
class TestExtension extends service_1.TatumSdkExtension {
    constructor(tatumSdkContainer, mockTestExtension) {
        super(tatumSdkContainer);
        this.mockTestExtension = mockTestExtension;
        this.supportedNetworks = dto_1.EVM_BASED_NETWORKS;
        this.sdkConfig = this.tatumSdkContainer.getConfig();
    }
    async sayHello() {
        this.mockTestExtension.dummyMethod();
        this.mockTestExtension.network(this.sdkConfig.network);
    }
    init() {
        this.mockTestExtension.init();
        return Promise.resolve(undefined);
    }
    destroy() {
        this.mockTestExtension.destroy();
        return Promise.resolve(undefined);
    }
}
exports.TestExtension = TestExtension;
class TestWalletProvider extends service_1.TatumSdkWalletProvider {
    constructor(tatumSdkContainer, mockTestExtension, someOtherConfig) {
        super(tatumSdkContainer);
        this.mockTestExtension = mockTestExtension;
        this.supportedNetworks = dto_1.EVM_BASED_NETWORKS;
        this.sdkConfig = this.tatumSdkContainer.getConfig();
        console.log('someOtherConfig', someOtherConfig);
        if (!mockTestExtension) {
            this.mockTestExtension = {
                dummyMethod: jest.fn(),
                init: jest.fn(),
                destroy: jest.fn(),
                network: jest.fn(),
            };
        }
    }
    async getWallet() {
        this.mockTestExtension.network(this.sdkConfig.network);
        this.mockTestExtension.dummyMethod();
        return 'connected';
    }
    init() {
        this.mockTestExtension.init();
        return Promise.resolve(undefined);
    }
    destroy() {
        this.mockTestExtension.destroy();
        return Promise.resolve(undefined);
    }
    signAndBroadcast(payload) {
        this.mockTestExtension.dummyMethod();
        return Promise.resolve(payload);
    }
}
exports.TestWalletProvider = TestWalletProvider;
//# sourceMappingURL=e2e.extensions.js.map