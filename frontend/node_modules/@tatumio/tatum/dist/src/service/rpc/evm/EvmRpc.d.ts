import { JsonRpcCall, JsonRpcResponse } from '../../../dto';
import { Logger } from '../../../service/logger/logger.types';
import { GenericRpc } from '../generic/GenericRpc';
import { AbstractEvmRpc } from './AbstractEvmRpc';
export declare class EvmRpc extends AbstractEvmRpc {
    readonly genericRpc: GenericRpc;
    protected readonly logger: Logger;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawRpcCall<T>(body: JsonRpcCall): Promise<T>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
}
