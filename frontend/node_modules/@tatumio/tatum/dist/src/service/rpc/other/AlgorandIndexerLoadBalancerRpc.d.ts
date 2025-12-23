import { GetI } from '../../../dto/GetI';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractAlgorandIndexerRpc } from './AbstractAlgorandIndexerRpc';
export declare class AlgorandIndexerLoadBalancerRpc extends AbstractAlgorandIndexerRpc {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    destroy(): void;
    getRpcNodeUrl(): string;
    protected get<T>(get: GetI): Promise<T>;
}
