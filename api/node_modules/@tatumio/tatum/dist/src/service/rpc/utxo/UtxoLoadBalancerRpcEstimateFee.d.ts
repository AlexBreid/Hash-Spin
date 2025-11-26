import { JsonRpcCall, JsonRpcResponse, UtxoBasedRpcSuiteEstimateFee } from '../../../dto';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractUtxoRpcEstimateFee } from './AbstractUtxoRpcEstimateFee';
export declare class UtxoLoadBalancerRpcEstimateFee extends AbstractUtxoRpcEstimateFee implements UtxoBasedRpcSuiteEstimateFee {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
