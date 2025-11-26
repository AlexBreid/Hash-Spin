import { JsonRpcCall, JsonRpcResponse, XrpRpcSuite } from '../../../dto';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractXrpRpc } from './AbstractXrpRpc';
export declare class XrpLoadBalancerRpc extends AbstractXrpRpc implements XrpRpcSuite {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
