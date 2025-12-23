import { DogeRpcInterface, JsonRpcResponse } from '../../../dto';
import { AbstractCommonUtxoRpc } from './AbstractCommonUtxoRpc';
export declare abstract class AbstractDogeRpc extends AbstractCommonUtxoRpc implements DogeRpcInterface {
    protected abstract rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    getBlock(hashOrHeight: string, verbose?: boolean): Promise<JsonRpcResponse<any>>;
}
