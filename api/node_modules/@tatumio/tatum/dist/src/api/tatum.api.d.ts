import { ApiBalanceRequest, ApiBalanceResponse, ApiCheckOwnersRequest, ApiCollectionsResponse, ApiCreateTokenRequest, ApiEventsRequest, ApiGetBlockRequest, ApiLatestBlockRequest, ApiMetadataRequest, ApiMetadataResponse, ApiOwnersRequest, ApiTokensRequest, ApiTransactionByHashRequest, ApiTransactionsRequest, ApiTxData, ApiUtxoByAddress, ApiUtxoResponse, Block, Event, FungibleInfo, MultitokenInfo, NftInfo, NftTokenInfo, TxIdResponse } from './api.dto';
export declare class TatumApi {
    private readonly id;
    private readonly connector;
    constructor(id: string);
    getTokensFromCollection(params: ApiMetadataRequest): Promise<ApiCollectionsResponse[]>;
    getTokenMetadata(params: ApiMetadataRequest): Promise<ApiMetadataResponse[]>;
    getBalancesOfAddresses(params: ApiBalanceRequest): Promise<ApiBalanceResponse[]>;
    getOwnersOfToken(params: ApiOwnersRequest): Promise<string[]>;
    checkOwner(params: ApiCheckOwnersRequest): Promise<boolean>;
    getTransactions(params: ApiTransactionsRequest): Promise<ApiTxData[]>;
    getTransactionsByHash(params: ApiTransactionByHashRequest): Promise<ApiTxData[]>;
    getEvents(params: ApiEventsRequest): Promise<Event[]>;
    getBlocks(params: ApiGetBlockRequest): Promise<Block[]>;
    getLatestBlock(params: ApiLatestBlockRequest): Promise<Block>;
    getTokenInfo(params: ApiTokensRequest): Promise<FungibleInfo | NftInfo | MultitokenInfo | NftTokenInfo>;
    getUtxosByAddress(params: ApiUtxoByAddress): Promise<ApiUtxoResponse[]>;
    createFungibleToken(body: ApiCreateTokenRequest): Promise<TxIdResponse>;
}
