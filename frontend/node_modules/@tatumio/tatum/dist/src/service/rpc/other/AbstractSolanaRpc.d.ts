import { GetAccountInfoOptions, GetBlockOptions, GetBlockProductionOptions, GetCommitmentMinContextSlotOptions, GetCommitmentOptions, GetInflationRewardOptions, GetLargestAccountsOptions, GetLeaderScheduleOptions, GetMultipleAccountsOptions, GetProgramAccountsOptions, GetSignaturesForAddressOptions, GetSignatureStatusesOptions, GetStakeActivationOptions, GetSupplyOptions, GetTokenAccountsOptions, GetTransactionOptions, GetVoteAccountOptions, JsonRpcResponse, SendTransactionOptions, SimulateTransactionOptions, SolanaAccount, SolanaAccountInfo, SolanaAddressSignature, SolanaBlock, SolanaBlockProduction, SolanaClusterNode, SolanaEpochInfo, SolanaEpochSchedule, SolanaInflationGovernor, SolanaInflationRate, SolanaInflationReward, SolanaLargestAccount, SolanaLatestBlockhash, SolanaLeaderSchedule, SolanaMint, SolanaPerformanceSample, SolanaProgramId, SolanaRpcInterface, SolanaSignatureStatus, SolanaSupply, SolanaTokenAccount, SolanaTokenAccountBalance, SolanaTokenSupply, SolanaTransaction, SolanaTransactionSimulation, SolanaTypeWithContext, SolanaVersion, SolanaVoteAccount } from '../../../dto';
export declare abstract class AbstractSolanaRpc implements SolanaRpcInterface {
    protected abstract rpcCall<T>(method: string, params?: unknown[]): Promise<T>;
    getAccountInfo(pubkey: string, options?: GetAccountInfoOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaAccountInfo | null>>>;
    getBalance(address: string): Promise<JsonRpcResponse<SolanaTypeWithContext<number>>>;
    getBlockHeight(options?: GetCommitmentMinContextSlotOptions): Promise<JsonRpcResponse<number>>;
    getBlock(block: number, options?: GetBlockOptions): Promise<JsonRpcResponse<SolanaBlock>>;
    getBlockProduction(options?: GetBlockProductionOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaBlockProduction>>>;
    getBlockCommitment(block: number): Promise<JsonRpcResponse<{
        commitment: Array<number>;
        totalStake: number;
    }>>;
    getBlocks(startSlot: number, endSlot?: number, options?: GetCommitmentOptions): Promise<JsonRpcResponse<Array<number>>>;
    getBlocksWithLimit(startSlot: number, limit?: number, options?: GetCommitmentOptions): Promise<JsonRpcResponse<Array<number>>>;
    getBlockTime(block: number): Promise<JsonRpcResponse<number | null>>;
    getClusterNodes(): Promise<JsonRpcResponse<Array<SolanaClusterNode>>>;
    getEpochInfo(options?: GetCommitmentMinContextSlotOptions): Promise<JsonRpcResponse<SolanaEpochInfo>>;
    getEpochSchedule(): Promise<JsonRpcResponse<SolanaEpochSchedule>>;
    getFeeForMessage(message: any, options?: GetCommitmentMinContextSlotOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<number | null>>>;
    getFirstAvailableBlock(): Promise<JsonRpcResponse<number>>;
    getGenesisHash(): Promise<JsonRpcResponse<string>>;
    getHealth(): Promise<JsonRpcResponse<string>>;
    getHighestSnapshotSlot(): Promise<JsonRpcResponse<{
        full: number;
        incremental: number;
    }>>;
    getIdentity(): Promise<JsonRpcResponse<{
        identity: string;
    }>>;
    getInflationGovernor(options?: GetCommitmentOptions): Promise<JsonRpcResponse<SolanaInflationGovernor>>;
    getInflationRate(): Promise<JsonRpcResponse<SolanaInflationRate>>;
    getInflationReward(addresses?: string[], options?: GetInflationRewardOptions): Promise<JsonRpcResponse<Array<SolanaInflationReward>>>;
    getLargestAccounts(options?: GetLargestAccountsOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaLargestAccount[]>>>;
    getLatestBlockhash(options?: GetCommitmentMinContextSlotOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaLatestBlockhash>>>;
    getLeaderSchedule(slot?: number, options?: GetLeaderScheduleOptions): Promise<JsonRpcResponse<SolanaLeaderSchedule | null>>;
    getMaxRetransmitSlot(): Promise<JsonRpcResponse<number>>;
    getMaxShredInsertSlot(): Promise<JsonRpcResponse<number>>;
    getMinimumBalanceForRentExemption(dataSize?: number, options?: GetCommitmentOptions): Promise<JsonRpcResponse<number>>;
    getMultipleAccounts(pubKeys?: string[], options?: GetMultipleAccountsOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<Array<SolanaAccountInfo | null>>>>;
    getProgramAccounts(programId: string, options?: GetProgramAccountsOptions): Promise<JsonRpcResponse<Array<{
        account: SolanaAccountInfo;
        pubkey: string;
    }>>>;
    getRecentPerformanceSamples(limit?: number): Promise<JsonRpcResponse<Array<SolanaPerformanceSample>>>;
    getRecentPrioritizationFees(addresses?: string[]): Promise<JsonRpcResponse<Array<{
        slot: number;
        prioritizationFee: number;
    }>>>;
    getSignaturesForAddress(address: string, options?: GetSignaturesForAddressOptions): Promise<JsonRpcResponse<Array<SolanaAddressSignature>>>;
    getSignatureStatuses(signatures?: string[], options?: GetSignatureStatusesOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaSignatureStatus>>>;
    getSlot(options?: GetCommitmentMinContextSlotOptions): Promise<JsonRpcResponse<number>>;
    getSlotLeader(options?: GetCommitmentMinContextSlotOptions): Promise<JsonRpcResponse<string>>;
    getSlotLeaders(startSlot?: number, limit?: number): Promise<JsonRpcResponse<Array<string>>>;
    getStakeActivation(pubkey: string, options?: GetStakeActivationOptions): Promise<JsonRpcResponse<{
        state: string;
        active: number;
        inactive: number;
    }>>;
    getStakeMinimumDelegation(options?: GetCommitmentOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<number>>>;
    getSupply(options?: GetSupplyOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaSupply>>>;
    getTokenAccountBalance(pubkey: string, options?: GetCommitmentOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaTokenAccountBalance>>>;
    getTokenAccountsByDelegate(pubkey: string, config?: SolanaMint | SolanaProgramId, options?: GetTokenAccountsOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaTokenAccount[]>>>;
    getTokenAccountsByOwner(pubkey: string, config?: SolanaMint | SolanaProgramId, options?: GetTokenAccountsOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaTokenAccount[]>>>;
    getTokenLargestAccounts(pubkey: string, options?: GetCommitmentOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaAccount[]>>>;
    getTokenSupply(pubkey: string, options?: GetCommitmentOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaTokenSupply>>>;
    getTransaction(signature: string, options?: GetTransactionOptions): Promise<JsonRpcResponse<SolanaTransaction | null>>;
    getTransactionCount(options?: GetCommitmentMinContextSlotOptions): Promise<JsonRpcResponse<number>>;
    getVersion(): Promise<JsonRpcResponse<SolanaVersion>>;
    getVoteAccounts(options?: GetVoteAccountOptions): Promise<JsonRpcResponse<{
        current: Array<SolanaVoteAccount>;
        delinquent: Array<SolanaVoteAccount>;
    }>>;
    isBlockhashValid(blockhash: string, options?: GetCommitmentMinContextSlotOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<boolean>>>;
    minimumLedgerSlot(): Promise<JsonRpcResponse<number>>;
    requestAirdrop(pubkey: string, amount: number, options?: GetCommitmentOptions): Promise<JsonRpcResponse<string>>;
    sendTransaction(transaction: string, options?: SendTransactionOptions): Promise<JsonRpcResponse<string>>;
    simulateTransaction(transaction: string, options?: SimulateTransactionOptions): Promise<JsonRpcResponse<SolanaTypeWithContext<SolanaTransactionSimulation>>>;
}
