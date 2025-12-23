import { PostI } from '../../../dto/PostI';
import { CardanoRpcSuite } from '../../../dto/rpc/CardanoRpcSuite';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractCardanoRpc } from './AbstractCardanoRpc';
export declare class CardanoLoadBalancerRpc extends AbstractCardanoRpc implements CardanoRpcSuite {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    destroy(): void;
    getRpcNodeUrl(): string;
    protected post<T>(post: PostI): Promise<T>;
}
