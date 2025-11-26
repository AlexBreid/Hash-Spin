import { PostI } from '../../../dto/PostI';
import { EosRpcSuite } from '../../../dto/rpc/EosRpcSuite';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractEosRpc } from './AbstractEosRpc';
export declare class EosLoadBalancerRpc extends AbstractEosRpc implements EosRpcSuite {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    destroy(): void;
    protected post<T>(post: PostI): Promise<T>;
    getRpcNodeUrl(): string;
}
