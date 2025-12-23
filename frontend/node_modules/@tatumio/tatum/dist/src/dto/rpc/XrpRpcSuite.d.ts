import { AbstractRpcInterface } from './AbstractJsonRpcInterface';
/**
 * XRP RPC calls.
 */
export type LedgerIndex = 'validated' | 'closed' | 'current' | number;
export type Role = 'gateway' | 'user';
export type TxJson = Record<string, unknown>;
export type Transaction = string | TxJson;
export interface Currency {
    currency: string;
    issuer?: string;
}
export interface CurrencyWithValue extends Currency {
    value: string;
}
export type CurrencyAmount = string | CurrencyWithValue;
export interface Pagination {
    limit?: number;
    marker?: unknown;
}
export interface Ledger {
    ledgerHash?: string;
    ledgerIndex?: LedgerIndex;
}
export interface QueueOption {
    queue?: boolean;
}
export interface StrictOption {
    strict?: boolean;
}
export interface TypeOption {
    type?: string;
}
export interface LedgerBinaryOption {
    binary?: boolean;
}
export interface FailOption {
    failHard?: boolean;
}
export interface Secrets {
    secret?: string;
    seed?: string;
    seedHex?: string;
    passphrase?: string;
    keyType?: string;
}
export interface AutoFilling {
    offline?: boolean;
    buildPath?: boolean;
    feeMultMax?: number;
    feeDivMax?: number;
}
export type AccountChannelsOptions = Ledger & Pagination & {
    destinationAccount?: string;
};
export type AccountInfoOptions = Ledger & QueueOption & StrictOption & {
    signerLists?: boolean;
};
export type AccountLinesOptions = Ledger & Pagination & {
    peer?: string;
};
export type AccountObjectsOptions = Ledger & Pagination & TypeOption & {
    deletionBlockersOnly?: boolean;
};
export type AccountTxOptions = Ledger & Pagination & {
    ledgerIndexMin?: number;
    ledgerIndexMax?: number;
    binary?: boolean;
    forward?: boolean;
};
export type GatewayBalancesOptions = Ledger & StrictOption & {
    hotwallet?: string | string[];
};
export type NorippleCheckOptions = Ledger & {
    transactions?: boolean;
    limit?: number;
};
export type LedgerOptions = Ledger & LedgerBinaryOption & QueueOption & TypeOption & {
    full?: boolean;
    accounts?: boolean;
    transactions?: boolean;
    expand?: boolean;
    ownerFunds?: boolean;
};
export type LedgerEntryOptions = Ledger & LedgerBinaryOption & {
    index?: string;
    accountRoot?: string;
    directory?: string | Record<string, string | number>;
    offer?: string | Record<string, string | number>;
    rippleState?: Record<string, string | string[]>;
    check?: string;
    escrow?: string | Record<string, string | number>;
    paymentChannel?: string;
    depositPreauth?: string | Record<string, string>;
    ticket?: string | Record<string, string | number>;
    nftPage?: string;
};
export type TxOptions = {
    binary?: boolean;
    minLedger?: number;
    maxLedger?: number;
};
export type BookOffersOptions = Ledger & Pagination & {
    taker?: string;
};
export type RipplePathFindOptions = Ledger & {
    sendMax?: CurrencyAmount;
    sourceCurrencies?: Currency[];
};
export interface XrpRpcSuite extends XrpRpcInterface, AbstractRpcInterface {
}
export interface XrpRpcInterface {
    /**
     * Retrieves channels of a given account.
     * @param account - The account to retrieve channels from.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-account-methods/account_channels
     */
    accountChannels(account: string, options?: AccountChannelsOptions): Promise<any>;
    /**
     * Retrieves currencies of a given account.
     * @param account - The account to retrieve currencies from.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-account-methods/account_currencies
     */
    accountCurrencies(account: string, options?: Ledger & StrictOption): Promise<any>;
    /**
     * Retrieves information about a given account.
     * @param account - The account to retrieve information about.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-account-methods/account_info
     */
    accountInfo(account: string, options?: AccountInfoOptions): Promise<any>;
    /**
     * Retrieves trust lines connected to an account.
     * @param account - The account to retrieve trust lines from.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-account-methods/account_lines
     */
    accountLines(account: string, options?: AccountLinesOptions): Promise<any>;
    /**
     * Retrieves non-fungible tokens (NFTs) owned by an account.
     * @param account - The account to retrieve NFTs from.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-account-methods/account_nfts
     */
    accountNfts(account: string, options?: Ledger & Pagination): Promise<any>;
    /**
     * Retrieves the objects owned by an account on the ledger.
     * @param account - The account to retrieve ledger objects from.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-account-methods/account_objects
     */
    accountObjects(account: string, options?: AccountObjectsOptions): Promise<any>;
    /**
     * Retrieves outstanding offers by a given account.
     * @param account - The account to retrieve offers from.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-account-methods/account_offers
     */
    accountOffers(account: string, options?: Ledger & Pagination & StrictOption): Promise<any>;
    /**
     * Retrieves a list of transactions affecting an account.
     * @param account - The account to retrieve transactions from.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-account-methods/account_tx
     */
    accountTx(account: string, options?: AccountTxOptions): Promise<any>;
    /**
     * Calculates the total balances issued by an account.
     * @param account - The account to retrieve balances from.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-account-methods/gateway_balances
     */
    gatewayBalances(account: string, options?: GatewayBalancesOptions): Promise<any>;
    /**
     * Checks potential issues with an account's NoRipple settings.
     * @param account - The account to check NoRipple settings.
     * @param role - The role of the account ("user", "gateway", or "issuer").
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-account-methods/noripple_check
     */
    norippleCheck(account: string, role: Role, options?: NorippleCheckOptions): Promise<any>;
    /**
     * Retrieves information about a particular ledger.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-ledger-methods/ledger
     */
    ledger(options?: LedgerOptions): Promise<any>;
    /**
     * Retrieves information about the most recently closed ledger.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-ledger-methods/ledger_closed
     */
    ledgerClosed(): Promise<any>;
    /**
     * Retrieves information about the current in-progress ledger.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-ledger-methods/ledger_current
     */
    ledgerCurrent(): Promise<any>;
    /**
     * Retrieves information about the contents of a ledger.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-ledger-methods/ledger_data
     */
    ledgerData(options?: Ledger & LedgerBinaryOption & Pagination & TypeOption): Promise<any>;
    /**
     * Retrieves a specific object from a ledger.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-ledger-methods/ledger_entry
     */
    ledgerEntry(options?: LedgerEntryOptions): Promise<any>;
    /**
     * Submits a transaction to the XRP Ledger.
     * @param tx - Transaction to submit.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-transaction-methods/submit
     */
    submit(tx: Transaction, options?: Secrets & FailOption & AutoFilling): Promise<any>;
    /**
     * Submits a multi-signed transaction to the XRP Ledger.
     * @param txJson - Transaction JSON to submit.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-transaction-methods/submit_multisigned
     */
    submitMultisigned(txJson: TxJson, options?: FailOption): Promise<any>;
    /**
     * Retrieves information about a particular transaction by its hash.
     * @param txHash - The transaction hash.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-transaction-methods/transaction_entry
     */
    transactionEntry(txHash: string, options?: Ledger): Promise<any>;
    /**
     * Retrieves information about a particular transaction by its ID.
     * @param transaction - The transaction ID.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-transaction-methods/tx
     */
    tx(transaction: string, options?: TxOptions): Promise<any>;
    /**
     * Retrieves historical transactions.
     * @param start - The starting point for history retrieval.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-transaction-methods/tx_history
     */
    txHistory(start: number): Promise<any>;
    /**
     * Signs a transaction in preparation for submission to the XRP Ledger.
     * @param txJson - The transaction JSON.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-transaction-methods/sign
     */
    sign(txJson: TxJson, options?: Secrets & AutoFilling): Promise<any>;
    /**
     * Signs a transaction for a specific account.
     * @param account - The account for which to sign the transaction.
     * @param txJson - The transaction JSON.
     * @param options - Secrets for signing the transaction.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-transaction-methods/sign_for
     */
    signFor(account: string, txJson: TxJson, options?: Secrets): Promise<any>;
    /**
     * Retrieves the order book for a specific currency pair.
     * @param takerGets - The currency that the taker would get.
     * @param takerPays - The currency that the taker would pay.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-path-and-order-book-methods/book_offers
     */
    bookOffers(takerGets: Currency, takerPays: Currency, options?: BookOffersOptions): Promise<any>;
    /**
     * Checks if a deposit is authorized between two accounts.
     * @param sourceAccount - The source account.
     * @param destinationAccount - The destination account.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-path-and-order-book-methods/deposit_authorized
     */
    depositAuthorized(sourceAccount: string, destinationAccount: string, options?: Ledger): Promise<any>;
    /**
     * Retrieves buy offers for a specific NFT.
     * @param nftId - The ID of the NFT.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-path-and-order-book-methods/nft_buy_offers
     */
    nftBuyOffers(nftId: string, options?: Ledger & Pagination): Promise<any>;
    /**
     * Retrieves sell offers for a specific NFT.
     * @param nftId - The ID of the NFT.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-path-and-order-book-methods/nft_sell_offers
     */
    nftSellOffers(nftId: string, options?: Ledger & Pagination): Promise<any>;
    /**
     * Finds the best path for a payment from the source account to the destination account for a specific amount.
     * @param sourceAccount - The source account.
     * @param destinationAccount - The destination account.
     * @param destinationAmount - The amount to be delivered to the destination account.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-path-and-order-book-methods/ripple_path_find
     */
    ripplePathFind(sourceAccount: string, destinationAccount: string, destinationAmount: CurrencyAmount, options?: RipplePathFindOptions): Promise<any>;
    /**
     * Authorizes a specific amount against a payment channel.
     * @param amount - The amount to authorize.
     * @param channelId - The ID of the channel.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-payment-channel-methods/channel_authorize
     */
    channelAuthorize(amount: string, channelId: string, options?: Secrets): Promise<any>;
    /**
     * Verifies a signature against a specific amount and channel.
     * @param amount - The amount to verify.
     * @param channelId - The ID of the channel.
     * @param publicKey - The public key used for signature.
     * @param signature - The signature to verify.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-payment-channel-methods/channel_verify
     */
    channelVerify(amount: string, channelId: string, publicKey: string, signature: string): Promise<any>;
    /**
     * Retrieves information about current fee rates.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-server-info-methods/fee
     */
    fee(): Promise<any>;
    /**
     * Retrieves information about the server.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-server-info-methods/server_info
     */
    serverInfo(): Promise<any>;
    /**
     * Retrieves the current state of the server.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-server-info-methods/server_state
     */
    serverState(): Promise<any>;
    /**
     * Retrieves the manifest of a specific public key.
     * @param publicKey - The public key for which the manifest is requested.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-server-info-methods/manifest
     */
    manifest(publicKey: string): Promise<any>;
    /**
     * Sends a ping to the server.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-utility-methods/ping
     */
    ping(): Promise<any>;
    /**
     * Generates a random number using server's random number generator.
     * https://docs.tatum.com/docs/rpc-api-reference/xrp-rpc-documentation/api-calls-for-utility-methods/random
     */
    random(): Promise<any>;
}
