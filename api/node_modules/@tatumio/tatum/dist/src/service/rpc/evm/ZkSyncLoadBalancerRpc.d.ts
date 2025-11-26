import { JsonRpcCall, JsonRpcResponse } from '../../../dto';
import { Logger } from '../../../service/logger/logger.types';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractZkSyncRpc } from './AbstractZkSyncRpc';
import { ZkSyncRpcSuite } from '../../../dto/rpc/ZkSyncRpcSuite';
export declare class ZkSyncLoadBalancerRpc extends AbstractZkSyncRpc implements ZkSyncRpcSuite {
    protected readonly loadBalancer: LoadBalancer;
    protected readonly logger: Logger;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
