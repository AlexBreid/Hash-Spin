"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dto_1 = require("../dto");
const service_1 = require("../service");
describe('Logger', () => {
    let logger;
    beforeEach(() => {
        logger = {
            trace: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
        };
    });
    it('should warn on missing API key', async () => {
        const tatum = await service_1.TatumSDK.init({
            network: dto_1.Network.ETHEREUM_SEPOLIA,
            logger,
        });
        await tatum.destroy();
        expect(logger.warn).toHaveBeenCalledWith('API key not provided - only a subset of SDK features will be enabled. Generate an API Key by accessing your Dashboard: https://co.tatum.io/signup');
    });
});
//# sourceMappingURL=tatum.logger.spec.js.map