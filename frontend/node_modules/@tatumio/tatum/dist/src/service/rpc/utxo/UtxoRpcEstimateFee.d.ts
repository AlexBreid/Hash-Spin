import { JsonRpcCall, JsonRpcResponse, UtxoBasedRpcSuiteEstimateFee } from '../../../dto';
import { GenericRpc } from '../generic';
import { AbstractUtxoRpcEstimateFee } from './AbstractUtxoRpcEstimateFee';
export declare class UtxoRpcEstimateFee extends AbstractUtxoRpcEstimateFee implements UtxoBasedRpcSuiteEstimateFee {
    readonly genericRpc: GenericRpc;
    constructor(id: string);
    protected rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    rawRpcCall<T>(body: JsonRpcCall): Promise<T>;
    destroy(): void;
    getRpcNodeUrl(): string;
}
