import { AccountPutDeployResponse, BlockIdentifier, CasperRpcSuite, ChainGetBlockResponse, ChainGetBlockTransfersResponse, ChainGetEraSummaryResponse, ChainGetStateRootHashResponse, InfoGetChainspecResponse, InfoGetDeployRequest, InfoGetDeployResponse, InfoGetStatusResponse, QueryBalanceRequest, QueryBalanceResponse, QueryGlobalStateRequest, QueryGlobalStateResponse, SpeculativeExecRequest, StateGetAccountInfoRequest, StateGetAccountInfoResponse, StateGetDictionaryItemRequest, StateGetDictionaryItemResponse } from '../../../dto/rpc/CasperRpcSuite';
import { JsonRpcResponse } from '../../../dto';
export declare abstract class AbstractCasperRpc implements CasperRpcSuite {
    protected abstract rpcCall<T>(method: string, params?: unknown[] | unknown): Promise<T>;
    private getBlockIdentifier;
    accountPutDeploy(deploy: any): Promise<JsonRpcResponse<AccountPutDeployResponse>>;
    speculativeExec(params: SpeculativeExecRequest): Promise<JsonRpcResponse<any>>;
    chainGetBlock(block_identifier: BlockIdentifier): Promise<JsonRpcResponse<ChainGetBlockResponse>>;
    chainGetBlockTransfers(block_identifier: BlockIdentifier): Promise<JsonRpcResponse<ChainGetBlockTransfersResponse>>;
    chainGetEraSummary(block_identifier?: BlockIdentifier): Promise<JsonRpcResponse<ChainGetEraSummaryResponse>>;
    chainGetStateRootHash(block_identifier?: BlockIdentifier): Promise<JsonRpcResponse<ChainGetStateRootHashResponse>>;
    infoGetChainspec(): Promise<JsonRpcResponse<InfoGetChainspecResponse>>;
    infoGetDeploy(params: InfoGetDeployRequest): Promise<JsonRpcResponse<InfoGetDeployResponse>>;
    queryBalance(params: QueryBalanceRequest): Promise<JsonRpcResponse<QueryBalanceResponse>>;
    queryGlobalState(params: QueryGlobalStateRequest): Promise<JsonRpcResponse<QueryGlobalStateResponse>>;
    stateGetAccountInfo(params: StateGetAccountInfoRequest): Promise<JsonRpcResponse<StateGetAccountInfoResponse>>;
    stateGetDictionaryItem(params: StateGetDictionaryItemRequest): Promise<JsonRpcResponse<StateGetDictionaryItemResponse>>;
    infoGetStatus(): Promise<JsonRpcResponse<InfoGetStatusResponse>>;
}
