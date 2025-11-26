import { JsonRpcCall, JsonRpcResponse } from '../../../dto';
import { BigNumber } from 'bignumber.js';
export declare const ARCHIVE_METHODS: string[];
export declare const POSSIBLE_ARCHIVE_METHODS: {
    method: string;
    index: number;
}[];
export declare const EvmUtils: {
    isArchiveMethod(rpc: JsonRpcCall): boolean;
    isParamForArchiveNode(param: unknown): boolean;
    toBigNumber(response: JsonRpcResponse<any>): JsonRpcResponse<BigNumber>;
    toDecodedString(response: JsonRpcResponse<any>): JsonRpcResponse<string>;
};
