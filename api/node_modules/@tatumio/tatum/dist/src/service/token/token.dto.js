"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapper = void 0;
exports.mapper = {
    toFungibleTokenBalance: (apiResponse) => ({
        chain: apiResponse.chain,
        tokenAddress: apiResponse.tokenAddress,
        type: apiResponse.type,
        lastUpdatedBlockNumber: apiResponse.lastUpdatedBlockNumber,
        address: apiResponse.address,
        balance: apiResponse.balance,
    }),
    toTokenMetadata: (apiResponse) => ({
        symbol: apiResponse.symbol,
        name: apiResponse.name,
        supply: apiResponse.supply,
        decimals: apiResponse.decimals,
        tokenType: apiResponse.tokenType,
        cap: apiResponse.cap,
    }),
    toTransaction: (apiResponse) => ({
        chain: apiResponse.chain,
        blockNumber: apiResponse.blockNumber,
        hash: apiResponse.hash,
        transactionType: apiResponse.transactionType,
        transactionIndex: apiResponse.transactionIndex,
        tokenAddress: apiResponse.tokenAddress,
        amount: apiResponse.amount,
        timestamp: apiResponse.timestamp,
        address: apiResponse.address,
        counterAddress: apiResponse.counterAddress,
        transactionSubtype: apiResponse.transactionSubtype,
    }),
    toCreateTokenResponse: (apiResponse) => ({
        txId: apiResponse.txId,
    }),
};
//# sourceMappingURL=token.dto.js.map