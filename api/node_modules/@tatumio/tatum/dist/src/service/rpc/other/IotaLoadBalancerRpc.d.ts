import { GetI } from 'src/dto/GetI';
import { PostI } from 'src/dto/PostI';
import { IotaRpcSuite } from '../../../dto/rpc/IotaRpcSuite';
import { LoadBalancer } from '../generic/LoadBalancer';
import { AbstractIotaRpc } from './AbstractIotaRpc';
export declare class IotaLoadBalancerRpc extends AbstractIotaRpc implements IotaRpcSuite {
    protected readonly loadBalancer: LoadBalancer;
    constructor(id: string);
    destroy(): void;
    getRpcNodeUrl(): string;
    protected get<T>(get: GetI): Promise<T>;
    protected post<T>(post: PostI): Promise<T>;
    protected put<T>(put: PostI): Promise<T>;
    protected delete<T>(get: GetI): Promise<T>;
}
