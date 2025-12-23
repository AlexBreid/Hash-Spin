import { GetI } from 'src/dto/GetI';
import { PostI } from 'src/dto/PostI';
import { IotaRpcSuite } from '../../../dto/rpc/IotaRpcSuite';
import { AbstractIotaRpc } from './AbstractIotaRpc';
import { TatumConnector } from '../../../connector';
import { TatumConfig } from '../../tatum';
export declare class IotaRpc extends AbstractIotaRpc implements IotaRpcSuite {
    protected readonly connector: TatumConnector;
    protected readonly config: TatumConfig;
    constructor(id: string);
    getRpcNodeUrl(): string;
    protected get<T>(get: GetI): Promise<T>;
    protected post<T>(post: PostI): Promise<T>;
    protected put<T>(put: PostI): Promise<T>;
    protected delete<T>(get: GetI): Promise<T>;
}
