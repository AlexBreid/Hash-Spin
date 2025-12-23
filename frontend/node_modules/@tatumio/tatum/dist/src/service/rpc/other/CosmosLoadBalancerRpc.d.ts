import { PostI } from '../../../dto/PostI';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractCosmosRpc } from './AbstractCosmosRpc';
import { CosmosRpcSuite } from '../../../dto/rpc/CosmosRpcSuite';
import { GetI } from '../../../dto/GetI';
export declare class CosmosLoadBalancerRpc extends AbstractCosmosRpc implements CosmosRpcSuite {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    destroy(): void;
    getRpcNodeUrl(): string;
    protected post<T>(post: PostI): Promise<T>;
    protected get<T>(get: GetI): Promise<T>;
}
