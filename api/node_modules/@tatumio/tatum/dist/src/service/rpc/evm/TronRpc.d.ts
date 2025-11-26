import { TatumConnector } from '../../../connector/tatum.connector';
import { JsonRpcCall, JsonRpcResponse } from '../../../dto';
import { PostI } from '../../../dto/PostI';
import { Logger } from '../../../service/logger/logger.types';
import { TatumConfig } from '../../tatum';
import { GenericRpc } from '../generic/GenericRpc';
import { AbstractTronRpc } from './AbstractTronRpc';
import { GetI } from '../../../dto/GetI';
export declare class TronRpc extends AbstractTronRpc {
    readonly genericRpc: GenericRpc;
    protected readonly config: TatumConfig;
    protected readonly connector: TatumConnector;
    protected readonly logger: Logger;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall<T>(body: JsonRpcCall): Promise<T>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    protected post<T>(post: PostI): Promise<T>;
    protected get<T>(get: GetI): Promise<T>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
