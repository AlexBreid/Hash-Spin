export interface JsonRpcCall {
    id: number | string;
    jsonrpc: string;
    method: string;
    params?: any[];
}
