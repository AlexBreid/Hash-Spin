import { GetI } from '../../../dto/GetI';
import { PostI } from '../../../dto/PostI';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractStellarRpc } from './AbstractStellarRpc';
export declare class StellarLoadBalancerRpc extends AbstractStellarRpc {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    destroy(): void;
    getRpcNodeUrl(): string;
    protected get<T>(get: GetI): Promise<T>;
    protected post<T>(post: PostI): Promise<T>;
}
