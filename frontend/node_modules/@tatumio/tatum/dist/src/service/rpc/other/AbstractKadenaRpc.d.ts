import { GetI } from '../../../dto/GetI';
import { PostI } from '../../../dto/PostI';
import { Base64HashesPage, Base64UrlBlockHeader, BlockHashesPage, ChainwebNodeInfo, Cut, GetBlockHeaderByHashParams, GetBlockParams, GetBlockParamsLowerUpper, GetBlockPayloadWithOutputsParams, GetCurrentCutParams, GetCutNetworkPeerInfoParams, GetPayloadByHashParams, GetPendingTransactionsParams, InsertTransactionIntoMempoolParams, KadenaRpcInterface, MempoolTransactionsParams, Payload, PayloadRequest, PayloadWithOutputs, Peer, PendingTransactionsResponse, SignedTransactionText } from '../../../dto/rpc/KadenaRpcSuite';
export declare abstract class AbstractKadenaRpc implements KadenaRpcInterface {
    protected abstract post<T>(post: PostI): Promise<T>;
    protected abstract put<T>(post: PostI): Promise<T>;
    protected abstract get<T>(get: GetI): Promise<T>;
    abstract destroy(): void;
    abstract getRpcNodeUrl(): string;
    private urlWithPrefix;
    private prepareRequest;
    private sendPost;
    private sendPut;
    private sendGet;
    getCurrentCut(params: GetCurrentCutParams): Promise<Cut>;
    publishCut(params: Cut): Promise<void>;
    getBlockHashes(params: GetBlockParams): Promise<BlockHashesPage>;
    getBlockHashBranches(params: GetBlockParamsLowerUpper): Promise<BlockHashesPage>;
    getBlock(params: GetBlockParams): Promise<BlockHashesPage>;
    getBlockBranches(params: GetBlockParamsLowerUpper): Promise<BlockHashesPage>;
    getBlockHeaders(params: GetBlockParams): Promise<Base64HashesPage>;
    getBlockHeaderByHash(params: GetBlockHeaderByHashParams): Promise<Base64UrlBlockHeader>;
    getBlockHeaderBranches(params: GetBlockParamsLowerUpper): Promise<BlockHashesPage>;
    getPayloadByHash(params: GetPayloadByHashParams): Promise<Payload>;
    getBatchOfBlockPayload(params: PayloadRequest): Promise<Payload[]>;
    getBlockPayloadWithOutputs(params: GetBlockPayloadWithOutputsParams): Promise<PayloadWithOutputs>;
    getBatchBlockPayloadWithOutputs(params: PayloadRequest): Promise<Array<PayloadWithOutputs>>;
    getPendingTransactions(params: GetPendingTransactionsParams): Promise<PendingTransactionsResponse>;
    checkPendingTransactionsInMempool(params: MempoolTransactionsParams): Promise<boolean[]>;
    lookupMempoolTransactions(params: MempoolTransactionsParams): Promise<Array<{
        tag: 'Missing' | 'Pending';
        contents?: SignedTransactionText;
    }>>;
    insertTransactionsIntoMempool(params: InsertTransactionIntoMempoolParams): Promise<void>;
    checkNodeHealth(): Promise<string>;
    getNodeInfo(): Promise<ChainwebNodeInfo>;
    getCutNetworkPeerInfo(params: GetCutNetworkPeerInfoParams): Promise<{
        items: Peer[];
        page: BlockHashesPage;
    }>;
    putCutNetworkPeerInfo(peerData: Peer): Promise<void>;
}
