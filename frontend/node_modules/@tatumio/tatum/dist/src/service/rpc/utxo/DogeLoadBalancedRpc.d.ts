import { JsonRpcCall, JsonRpcResponse, DogeRpcSuite } from '../../../dto';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractDogeRpc } from './AbstractDogeRpc';
export declare class DogeLoadBalancedRpc extends AbstractDogeRpc implements DogeRpcSuite {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
