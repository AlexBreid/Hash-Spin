import { TatumConnector } from '../../connector/tatum.connector';
import { AddressBalanceFilters } from '../../dto';
import { ResponseDto } from '../../util';
import { TatumConfig } from '../tatum';
import { CheckTokenOwner, CreateMultiTokenNftCollection, CreateNftCollectionBase, CreateNftEvmCollection, GetAllNftTransactionsByAddress, GetAllNftTransactionsQuery, GetCollection, GetNftMetadata, GetTokenOwner, MintNftWithMetadata, MintNftWithUrl, NftAddressBalance, NftTokenDetail, NftTransaction } from './nft.dto';
export declare class NftTezos {
    private readonly id;
    protected readonly connector: TatumConnector;
    protected readonly config: TatumConfig;
    constructor(id: string);
    /**
     * Create new NFT collection (Tzip12 compatible smart contract). This operation deploys a new smart contract to the blockchain and sets the owner of the collection.
     * You don't need to specify the default minter of the collection, as the owner of the collection is the default minter.
     * You don't have to have any funds on the address, as the smart contract is deployed by Tatum.
     * @param body Body of the request.
     * @returns ResponseDto<{txId: string}> Transaction ID of the deployment transaction. You can get the contract address from the transaction details using rpc.getContractAddress(transactionId) function, once transaction is included in the block.
     */
    createNftCollection(body: CreateNftCollectionBase): Promise<ResponseDto<{
        txId: string;
    }>>;
}
export declare class Nft {
    private readonly id;
    private readonly connector;
    private readonly config;
    private readonly ipfs;
    constructor(id: string);
    /**
     * Create new NFT collection (ERC-721 compatible smart contract). This operation deploys new smart contract to the blockchain and sets the owner of the collection.
     * You don't need to specify the default minter of the collection, as the owner of the collection is the default minter.
     * You don't have to have any funds on the address, as the smart contract is deployed by Tatum.
     * @param body Body of the request.
     * @returns ResponseDto<{txId: string}> Transaction ID of the deployment transaction. You can get the contract address from the transaction details using rpc.getContractAddress(transactionId) function, once transaction is included in the block.
     */
    createNftCollection(body: CreateNftEvmCollection): Promise<ResponseDto<{
        txId: string;
    }>>;
    /**
     * Create new MultiToken NFT collection (ERC-1155 compatible smart contract). This operation deploys new smart contract to the blockchain and sets the owner of the collection.
     * You don't need to specify the default minter of the collection, as the owner of the collection is the default minter.
     * You don't have to have any funds on the address, as the smart contract is deployed by Tatum.
     * @param body Body of the request.
     * @returns ResponseDto<{txId: string}> Transaction ID of the deployment transaction. You can get the contract address from the transaction details using rpc.getContractAddress(transactionId) function, once transaction is included in the block.
     */
    createMultiTokenNftCollection(body: CreateMultiTokenNftCollection): Promise<ResponseDto<{
        txId: string;
    }>>;
    /**
     * Mint new NFT (using ERC-721 compatible smart contract). This operation mints nft using smart contract on blockchain.
     * You don't need to specify the default minter of the collection, as the owner of the collection is the default minter.
     * You don't have to have any funds on the address, as the nft is minted by Tatum.
     * @param body Body of the request.
     * @returns ResponseDto<{txId: string}> Transaction ID of the mint transaction. {
     */
    mintNft(body: MintNftWithUrl): Promise<ResponseDto<{
        txId: string;
    }>>;
    /**
     * Mint new NFT (using ERC-721 compatible smart contract).
     * This operation uploads file to IPFS, prepares and uploads metadata to IPFS and mints nft using prepared metadata's IPFS url.
     * You don't need to specify the default minter of the collection, as the owner of the collection is the default minter.
     * You don't have to have any funds on the address, as the nft is minted by Tatum.
     * @param body Body of the request.
     * @returns ResponseDto<{txId: string}> Transaction ID of the mint transaction. {
     */
    mintNftWithMetadata(body: MintNftWithMetadata): Promise<ResponseDto<{
        txId: string;
    }>>;
    /**
     * Get balance of NFT for given address.
     * You can get balance of multiple addresses in one call.
     */
    getBalance({ page, pageSize, addresses, }: AddressBalanceFilters): Promise<ResponseDto<NftAddressBalance[]>>;
    /**
     * Get all transactions for given NFT.
     * @param nftTransactionsDetails  You can get multiple NFT transactions in one call.
     * @param page
     * @param pageSize
     */
    getAllNftTransactions({ page, pageSize, tokenId, tokenAddress, transactionType, fromBlock, toBlock, }: GetAllNftTransactionsQuery): Promise<ResponseDto<NftTransaction[]>>;
    /**
     * Get all transactions for given NFT.
     * @param nftTransactionsDetails  You can get multiple NFT transactions in one call.
     * @param page
     * @param pageSize
     */
    getAllNftTransactionsByAddress({ page, pageSize, addresses, tokenId, tokenAddress, transactionType, fromBlock, toBlock, }: GetAllNftTransactionsByAddress): Promise<ResponseDto<NftTransaction[]>>;
    /**
     * Get metadata of NFT.
     */
    getNftMetadata({ tokenAddress, tokenId, }: GetNftMetadata): Promise<ResponseDto<NftTokenDetail | null>>;
    /**
     * Get owner of a specific NFT.
     */
    getNftOwner({ tokenAddress, tokenId, pageSize, page, }: GetTokenOwner): Promise<ResponseDto<string[]>>;
    /**
     * Check if address is owner of a specific NFT.
     */
    checkNftOwner({ tokenAddress, tokenId, owner }: CheckTokenOwner): Promise<boolean>;
    /**
     * Get all NFTs in collection.
     */
    getNftsInCollection({ collectionAddress, pageSize, excludeMetadata, page, }: GetCollection): Promise<ResponseDto<NftTokenDetail[]>>;
}
