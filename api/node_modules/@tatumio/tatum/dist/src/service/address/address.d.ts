import { AddressBalanceFilters, AddressBalanceFiltersTezos, AddressBalanceFiltersTron } from '../../dto';
import { ResponseDto } from '../../util';
import { AddressBalance, AddressTransaction, AddressTransactionUTXO, GetAddressTransactionsQuery, GetAddressTransactionsQueryTezos } from './address.dto';
export declare class AddressTezos {
    private readonly id;
    private readonly connector;
    private readonly config;
    constructor(id: string);
    /**
     * Get balance of all tokens for a given Tezos address.
     */
    getBalance({ address, tokenTypes, page, pageSize, }: AddressBalanceFiltersTezos): Promise<ResponseDto<AddressBalance[]>>;
    /**
     * Get all transactions, that are related to the given address. It could be both incoming and outgoing transactions.
     */
    getTransactions({ address, transactionDirection, fromBlock, toBlock, pageSize, page, cursor, }: GetAddressTransactionsQueryTezos): Promise<ResponseDto<{
        result: AddressTransaction[];
        prevPage: string;
        nextPage: string;
    }>>;
}
export declare class AddressTron {
    private readonly id;
    private readonly connector;
    private readonly config;
    constructor(id: string);
    /**
     * Get balance of all tokens for a given address.
     */
    getBalance({ address }: AddressBalanceFiltersTron): Promise<ResponseDto<AddressBalance[]>>;
    private getFullBalance;
    private processTRC20TokenBalanceDetails;
}
export declare class Address {
    private readonly id;
    private readonly connector;
    private readonly config;
    constructor(id: string);
    /**
     * Get balance of all tokens for a given address.
     * You can get balance of multiple addresses in one call.
     */
    getBalance({ page, pageSize, addresses, tokenTypes, }: AddressBalanceFilters): Promise<ResponseDto<AddressBalance[]>>;
    /**
     * Get all transactions, that are related to the given address. It could be both incoming and outgoing transactions.
     */
    getTransactions({ address, transactionDirection, transactionTypes, fromBlock, toBlock, pageSize, page, tokenAddress, }: GetAddressTransactionsQuery): Promise<ResponseDto<(AddressTransaction | AddressTransactionUTXO)[]>>;
    private processTokenBalanceDetails;
    private processUtxoBasedTxs;
    private getNativeBalance;
}
