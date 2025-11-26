import { EvmBasedBeaconRpcSuite } from '../../../dto';
import { LoadBalancer } from '../generic/LoadBalancer';
import { BeaconV1EvmRpc } from './BeaconV1EvmRpc';
import { EvmArchiveLoadBalancerRpc } from './EvmArchiveLoadBalancerRpc';
export declare class EvmBeaconArchiveLoadBalancerRpc extends EvmArchiveLoadBalancerRpc implements EvmBasedBeaconRpcSuite {
    private id;
    protected readonly loadBalancer: LoadBalancer;
    readonly beacon: {
        v1: BeaconV1EvmRpc;
    };
    constructor(id: string);
}
