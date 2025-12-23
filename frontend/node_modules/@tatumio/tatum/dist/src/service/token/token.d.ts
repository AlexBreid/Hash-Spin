import { AddressBalanceFilters } from '../../dto';
import { ResponseDto } from '../../util';
import { CreateFungibleToken, FungibleTokenBalance, GetAllFungibleTransactionsQuery, GetTokenMetadata, TokenMetadata, Transaction, TxIdResponse } from './token.dto';
export declare class Token {
    private readonly id;
    private readonly api;
    private readonly config;
    constructor(id: string);
    /**
     * Get balance of fungible tokens for given addresses.
     * You can get balance of multiple addresses in one call.
     */
    getBalance({ page, pageSize, addresses, }: AddressBalanceFilters): Promise<ResponseDto<FungibleTokenBalance[]>>;
    /**
     * Create new fungible collection (ERC-20 compatible smart contract). This operation deploys new smart contract to the blockchain and sets the owner of the token.
     * You don't need to specify the default minter of the collection, as the owner of the collection is the default minter.
     * You don't have to have any funds on the address, as the smart contract is deployed by Tatum.
     * @param body Body of the request.
     * @returns ResponseDto<{txId: string}> Transaction ID of the deployment transaction. You can get the contract address from the transaction details using rpc.getContractAddress(transactionId) function, once transaction is included in the block.
     */
    createNewFungibleToken(body: CreateFungibleToken): Promise<ResponseDto<TxIdResponse>>;
    /**
     * Get metadata of fungible token.
     */
    getTokenMetadata({ tokenAddress }: GetTokenMetadata): Promise<ResponseDto<TokenMetadata>>;
    /**
     * Get all token transactions for given address.
     * @param details  You can get multiple token transactions in one call.
     * @param page
     * @param pageSize
     */
    getAllFungibleTransactions({ page, pageSize, tokenAddress, addresses, transactionTypes, blockFrom, blockTo, }: GetAllFungibleTransactionsQuery): Promise<ResponseDto<Transaction[]>>;
}
