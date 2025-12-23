import { JsonRpcCall, JsonRpcResponse, UtxoBasedRpcSuite } from '../../../dto';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractUtxoRpc } from './AbstractUtxoRpc';
export declare class UtxoLoadBalancerRpc extends AbstractUtxoRpc implements UtxoBasedRpcSuite {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
