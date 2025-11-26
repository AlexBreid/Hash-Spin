import { JsonRpcCall, JsonRpcResponse } from '../../../dto';
import { GetI } from '../../../dto/GetI';
import { PostI } from '../../../dto/PostI';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractTezosRpc } from './AbstractTezosRpc';
export declare class TezosLoadBalancerRpc extends AbstractTezosRpc {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
    getRpcNodeUrl(): string;
    protected get<T>(get: GetI): Promise<T>;
    protected post<T>(post: PostI): Promise<T>;
}
