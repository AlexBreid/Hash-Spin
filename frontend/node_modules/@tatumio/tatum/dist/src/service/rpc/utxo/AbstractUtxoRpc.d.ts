import { JsonRpcResponse, UtxoBasedRpcInterface } from '../../../dto';
import { AbstractCommonUtxoRpc } from './AbstractCommonUtxoRpc';
export declare abstract class AbstractUtxoRpc extends AbstractCommonUtxoRpc implements UtxoBasedRpcInterface {
    protected abstract rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    getBlock(hashOrHeight: string, verbose?: 0 | 1 | 2): Promise<JsonRpcResponse<any>>;
}
