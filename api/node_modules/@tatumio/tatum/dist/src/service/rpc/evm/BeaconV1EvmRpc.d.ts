import { GetI } from '../../../dto/GetI';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractBeaconV1EvmRpc } from './AbstractBeaconV1EvmRpc';
export declare class BeaconV1EvmRpc extends AbstractBeaconV1EvmRpc {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    destroy(): void;
    protected get<T>(get: GetI): Promise<T>;
}
