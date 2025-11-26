import { TatumConnector } from '../../../connector/tatum.connector';
import { JsonRpcCall, JsonRpcResponse } from '../../../dto';
import { AbstractRpcInterface } from '../../../dto/rpc/AbstractJsonRpcInterface';
import { TatumConfig } from '../../tatum';
export declare abstract class AbstractBatchRpc implements AbstractRpcInterface {
    private readonly id;
    protected readonly connector: TatumConnector;
    protected readonly config: TatumConfig;
    protected constructor(id: string);
    getRpcNodeUrl(subPath?: string): string;
    rawRpcCall(body: JsonRpcCall): Promise<JsonRpcResponse<any>>;
    rawBatchRpcCall(body: JsonRpcCall[]): Promise<JsonRpcResponse<any>[] | JsonRpcResponse<any>>;
    destroy(): void;
}
