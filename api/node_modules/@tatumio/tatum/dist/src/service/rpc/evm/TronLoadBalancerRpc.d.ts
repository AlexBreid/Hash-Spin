import { EvmBasedRpcSuite, JsonRpcCall, JsonRpcResponse } from '../../../dto';
import { PostI } from '../../../dto/PostI';
import { Logger } from '../../../service/logger/logger.types';
import { AbstractTronRpc } from './AbstractTronRpc';
import { GetI } from '../../../dto/GetI';
import { TronLoadBalancer } from '../generic/LoadBalancer';
export declare class TronLoadBalancerRpc extends AbstractTronRpc implements EvmBasedRpcSuite {
    protected readonly loadBalancer: TronLoadBalancer;
    protected readonly logger: Logger;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
    protected post<T>(post: PostI): Promise<T>;
    protected get<T>(get: GetI): Promise<T>;
    getRpcNodeUrl(): string;
}
