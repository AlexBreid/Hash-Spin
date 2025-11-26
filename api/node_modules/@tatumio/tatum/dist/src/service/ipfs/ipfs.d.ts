import { TatumConnector } from '../../connector/tatum.connector';
import { ResponseDto } from '../../util';
import { TatumConfig } from '../tatum';
import { GetFile, UploadFile } from './ipfs.dto';
export declare class Ipfs {
    private readonly id;
    protected readonly connector: TatumConnector;
    protected readonly config: TatumConfig;
    constructor(id: string);
    /**
     * Upload file to the IPFS storage.
     * @param body Body of the request with file to be uploaded.
     * @returns ResponseDto<{txId: string}> IPFS hash id of the uploaded file.
     */
    uploadFile(body: UploadFile): Promise<ResponseDto<{
        ipfsHash: string;
    }>>;
    /**
     * Get file binary data from the IPFS storage.
     * @param body Body of the request with file to be uploaded.
     * @returns Blob IPFS file binary data.
     * @returns ResponseDto<null> is error occurred.
     */
    getFile(body: GetFile): Promise<Blob | ResponseDto<null>>;
}
