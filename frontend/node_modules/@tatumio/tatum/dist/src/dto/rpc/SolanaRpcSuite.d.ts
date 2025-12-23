import { JsonRpcResponse } from '../JsonRpcResponse.dto';
import { AbstractRpcInterface } from './AbstractJsonRpcInterface';
export interface SolanaAccountInfo {
    lamports: number;
    owner: string;
    data: string;
    executable: boolean;
    rentEpoch: number;
    size: number;
}
export interface SolanaMint {
    mint: string;
}
export interface SolanaProgramId {
    programId: string;
}
export interface SolanaVersion {
    'solana-core': string;
    'feature-set': string;
}
export interface SolanaEpochInfo {
    absoluteSlot: number;
    blockHeight: number;
    epoch: number;
    slotIndex: number;
    slotsInEpoch: number;
    transactionCount: number;
}
export interface SolanaEpochSchedule {
    slotsPerEpoch: number;
    leaderScheduleSlotOffset: number;
    warmup: boolean;
    firstNormalEpoch: number;
    firstNormalSlot: number;
}
export interface SolanaLeaderSchedule {
    [pubkey: string]: number[];
}
export interface SolanaTransaction {
    slot: number;
    transaction: any;
    meta: any;
    blockTime: number | null;
    version: number | string | null;
}
export interface SolanaVoteAccount {
    votePubkey: string;
    nodePubkey: string;
    activatedStake: number;
    epochVoteAccount: boolean;
    commission: number;
    lastVote: number;
    epochCredits: Array<[number, number, number]>;
    rootSlot: number;
}
export declare enum Commitment {
    Processed = "processed",
    Confirmed = "confirmed",
    Finalized = "finalized"
}
export declare enum Encoding {
    Base58 = "base58",
    Base64 = "base64",
    Base64_ZSTD = "base64+zstd",
    JsonParsed = "jsonParsed"
}
export declare enum TransactionDetails {
    Full = "full",
    Accounts = "accounts",
    Signatures = "signatures",
    None = "none"
}
export type SolanaTypeWithContext<T> = {
    context: {
        slot: number;
    };
    value: T;
};
export type SolanaBlockProduction = {
    byIdentity: {
        [key: string]: Array<number>;
    };
    range: {
        firstSlot: number;
        lastSlot: number;
    };
};
export type SolanaSignatureStatus = {
    slot: number;
    confirmations: number | null;
    err: any | null;
    confirmationStatus: string | null;
};
export type SolanaInflationReward = {
    epoch: number;
    effectiveSlot: number;
    amount: number;
    postBalance: number;
    commission: number;
};
export type SolanaLargestAccount = {
    address: string;
    lamports: number;
};
export type SolanaLatestBlockhash = {
    blockhash: string;
    lastValidBlockHeight: number;
};
export type SolanaSupply = {
    circulating: number;
    nonCirculating: number;
    nonCirculatingAccounts: Array<string>;
    total: number;
};
export type SolanaTokenAccountBalance = {
    amount: number;
    decimals: number;
    uiAmount: number | null;
    uiAmountString: string;
};
export type SolanaAccount = {
    address: string;
    amount: number;
    decimals: number;
    uiAmount: number | null;
    uiAmountString: string;
};
export type SolanaTokenAccount = {
    account: SolanaAccountInfo;
    pubkey: string;
};
export type SolanaTokenSupply = {
    amount: string;
    decimals: number;
    uiAmount: number | null;
    uiAmountString: string;
};
export type SolanaTransactionSimulation = {
    err: any;
    accounts: Array<any> | null;
    unitsConsumed: number | null;
    returnData: {
        programId: string;
        data: Array<string>;
    };
};
export type SolanaBlock = {
    blockhash: string;
    previousBlockhash: string;
    parentSlot: number;
    transactions: Array<any>;
    signatures: Array<any>;
    rewards: Array<any> | undefined;
    blockTime: number | null;
    blockHeight: number | null;
};
export type GetAccountInfoOptions = {
    commitment?: Commitment;
    encoding?: Encoding;
};
export type GetBlockOptions = {
    commitment?: Commitment;
    encoding?: Encoding;
    transactionDetails?: TransactionDetails;
    maxSupportedTransactionVersion?: number;
    rewards?: boolean;
};
export type GetBlockProductionOptions = {
    commitment?: Commitment;
    identity?: string;
    range?: {
        firstSlot: number;
        lastSlot: number;
    };
};
export type GetMultipleAccountsOptions = {
    commitment?: Commitment;
    minContextSlot?: number;
    dataSlice?: {
        offset: number;
        length: number;
    };
    encoding?: Encoding;
};
export type GetProgramAccountsOptions = {
    commitment?: Commitment;
    minContextSlot?: number;
    withContext?: boolean;
    encoding?: Encoding;
    dataSlice?: {
        offset: number;
        length: number;
    };
    filters?: Array<{
        memcmp: {
            offset: number;
            bytes: string;
        };
    } | {
        dataSize: number;
    }>;
};
export type GetSignaturesForAddressOptions = {
    commitment?: Commitment;
    minContextSlot?: number;
    limit?: number;
    before?: string;
    until?: string;
};
export type GetSignatureStatusesOptions = {
    searchTransactionHistory?: boolean;
};
export type GetTokenAccountsOptions = {
    commitment?: Commitment;
    minContextSlot?: number;
    dataSlice?: {
        offset: number;
        length: number;
    };
    encoding?: Encoding;
};
export type SimulateTransactionOptions = {
    commitment?: Commitment;
    sigVerify?: boolean;
    replaceRecentBlockhash?: boolean;
    minContextSlot?: number;
    encoding?: Encoding;
    accounts: {
        addresses: Array<string>;
        encoding?: Encoding;
    };
};
export type GetCommitmentOptions = {
    commitment?: Commitment;
};
export type GetCommitmentMinContextSlotOptions = {
    commitment?: Commitment;
    minContextSlot?: number;
};
export type GetInflationRewardOptions = {
    commitment?: Commitment;
    epoch?: number;
    minContextSlot?: number;
};
export type GetLargestAccountsOptions = {
    commitment?: Commitment;
    filter?: 'circulating' | 'nonCirculating';
};
export type GetLeaderScheduleOptions = {
    commitment?: Commitment;
    identity?: string;
};
export type GetStakeActivationOptions = {
    commitment?: Commitment;
    minContextSlot?: number;
    epoch?: number;
};
export type GetSupplyOptions = {
    commitment?: Commitment;
    excludeNonCirculatingAccountsList?: boolean;
};
export type GetVoteAccountOptions = {
    commitment?: Commitment;
    votePubkey?: string;
    keepUnstakedDelinquents?: boolean;
    delinquentSlotDistance?: number;
};
export type GetTransactionOptions = {
    commitment?: Commitment;
    maxSupportedTransactionVersion?: number;
    encoding: Encoding;
};
export type SendTransactionOptions = {
    encoding?: Encoding;
    skipPreflight?: boolean;
    preflightCommitment?: Commitment;
    maxRetries?: number;
    minContextSlot?: number;
};
export type SolanaClusterNode = {
    pubkey: string;
    gossip?: string;
    tpu?: string;
    rpc?: string;
    version?: string;
    featureSet?: number;
    shredVersion?: number;
};
export type SolanaInflationGovernor = {
    initial: number;
    terminal: number;
    taper: number;
    foundation: number;
    foundationTerm: number;
};
export type SolanaPerformanceSample = {
    slot: number;
    numTransactions: number;
    numSlots: number;
    samplePeriodSecs: number;
    numNonVoteTransaction: number;
};
export type SolanaAddressSignature = {
    signature: string;
    slot: number;
    err: any | null;
    memo: string | null;
    blockTime: number | null;
    confirmationStatus: string | null;
};
export type SolanaInflationRate = {
    total: number;
    validator: number;
    foundation: number;
    epoch: number;
};
export interface SolanaRpcSuite extends SolanaRpcInterface, AbstractRpcInterface {
}
export interface SolanaRpcInterface {
    /**
     * Get info about the account on the Solana blockchain.
     * @param pubkey - Pubkey of account to query, as base-58 encoded string
     * @param options - Options for the query
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-account-information/getaccountinfo
     */
    getAccountInfo: (pubkey: string, options?: GetAccountInfoOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaAccountInfo | null>>>;
    /**
     * Get balance of the account on the Solana blockchain.
     * @param publicKey - Pubkey of account to query, as base-58 encoded string
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-account-information/getbalance
     */
    getBalance: (publicKey: string) => Promise<JsonRpcResponse<SolanaTypeWithContext<number>>>;
    /**
     * Get the latest block height.
     * @param options - Options for the query
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getblockheight
     */
    getBlockHeight: (options?: GetCommitmentMinContextSlotOptions) => Promise<JsonRpcResponse<number>>;
    /**
     * Get information about a specific block.
     * @param block - Block number, identified by Slot
     * @param options - Options for the query
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getblock
     */
    getBlock: (block: number, options?: GetBlockOptions) => Promise<JsonRpcResponse<SolanaBlock | null>>;
    /**
     * Get block production information.
     * @param options - Options for the query
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getblockproduction
     */
    getBlockProduction: (options?: GetBlockProductionOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaBlockProduction>>>;
    /**
     * Get block commitment information.
     * @param block - Block number, identified by Slot
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getblockcommitment
     */
    getBlockCommitment: (block: number) => Promise<JsonRpcResponse<{
        commitment: Array<number>;
        totalStake: number;
    }>>;
    /**
     * Get blocks information.
     * @param startSlot - Block number, identified by Slot
     * @param endSlot - Block number, identified by Slot
     * @param options - Options for the query
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getblocks
     */
    getBlocks: (startSlot: number, endSlot?: number, options?: GetCommitmentOptions) => Promise<JsonRpcResponse<Array<number>>>;
    /**
     * Get blocks information.
     * @param startSlot - Block number, identified by Slot
     * @param limit - Number of blocks to return
     * @param options - Options for the query
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getBlocksWithLimit
     */
    getBlocksWithLimit: (startSlot: number, limit?: number, options?: GetCommitmentOptions) => Promise<JsonRpcResponse<Array<number>>>;
    /**
     * Get block time information.
     * @param block - Block number, identified by Slot
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getblocktime
     */
    getBlockTime: (block: number) => Promise<JsonRpcResponse<number | null>>;
    /**
     * Get cluster nodes information.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getclusternodes
     */
    getClusterNodes: () => Promise<JsonRpcResponse<Array<SolanaClusterNode>>>;
    /**
     * Get information about epoch.
     * @param options - Options for the query
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getepochinfo
     */
    getEpochInfo: (options?: GetCommitmentMinContextSlotOptions) => Promise<JsonRpcResponse<SolanaEpochInfo>>;
    /**
     * Get epoch schedule.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getepochschedule
     */
    getEpochSchedule: () => Promise<JsonRpcResponse<SolanaEpochSchedule>>;
    /**
     * Retrieve the minimum fee required to include a message in a block.
     * @param message - The base-64 encoded message to query.
     * @param options - Options for the query.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-transaction-management/getfeeformessage
     */
    getFeeForMessage: (message: any, options?: GetCommitmentMinContextSlotOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<number | null>>>;
    /**
     * Get the first available block on the Solana blockchain.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getfirstavailableblock
     */
    getFirstAvailableBlock: () => Promise<JsonRpcResponse<number>>;
    /**
     * Get the Genesis Hash of the Solana blockchain.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getgenesishash
     */
    getGenesisHash: () => Promise<JsonRpcResponse<string>>;
    /**
     * Get the health status of the Solana cluster.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/gethealth
     */
    getHealth: () => Promise<JsonRpcResponse<string>>;
    /**
     * Get the highest available snapshot slot on the Solana cluster.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/gethighestsnapshotslot
     */
    getHighestSnapshotSlot: () => Promise<JsonRpcResponse<{
        full: number;
        incremental: number;
    }>>;
    /**
     * Get the identity pubkey of the node.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getidentity
     */
    getIdentity: () => Promise<JsonRpcResponse<{
        identity: string;
    }>>;
    /**
     * Get the current inflation governor's rates.
     * @param options - Options for the query.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-token-and-stake-information/getinflationgovernor
     */
    getInflationGovernor: (options?: GetCommitmentOptions) => Promise<JsonRpcResponse<SolanaInflationGovernor>>;
    /**
     * Get the current inflation rate on the Solana blockchain.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-token-and-stake-information/getinflationrate
     */
    getInflationRate: () => Promise<JsonRpcResponse<SolanaInflationRate>>;
    /**
     * Get the inflation reward for specified addresses.
     * @param addresses - An array of addresses to query, as base-58 encoded strings.
     * @param options - Options for the query.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-token-and-stake-information/getinflationreward
     */
    getInflationReward: (addresses?: string[], options?: GetInflationRewardOptions) => Promise<JsonRpcResponse<SolanaInflationReward[]>>;
    /**
     * Get the largest accounts on the Solana blockchain.
     * @param options Options for the query.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-account-information/getlargestaccounts
     */
    getLargestAccounts: (options?: GetLargestAccountsOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaLargestAccount[]>>>;
    /**
     * Fetches the latest block hash from the Solana blockchain.
     * @param options - Options for the query.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getlatestblockhash
     */
    getLatestBlockhash: (options?: GetCommitmentMinContextSlotOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaLatestBlockhash>>>;
    /**
     * Fetches the leader schedule for the Solana blockchain.
     * @param slot - The slot number corresponding to the epoch for which to fetch the leader schedule. If unspecified, the schedule for the current epoch is fetched.
     * @param options - The options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getleaderschedule
     */
    getLeaderSchedule: (slot?: number, options?: GetLeaderScheduleOptions) => Promise<JsonRpcResponse<SolanaLeaderSchedule | null>>;
    /**
     * Retrieves the max slot number seen from retransmit stage.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getmaxretransmitslot
     */
    getMaxRetransmitSlot: () => Promise<JsonRpcResponse<number>>;
    /**
     * Retrieves the max slot number seen from after shred insert.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getmaxshredinsertslot
     */
    getMaxShredInsertSlot: () => Promise<JsonRpcResponse<number>>;
    /**
     * Gets the minimum balance required for rent exemption for an account.
     * @param dataSize - The account's data length.
     * @param options - The options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getminimumbalanceforrentexemption
     */
    getMinimumBalanceForRentExemption: (dataSize?: number, options?: GetCommitmentOptions) => Promise<JsonRpcResponse<number>>;
    /**
     * Fetches multiple accounts on the Solana blockchain.
     * @param pubKeys - An array of pubkeys to query, as base-58 encoded strings. (up to a maximum of 100)
     * @param options - The options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-account-information/getmultipleaccounts
     */
    getMultipleAccounts: (pubKeys: string[], options?: GetMultipleAccountsOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<Array<SolanaAccountInfo | null>>>>;
    /**
     * Fetches program accounts from the Solana blockchain.
     * @param programId - The Pubkey of the program, as a base-58 encoded string.
     * @param options - The options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-account-information/getprogramaccounts
     */
    getProgramAccounts: (programId: string, options?: GetProgramAccountsOptions) => Promise<JsonRpcResponse<Array<{
        account: SolanaAccountInfo;
        pubkey: string;
    }>>>;
    /**
     * Gets recent performance samples.
     * @param limit - Number of samples to return (maximum 720).
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getrecentperformancesamples
     */
    getRecentPerformanceSamples: (limit?: number) => Promise<JsonRpcResponse<Array<SolanaPerformanceSample>>>;
    /**
     * Gets recent prioritization fees.
     * @param addresses - An array of account addresses (up to a maximum of 128 addresses), as base-58 encoded strings.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getrecentprioritizationfees
     */
    getRecentPrioritizationFees: (addresses?: string[]) => Promise<JsonRpcResponse<Array<{
        slot: number;
        prioritizationFee: number;
    }>>>;
    /**
     * Fetches the transaction signatures for a specific account address.
     * @param address - Account address as a base-58 encoded string.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-transaction-management/getsignaturesforaddress
     */
    getSignaturesForAddress: (address: string, options?: GetSignaturesForAddressOptions) => Promise<JsonRpcResponse<Array<SolanaAddressSignature>>>;
    /**
     * Fetches the status of a list of transaction signatures.
     * @param signatures - An array of transaction signatures to confirm, as base-58 encoded strings (up to a maximum of 256).
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-transaction-management/getsignaturestatuses
     */
    getSignatureStatuses: (signatures?: string[], options?: GetSignatureStatusesOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaSignatureStatus>>>;
    /**
     * Fetches the current slot number of the cluster.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getslot
     */
    getSlot: (options?: GetCommitmentMinContextSlotOptions) => Promise<JsonRpcResponse<number>>;
    /**
     * Fetches the current leader of the slot.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getslotleader
     */
    getSlotLeader: (options?: GetCommitmentMinContextSlotOptions) => Promise<JsonRpcResponse<string>>;
    /**
     * Fetches the current leaders of the slot within a certain limit.
     * @param startSlot - Optional parameter for starting slot.
     * @param limit - Limit (between 1 and 5,000)
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/getslotleaders
     */
    getSlotLeaders: (startSlot?: number, limit?: number) => Promise<JsonRpcResponse<Array<string>>>;
    /**
     * Fetches the stake activation details for the specified account.
     * @param pubkey - Pubkey of stake Account to query, as base-58 encoded string.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-token-and-stake-information/getstakeactivation
     */
    getStakeActivation: (pubkey: string, options?: GetStakeActivationOptions) => Promise<JsonRpcResponse<{
        state: string;
        active: number;
        inactive: number;
    }>>;
    /**
     * Fetches the minimum stake delegation.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-token-and-stake-information/getstakeminimumdelegation
     */
    getStakeMinimumDelegation: (options?: GetCommitmentOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<number>>>;
    /**
     * Fetches the current supply of the Solana network.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getsupply
     */
    getSupply: (options?: GetSupplyOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaSupply>>>;
    /**
     * Fetches the balance of the specified token account.
     * @param pubkey - Pubkey of Token account to query, as base-58 encoded string.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-account-information/gettokenaccountbalance
     */
    getTokenAccountBalance: (pubkey: string, options?: GetCommitmentOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaTokenAccountBalance>>>;
    /**
     * Fetches token accounts by delegate.
     * @param pubkey - Pubkey of account delegate to query, as base-58 encoded string.
     * @param config - Configuration options for this request.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-account-information/gettokenaccountsbydelegate
     */
    getTokenAccountsByDelegate: (pubkey: string, config?: SolanaMint | SolanaProgramId, options?: GetTokenAccountsOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaTokenAccount[]>>>;
    /**
     * Fetches token accounts by owner.
     * @param pubkey - Pubkey of account owner to query, as base-58 encoded string.
     * @param config - Configuration options for this request.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-account-information/gettokenaccountsbyowner
     */
    getTokenAccountsByOwner: (pubkey: string, config?: SolanaMint | SolanaProgramId, options?: GetTokenAccountsOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaTokenAccount[]>>>;
    /**
     * Fetches largest token accounts for a mint.
     * @param pubkey - Pubkey of the token Mint to query, as base-58 encoded string.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-token-and-stake-information/gettokenlargestaccounts
     */
    getTokenLargestAccounts: (pubkey: string, options?: GetCommitmentOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaAccount[]>>>;
    /**
     * Fetches token supply details for a mint.
     * @param pubkey - Pubkey of the token Mint to query, as base-58 encoded string.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-token-and-stake-information/gettokensupply
     */
    getTokenSupply: (pubkey: string, options?: GetCommitmentOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaTokenSupply>>>;
    /**
     * Fetches a specific transaction by signature.
     * @param signature - Transaction signature, as base-58 encoded string.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-transaction-management/gettransaction
     */
    getTransaction: (signature: string, options?: GetTransactionOptions) => Promise<JsonRpcResponse<SolanaTransaction | null>>;
    /**
     * Fetches the current transaction count.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-transaction-management/gettransactioncount
     */
    getTransactionCount: (options?: GetCommitmentMinContextSlotOptions) => Promise<JsonRpcResponse<number>>;
    /**
     * Fetches the current version of the Solana core software.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/getversion
     */
    getVersion: () => Promise<JsonRpcResponse<SolanaVersion>>;
    /**
     * Fetches vote accounts information.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-querying-account-information/getvoteaccounts
     */
    getVoteAccounts: (options?: GetVoteAccountOptions) => Promise<JsonRpcResponse<{
        current: Array<SolanaVoteAccount>;
        delinquent: Array<SolanaVoteAccount>;
    }>>;
    /**
     * Checks if a blockhash is valid.
     * @param blockhash - The blockhash of the block to evaluate, as base-58 encoded string.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-transaction-management/isblockhashvalid
     */
    isBlockhashValid: (blockhash: string, options?: GetCommitmentMinContextSlotOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<boolean>>>;
    /**
     * Fetches the lowest slot that the node has information about in its ledger.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-ledger-and-block-information/minimumledgerslot
     */
    minimumLedgerSlot: () => Promise<JsonRpcResponse<number>>;
    /**
     * Requests an airdrop of lamports to a given pubkey.
     * @param pubkey - Pubkey of account to receive lamports, as a base-58 encoded string.
     * @param amount - Lamports to airdrop.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/miscellaneous-api-calls/requestairdrop
     */
    requestAirdrop: (pubkey: string, amount: number, options?: GetCommitmentOptions) => Promise<JsonRpcResponse<string>>;
    /**
     * Sends a transaction to the Solana blockchain.
     * @param transaction - Fully-signed Transaction, as encoded string.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-transaction-management/sendtransaction
     */
    sendTransaction: (transaction: string, options?: SendTransactionOptions) => Promise<JsonRpcResponse<string>>;
    /**
     * Simulates a transaction on the Solana blockchain.
     * @param transaction - Transaction, as an encoded string.
     * @param options - Options for this request.
     * https://docs.tatum.com/docs/rpc-api-reference/solana-rpc-documentation/api-calls-for-transaction-management/simulatetransaction
     */
    simulateTransaction: (transaction: string, options?: SimulateTransactionOptions) => Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaTransactionSimulation>>>;
}
