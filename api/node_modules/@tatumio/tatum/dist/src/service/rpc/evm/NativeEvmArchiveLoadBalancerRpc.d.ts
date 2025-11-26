import { JsonRpcCall, JsonRpcResponse } from '../../../dto';
import { NativeEvmBasedRpcSuite } from '../../../dto/rpc/NativeEvmBasedRpcInterface';
import { Logger } from '../../../service/logger/logger.types';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractNativeEvmRpc } from './AbstractNativeEvmRpc';
export declare class NativeEvmArchiveLoadBalancerRpc extends AbstractNativeEvmRpc implements NativeEvmBasedRpcSuite {
    protected readonly loadBalancer: LoadBalancer;
    protected readonly logger: Logger;
    private network;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
    getRpcNodeUrl(): string;
    protected getNativePrefix(): string;
}
