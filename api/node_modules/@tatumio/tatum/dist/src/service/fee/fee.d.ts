import { ResponseDto } from '../../util/';
import { CurrentEvmFee, CurrentUtxoFee } from './fee.dto';
export interface FeeService<T> {
    getCurrentFee(): Promise<ResponseDto<T>>;
}
export declare class FeeUtxo implements FeeService<CurrentUtxoFee> {
    private readonly id;
    private readonly connector;
    private readonly config;
    constructor(id: string);
    getCurrentFee(): Promise<ResponseDto<CurrentUtxoFee>>;
}
export declare class FeeEvm implements FeeService<CurrentEvmFee> {
    private readonly id;
    private readonly connector;
    private readonly config;
    constructor(id: string);
    getCurrentFee(): Promise<ResponseDto<CurrentEvmFee>>;
    private static mapGasPrice;
}
