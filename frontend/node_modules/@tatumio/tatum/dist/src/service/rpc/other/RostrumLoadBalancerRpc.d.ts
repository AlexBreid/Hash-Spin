import { RostrumRpcInterface } from '../../../dto/rpc/RostrumRpcSuite';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractRostrumRpc } from './AbstractRostrumRpc';
export declare class RostrumLoadBalancerRpc extends AbstractRostrumRpc implements RostrumRpcInterface {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
