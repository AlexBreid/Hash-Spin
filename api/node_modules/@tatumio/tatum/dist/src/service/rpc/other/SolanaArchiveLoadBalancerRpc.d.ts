import { JsonRpcCall, JsonRpcResponse, SolanaRpcSuite } from '../../../dto';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractSolanaRpc } from './AbstractSolanaRpc';
export declare class SolanaArchiveLoadBalancerRpc extends AbstractSolanaRpc implements SolanaRpcSuite {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    private isArchiveMethod;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
