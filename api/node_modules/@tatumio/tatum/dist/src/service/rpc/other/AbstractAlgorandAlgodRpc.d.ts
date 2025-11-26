import { GetI } from '../../../dto/GetI';
import { PostI } from '../../../dto/PostI';
import { Account, AccountApplicationRequest, AccountApplicationResponse, AccountAssetRequest, AccountAssetResponse, AccountInfoRequest, AlgorandAlgodRpcSuite, Application, Asset, BlockHashRequest, BlockHashResponse, BlockTransactionIDsResponse, Box, BoxesRequestParams, BoxesResponse, BoxRequestParams, GetLightBlockHeaderProofParams, LedgerStateDelta, LedgerSupplyResponse, LightBlockHeaderProof, NodeStatus, NodeStatusResponse, PendingTransactionResponse, PendingTransactionsRequest, PendingTransactionsResponse, SimulateRequest, SimulateResponse, SyncRoundRequest, TransactionBroadcastRequest, TransactionBroadcastResponse, TransactionParams, TransactionProof, TransactionProofParams } from '../../../dto/rpc/AlgorandAlgodRpcSuite';
export declare abstract class AbstractAlgorandAlgodRpc implements AlgorandAlgodRpcSuite {
    protected abstract post<T>(post: PostI): Promise<T>;
    protected abstract get<T>(get: GetI): Promise<T>;
    private sendPost;
    private sendGet;
    broadcastTransaction(params: TransactionBroadcastRequest): Promise<TransactionBroadcastResponse>;
    getAccountApplicationInfo(params: AccountApplicationRequest): Promise<AccountApplicationResponse>;
    getAccountAssetInfo(params: AccountAssetRequest): Promise<AccountAssetResponse>;
    getAccountInfo(params: AccountInfoRequest): Promise<Account>;
    getApplicationBox(params: BoxRequestParams): Promise<Box>;
    getApplicationBoxes(params: BoxesRequestParams): Promise<BoxesResponse>;
    getApplicationInfo(params: {
        applicationId: number;
    }): Promise<Application>;
    getAssetInformation(params: {
        assetId: number;
    }): Promise<Asset>;
    getBlockHash(params: BlockHashRequest): Promise<BlockHashResponse>;
    getBlockTransactionIDs(params: {
        round: number;
    }): Promise<BlockTransactionIDsResponse>;
    getGenesis(): Promise<string>;
    getLedgerStateDelta(params: {
        round: number;
    }): Promise<LedgerStateDelta>;
    getLedgerSupply(): Promise<LedgerSupplyResponse>;
    getLightBlockHeaderProofParams(params: GetLightBlockHeaderProofParams): Promise<LightBlockHeaderProof>;
    getNodeStatus(): Promise<NodeStatusResponse>;
    getNodeStatusAfterRound(params: {
        round: number;
    }): Promise<NodeStatus>;
    getPendingTransaction(params: {
        txid: string;
    }): Promise<PendingTransactionResponse>;
    getPendingTransactions(params: PendingTransactionsRequest): Promise<PendingTransactionsResponse>;
    getTransactionParams(): Promise<TransactionParams>;
    getTransactionProof(params: TransactionProofParams): Promise<TransactionProof>;
    isHealthy(): Promise<void>;
    isReady(): Promise<void>;
    simulateTransaction(params: SimulateRequest): Promise<SimulateResponse>;
    syncLedgerRound(request: SyncRoundRequest): Promise<void>;
}
