import { PostI } from '../../../dto/PostI';
import { AccountBalanceRequest, AccountBalanceResponse, AccountCoinsRequest, AccountCoinsResponse, BlockRequest, BlockResponse, BlockTransactionRequest, BlockTransactionResponse, CallRequest, CallResponse, CardanoRpcSuite, ConstructionCombineRequest, ConstructionCombineResponse, ConstructionDeriveRequest, ConstructionDeriveResponse, ConstructionHashRequest, ConstructionMetadataRequest, ConstructionMetadataResponse, ConstructionParseRequest, ConstructionParseResponse, ConstructionPayloadsRequest, ConstructionPreprocessRequest, ConstructionPreprocessResponse, ConstructionTransactionResponse, EventsBlocksRequest, EventsBlocksResponse, MempoolResponse, MempoolTransactionRequest, MempoolTransactionResponse, MetadataRequest, NetworkListResponse, NetworkOptionsResponse, NetworkRequest, NetworkStatusResponse, SearchTransactionsRequest, SearchTransactionsResponse, TransactionIdentifierResponse, TransactionSubmissionRequest } from '../../../dto/rpc/CardanoRpcSuite';
export declare abstract class AbstractCardanoRpc implements CardanoRpcSuite {
    protected abstract post<T>(post: PostI): Promise<T>;
    protected sendPost<T>({ path, body }: {
        path: string;
        body?: any;
    }): Promise<T>;
    getNetworkList(body: MetadataRequest): Promise<NetworkListResponse>;
    getNetworkStatus(body: NetworkRequest): Promise<NetworkStatusResponse>;
    getNetworkOptions(body: NetworkRequest): Promise<NetworkOptionsResponse>;
    getBlock(body: BlockRequest): Promise<BlockResponse>;
    getBlockTransaction(body: BlockTransactionRequest): Promise<BlockTransactionResponse>;
    getMempool(body: NetworkRequest): Promise<MempoolResponse>;
    getMempoolTransaction(body: MempoolTransactionRequest): Promise<MempoolTransactionResponse>;
    getAccountBalance(body: AccountBalanceRequest): Promise<AccountBalanceResponse>;
    getAccountCoins(body: AccountCoinsRequest): Promise<AccountCoinsResponse>;
    deriveAccount(body: ConstructionDeriveRequest): Promise<ConstructionDeriveResponse>;
    constructionPreprocess(body: ConstructionPreprocessRequest): Promise<ConstructionPreprocessResponse>;
    getTransactionConstructionMetadata(body: ConstructionMetadataRequest): Promise<ConstructionMetadataResponse>;
    generateUnsignedTransactionAndSigningPayloads(body: ConstructionPayloadsRequest): Promise<ConstructionTransactionResponse>;
    createNetworkTransaction(body: ConstructionCombineRequest): Promise<ConstructionCombineResponse>;
    parseTransaction(body: ConstructionParseRequest): Promise<ConstructionParseResponse>;
    getHashOfTransaction(body: ConstructionHashRequest): Promise<TransactionIdentifierResponse>;
    submitTransaction(body: TransactionSubmissionRequest): Promise<TransactionIdentifierResponse>;
    call(body: CallRequest): Promise<CallResponse>;
    getEventsBlocks(body: EventsBlocksRequest): Promise<EventsBlocksResponse>;
    searchTransactions(body: SearchTransactionsRequest): Promise<SearchTransactionsResponse>;
}
