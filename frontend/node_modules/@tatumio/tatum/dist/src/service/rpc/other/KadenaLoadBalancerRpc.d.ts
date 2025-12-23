import { GetI } from 'src/dto/GetI';
import { PostI } from '../../../dto/PostI';
import { KadenaRpcInterface } from '../../../dto/rpc/KadenaRpcSuite';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractKadenaRpc } from './AbstractKadenaRpc';
export declare class KadenaLoadBalancerRpc extends AbstractKadenaRpc implements KadenaRpcInterface {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    destroy(): void;
    getRpcNodeUrl(): string;
    protected get<T>(get: GetI): Promise<T>;
    protected post<T>(post: PostI): Promise<T>;
    protected put<T>(put: PostI): Promise<T>;
}
