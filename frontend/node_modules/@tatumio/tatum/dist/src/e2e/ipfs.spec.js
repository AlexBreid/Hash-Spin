"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const dto_1 = require("../dto");
const e2e_constant_1 = require("./e2e.constant");
const evm_e2e_utils_1 = require("./rpc/evm/evm.e2e.utils");
describe.skip('IPFS', () => {
    it('should upload file to IPFS', async () => {
        const tatum = await evm_e2e_utils_1.EvmE2eUtils.initTatum(dto_1.Network.ETHEREUM, e2e_constant_1.ApiKey.mainnet);
        const fileData = fs_1.default.readFileSync('./test.txt'); // Adjust the path to your file
        const response = await tatum.ipfs.uploadFile({ file: fileData });
        expect(response.status).toBe('SUCCESS');
        expect(response.data.ipfsHash).toBeDefined();
    });
});
//# sourceMappingURL=ipfs.spec.js.map