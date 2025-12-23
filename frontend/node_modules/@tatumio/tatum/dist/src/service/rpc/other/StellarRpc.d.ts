import { GetI } from 'src/dto/GetI';
import { TatumConnector } from '../../../connector/tatum.connector';
import { PostI } from '../../../dto/PostI';
import { StellarRpcSuite } from '../../../dto/rpc/StellarRpcSuite';
import { TatumConfig } from '../../tatum';
import { AbstractStellarRpc } from './AbstractStellarRpc';
export declare class StellarRpc extends AbstractStellarRpc implements StellarRpcSuite {
    protected readonly connector: TatumConnector;
    protected readonly config: TatumConfig;
    constructor(id: string);
    destroy(): void;
    protected post<T>(post: PostI): Promise<T>;
    protected get<T>(get: GetI): Promise<T>;
    getRpcNodeUrl(): string;
}
