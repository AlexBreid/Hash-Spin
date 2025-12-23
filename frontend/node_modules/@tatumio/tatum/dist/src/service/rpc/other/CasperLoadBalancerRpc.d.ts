import { JsonRpcCall, JsonRpcResponse } from '../../../dto';
import { Logger } from '../../../service/logger/logger.types';
import { AbstractCasperRpc } from './AbstractCasperRpc';
import { LoadBalancer } from '../generic/LoadBalancer';
export declare class CasperLoadBalancerRpc extends AbstractCasperRpc {
    protected readonly loadBalancer: LoadBalancer;
    protected readonly logger: Logger;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
