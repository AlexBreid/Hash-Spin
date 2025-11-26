import { JsonRpcCall } from '../dto';
import { DefaultBodyType, DefaultParamsType, FileUploadRequest, GetUrl, SdkRequest } from './connector.dto';
export declare class TatumConnector {
    private readonly id;
    constructor(id: string);
    get<RESPONSE, PARAMS extends DefaultParamsType = DefaultParamsType>(request: GetUrl<PARAMS>): Promise<RESPONSE>;
    rpcCall<RESPONSE>(url: string, body: JsonRpcCall | JsonRpcCall[]): Promise<RESPONSE>;
    post<RESPONSE, BODY extends DefaultBodyType = DefaultBodyType>(request: SdkRequest<DefaultParamsType, BODY>): Promise<RESPONSE>;
    put<RESPONSE, BODY extends DefaultBodyType = DefaultBodyType>(request: SdkRequest<DefaultParamsType, BODY>): Promise<RESPONSE>;
    delete<RESPONSE>(request: GetUrl): Promise<RESPONSE>;
    uploadFile<RESPONSE>(request: FileUploadRequest): Promise<RESPONSE>;
    getFile<RESPONSE, PARAMS extends DefaultParamsType = DefaultParamsType>(request: GetUrl<PARAMS>): Promise<Blob>;
    private request;
    private getBaseUrl;
    private getUrl;
    private retry;
}
