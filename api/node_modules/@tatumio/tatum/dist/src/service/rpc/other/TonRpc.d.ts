import { GetI } from 'src/dto/GetI';
import { TatumConnector } from '../../../connector/tatum.connector';
import { PostI } from '../../../dto/PostI';
import { TatumConfig } from '../../tatum';
import { AbstractTonRpc } from './AbstractTonRpc';
import { TonRpcSuite } from '../../../dto/rpc/ton/TonRpcSuite';
export declare class TonRpc extends AbstractTonRpc implements TonRpcSuite {
    protected readonly connector: TatumConnector;
    protected readonly config: TatumConfig;
    constructor(id: string);
    destroy(): void;
    protected post<T>(post: PostI): Promise<T>;
    protected get<T>(get: GetI): Promise<T>;
    protected put<T>(put: PostI): Promise<T>;
}
