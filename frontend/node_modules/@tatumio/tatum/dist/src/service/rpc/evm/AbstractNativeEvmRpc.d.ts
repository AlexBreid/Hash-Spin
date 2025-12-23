import { BigNumber } from 'bignumber.js';
import { BlockNumber, JsonRpcResponse, LogFilter, TxPayload } from '../../../dto';
import { NativeEvmBasedRpcInterface } from '../../../dto/rpc/NativeEvmBasedRpcInterface';
import { AbstractEvmRpc } from './AbstractEvmRpc';
export declare abstract class AbstractNativeEvmRpc extends AbstractEvmRpc implements NativeEvmBasedRpcInterface {
    protected abstract rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    protected abstract getNativePrefix(): string;
    private nativeRpcCall;
    blockNumber(nativePrefix?: boolean): Promise<JsonRpcResponse<any>>;
    chainId(nativePrefix?: boolean): Promise<JsonRpcResponse<BigNumber>>;
    estimateGas(callObject: TxPayload, nativePrefix?: boolean): Promise<JsonRpcResponse<BigNumber>>;
    gasPrice(nativePrefix?: boolean): Promise<JsonRpcResponse<BigNumber>>;
    maxPriorityFeePerGas(nativePrefix?: boolean): Promise<JsonRpcResponse<BigNumber>>;
    getBalance(address: string, blockNumber?: BlockNumber, nativePrefix?: boolean): Promise<JsonRpcResponse<BigNumber>>;
    getBlockByHash(blockHash: string, includeTransactions?: boolean, nativePrefix?: boolean): Promise<JsonRpcResponse<any>>;
    getBlockTransactionCountByHash(blockHash: string, nativePrefix?: boolean): Promise<JsonRpcResponse<number>>;
    getBlockByNumber(blockNumber: BlockNumber, full?: boolean, nativePrefix?: boolean): Promise<JsonRpcResponse<any>>;
    getBlockTransactionCountByNumber(blockNumber: BlockNumber, nativePrefix?: boolean): Promise<JsonRpcResponse<number>>;
    getCode(address: string, blockNumber?: BlockNumber, nativePrefix?: boolean): Promise<JsonRpcResponse<string>>;
    getLogs(filter: LogFilter, nativePrefix?: boolean): Promise<JsonRpcResponse<any>>;
    getStorageAt(address: string, position: string, blockNumber?: BlockNumber, nativePrefix?: boolean): Promise<JsonRpcResponse<string>>;
    getTransactionByBlockHashAndIndex(blockHash: string, index: number, nativePrefix?: boolean): Promise<JsonRpcResponse<any>>;
    getTransactionByBlockNumberAndIndex(blockNumber: string | number, index: number, nativePrefix?: boolean): Promise<JsonRpcResponse<any>>;
    getTransactionByHash(txHash: string, nativePrefix?: boolean): Promise<JsonRpcResponse<any>>;
    getTransactionCount(address: string, blockNumber?: BlockNumber, nativePrefix?: boolean): Promise<JsonRpcResponse<BigNumber>>;
    getTransactionReceipt(transactionHash: string, nativePrefix?: boolean): Promise<JsonRpcResponse<any>>;
    sendRawTransaction(signedTransactionData: string, nativePrefix?: boolean): Promise<JsonRpcResponse<string>>;
}
