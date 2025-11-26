"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkUtils = void 0;
const dto_1 = require("../dto");
const env_1 = require("./env");
exports.NetworkUtils = {
    getNetworkMetadata: (network) => {
        return dto_1.NETWORK_METADATA[network];
    },
    isTestnet(network) {
        return exports.NetworkUtils.getNetworkMetadata(network).testnet;
    },
    getChainId: (network) => {
        const chainId = dto_1.NETWORK_METADATA[network]?.chainId;
        if (!chainId) {
            throw new Error(`Tatum Network to ChainId for network ${network} does not exist`);
        }
        return chainId;
    },
    isAlternateTestnet: (network) => {
        const metadata = exports.NetworkUtils.getNetworkMetadata(network);
        return metadata.testnet && !metadata.defaultTestnet;
    },
    getV4ApiKeyForNetwork: (network) => {
        if (!env_1.EnvUtils.isProcessAvailable())
            return undefined;
        return exports.NetworkUtils.isTestnet(network) ? process.env?.V4_API_KEY_TESTNET : process.env?.V4_API_KEY_MAINNET;
    },
};
//# sourceMappingURL=network.utils.js.map