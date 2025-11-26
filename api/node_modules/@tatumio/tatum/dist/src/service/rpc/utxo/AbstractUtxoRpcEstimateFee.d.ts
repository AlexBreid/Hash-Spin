import { JsonRpcResponse, UtxoBasedRpcInterfaceEstimateFee } from '../../../dto';
import { AbstractUtxoRpc } from './AbstractUtxoRpc';
export declare abstract class AbstractUtxoRpcEstimateFee extends AbstractUtxoRpc implements UtxoBasedRpcInterfaceEstimateFee {
    estimateFee(): Promise<JsonRpcResponse<any>>;
}
