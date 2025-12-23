"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.networkToChain = exports.ChainEnum = void 0;
const dto_1 = require("../dto");
var ChainEnum;
(function (ChainEnum) {
    ChainEnum["ETHEREUM"] = "ethereum";
    ChainEnum["ETHEREUM_SEPOLIA"] = "ethereum-sepolia";
    ChainEnum["CELO"] = "celo";
    ChainEnum["CELO_TESTNET"] = "celo-testnet";
    ChainEnum["BSC"] = "bsc";
    ChainEnum["BSC_TESTNET"] = "bsc-testnet";
    ChainEnum["POLYGON"] = "polygon";
})(ChainEnum || (exports.ChainEnum = ChainEnum = {}));
function networkToChain(network) {
    switch (network) {
        case dto_1.Network.ETHEREUM:
            return ChainEnum.ETHEREUM;
        case dto_1.Network.ETHEREUM_SEPOLIA:
            return ChainEnum.ETHEREUM_SEPOLIA;
        case dto_1.Network.CELO:
            return ChainEnum.CELO;
        case dto_1.Network.CELO_ALFAJORES:
            return ChainEnum.CELO_TESTNET;
        case dto_1.Network.BINANCE_SMART_CHAIN:
            return ChainEnum.BSC;
        case dto_1.Network.BINANCE_SMART_CHAIN_TESTNET:
            return ChainEnum.BSC_TESTNET;
        case dto_1.Network.POLYGON:
            return ChainEnum.POLYGON;
        default:
            throw new Error(`Unsupported network ${network}`);
    }
}
exports.networkToChain = networkToChain;
//# sourceMappingURL=api.dto.js.map