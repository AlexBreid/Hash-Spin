import { JsonRpcCall, JsonRpcResponse, UtxoBasedRpcSuite } from '../../../dto';
import { GenericRpc } from '../generic';
import { AbstractUtxoRpc } from './AbstractUtxoRpc';
export declare class UtxoRpc extends AbstractUtxoRpc implements UtxoBasedRpcSuite {
    readonly genericRpc: GenericRpc;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    rawRpcCall<T>(body: JsonRpcCall): Promise<T>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
