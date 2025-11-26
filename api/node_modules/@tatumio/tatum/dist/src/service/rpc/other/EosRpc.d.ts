import { TatumConnector } from '../../../connector/tatum.connector';
import { PostI } from '../../../dto/PostI';
import { EosRpcSuite } from '../../../dto/rpc/EosRpcSuite';
import { TatumConfig } from '../../tatum';
import { AbstractEosRpc } from './AbstractEosRpc';
export declare class EosRpc extends AbstractEosRpc implements EosRpcSuite {
    protected readonly connector: TatumConnector;
    protected readonly config: TatumConfig;
    constructor(id: string);
    destroy(): void;
    protected post<T>(post: PostI): Promise<T>;
    getRpcNodeUrl(): string;
}
