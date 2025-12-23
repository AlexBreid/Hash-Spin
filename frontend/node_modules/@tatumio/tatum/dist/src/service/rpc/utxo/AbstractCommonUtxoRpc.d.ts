import { JsonRpcResponse, UtxoBasedCommonRpcInterface } from '../../../dto';
export declare abstract class AbstractCommonUtxoRpc implements UtxoBasedCommonRpcInterface {
    protected abstract rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    createRawTransaction(inputs: any[], outputs: any, locktime: number, replaceable: boolean): Promise<JsonRpcResponse<string>>;
    decodeRawTransaction(hexstring: string): Promise<JsonRpcResponse<any>>;
    decodeScript(hexstring: string): Promise<JsonRpcResponse<any>>;
    estimateSmartFee(blocks: number, estimateMode?: string): Promise<JsonRpcResponse<any>>;
    getBestBlockHash(): Promise<JsonRpcResponse<string>>;
    getBlockChainInfo(): Promise<JsonRpcResponse<any>>;
    getBlockCount(): Promise<JsonRpcResponse<number>>;
    getBlockHash(height: number): Promise<JsonRpcResponse<string>>;
    getBlockHeader(hash: string, verbose?: boolean): Promise<JsonRpcResponse<any>>;
    getBlockStats(hash: string): Promise<JsonRpcResponse<any>>;
    getChainTips(): Promise<JsonRpcResponse<any>>;
    getDifficulty(): Promise<JsonRpcResponse<number>>;
    getMempoolAncestors(txId: string, verbose?: boolean): Promise<JsonRpcResponse<any>>;
    getMempoolDescendants(txId: string, verbose?: boolean): Promise<JsonRpcResponse<any>>;
    getMempoolEntry(txId: string): Promise<JsonRpcResponse<any>>;
    getMempoolInfo(): Promise<JsonRpcResponse<any>>;
    getRawMemPool(verbose?: boolean): Promise<JsonRpcResponse<any>>;
    getRawTransaction(txId: string, verbose?: boolean): Promise<JsonRpcResponse<any>>;
    getTxOut(txId: string, index: number, includeMempool?: boolean): Promise<JsonRpcResponse<any>>;
    getTxOutProof(txIds: string[], blockhash?: string): Promise<JsonRpcResponse<any>>;
    sendRawTransaction(hexstring: string): Promise<JsonRpcResponse<string>>;
    validateAddress(address: string): Promise<JsonRpcResponse<any>>;
    verifyMessage(address: string, signature: string, message: string): Promise<JsonRpcResponse<boolean>>;
    verifyTxOutProof(proof: string): Promise<JsonRpcResponse<any>>;
}
