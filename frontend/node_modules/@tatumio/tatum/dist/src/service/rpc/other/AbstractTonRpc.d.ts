import { PostI } from '../../../dto/PostI';
import { GetI } from '../../../dto/GetI';
import { TonRpcSuite } from '../../../dto/rpc/ton/TonRpcSuite';
import { ServiceStatus } from '../../../dto/rpc/ton/models/ServiceStatus';
import { Accounts } from '../../../dto/rpc/ton/models/Accounts';
import { Seqno } from '../../../dto/rpc/ton/models/Seqno';
import { StorageProvider } from '../../../dto/rpc/ton/models/StorageProvider';
import { Trace } from '../../../dto/rpc/ton/models/Trace';
import { Multisig } from '../../../dto/rpc/ton/models/Multisig';
import { AccountEvents } from '../../../dto/rpc/ton/models/AccountEvents';
import { NftCollections } from '../../../dto/rpc/ton/models/NftCollections';
import { NftCollection } from '../../../dto/rpc/ton/models/NftCollection';
import { NftItems } from '../../../dto/rpc/ton/models/NftItems';
import { NftItem } from '../../../dto/rpc/ton/models/NftItem';
import { TokenRates } from '../../../dto/rpc/ton/models/TokenRates';
import { MarketTonRates } from '../../../dto/rpc/ton/models/MarketTonRates';
import { AccountStaking } from '../../../dto/rpc/ton/models/AccountStaking';
import { PoolImplementation } from '../../../dto/rpc/ton/models/PoolImplementation';
import { PoolInfo } from '../../../dto/rpc/ton/models/PoolInfo';
import { ApyHistory } from '../../../dto/rpc/ton/models/ApyHistory';
import { BlockRaw } from '../../../dto/rpc/ton/models/BlockRaw';
import { InitStateRaw } from '../../../dto/rpc/ton/models/InitStateRaw';
import { GaslessConfig } from '../../../dto/rpc/ton/models/GaslessConfig';
import { Jettons } from '../../../dto/rpc/ton/models/Jettons';
import { JettonInfo } from '../../../dto/rpc/ton/models/JettonInfo';
import { JettonHolders } from '../../../dto/rpc/ton/models/JettonHolders';
import { SignRawParams } from '../../../dto/rpc/ton/models/SignRawParams';
import { InscriptionBalances } from '../../../dto/rpc/ton/models/InscriptionBalances';
import { Event } from '../../../dto/rpc/ton/models/Event';
import { Multisigs } from '../../../dto/rpc/ton/models/Multisigs';
import { DnsExpiring } from '../../../dto/rpc/ton/models/DnsExpiring';
import { FoundAccounts } from '../../../dto/rpc/ton/models/FoundAccounts';
import { Subscriptions } from '../../../dto/rpc/ton/models/Subscriptions';
import { TraceIDs } from '../../../dto/rpc/ton/models/TraceIDs';
import { AccountEvent } from '../../../dto/rpc/ton/models/AccountEvent';
import { DecodedMessage } from '../../../dto/rpc/ton/models/DecodedMessage';
import { MessageConsequences } from '../../../dto/rpc/ton/models/MessageConsequences';
import { JettonBalance } from '../../../dto/rpc/ton/models/JettonBalance';
import { AccountInfoByStateInit } from '../../../dto/rpc/ton/models/AccountInfoByStateInit';
import { DomainInfo } from '../../../dto/rpc/ton/models/DomainInfo';
import { DnsRecord } from '../../../dto/rpc/ton/models/DnsRecord';
import { DomainBids } from '../../../dto/rpc/ton/models/DomainBids';
import { Auctions } from '../../../dto/rpc/ton/models/Auctions';
import { ReducedBlocks } from '../../../dto/rpc/ton/models/ReducedBlocks';
import { BlockchainBlock } from '../../../dto/rpc/ton/models/BlockchainBlock';
import { BlockchainBlockShards } from '../../../dto/rpc/ton/models/BlockchainBlockShards';
import { BlockchainBlocks } from '../../../dto/rpc/ton/models/BlockchainBlocks';
import { Transactions } from '../../../dto/rpc/ton/models/Transactions';
import { BlockchainConfig } from '../../../dto/rpc/ton/models/BlockchainConfig';
import { RawBlockchainConfig } from '../../../dto/rpc/ton/models/RawBlockchainConfig';
import { Transaction } from '../../../dto/rpc/ton/models/Transaction';
import { Validators } from '../../../dto/rpc/ton/models/Validators';
import { BlockchainRawAccount } from '../../../dto/rpc/ton/models/BlockchainRawAccount';
import { MethodExecutionResult } from '../../../dto/rpc/ton/models/MethodExecutionResult';
import { BlockchainAccountInspect } from '../../../dto/rpc/ton/models/BlockchainAccountInspect';
import { Account } from '../../../dto/rpc/ton/models/Account';
import { DomainNames } from '../../../dto/rpc/ton/models/DomainNames';
import { JettonsBalances } from '../../../dto/rpc/ton/models/JettonsBalances';
import { TonResponse } from '../../../dto/rpc/ton/models/TonResponse';
import { GetTransactions } from '../../../dto/rpc/ton/models/GetTransactions';
import { GetShardBlockProof } from '../../../dto/rpc/ton/models/GetShardBlockProof';
import { LookupBlock } from '../../../dto/rpc/ton/models/LookupBlock';
import { GetBlockTransactions } from '../../../dto/rpc/ton/models/GetBlockTransactions';
import { GetBlockTransactionsExt } from '../../../dto/rpc/ton/models/GetBlockTransactionsExt';
import { GetBlockHeader } from '../../../dto/rpc/ton/models/GetBlockHeader';
import { TryLocateTx } from '../../../dto/rpc/ton/models/TryLocateTx';
import { Body_run_get_method_runGetMethod_post } from '../../../dto/rpc/ton/models/Body_run_get_method_runGetMethod_post';
import { Body_send_boc_sendBoc_post } from '../../../dto/rpc/ton/models/Body_send_boc_sendBoc_post';
import { Body_send_boc_return_hash_sendBocReturnHash_post } from '../../../dto/rpc/ton/models/Body_send_boc_return_hash_sendBocReturnHash_post';
import { Body_send_query_sendQuery_post } from '../../../dto/rpc/ton/models/Body_send_query_sendQuery_post';
import { Body_estimate_fee_estimateFee_post } from '../../../dto/rpc/ton/models/Body_estimate_fee_estimateFee_post';
import { TonRequestJsonRPC } from '../../../dto/rpc/ton/models/TonRequestJsonRPC';
import { DeprecatedTonResponseJsonRPC } from '../../../dto/rpc/ton/models/DeprecatedTonResponseJsonRPC';
export declare abstract class AbstractTonRpc implements TonRpcSuite {
    private prepareRequest;
    protected abstract post<T>(post: PostI): Promise<T>;
    protected abstract get<T>(get: GetI): Promise<T>;
    protected abstract put<T>(post: PostI): Promise<T>;
    private sendPost;
    private sendPut;
    private sendGet;
    getMultisigAccount(accountId: string): Promise<Multisig | {
        error: string;
    }>;
    getAccountNftHistory(accountId: string, limit: number, beforeLt?: number, startDate?: number, endDate?: number): Promise<AccountEvents | {
        error: string;
    }>;
    getNftCollections(limit: number, offset?: number): Promise<NftCollections | {
        error: string;
    }>;
    getNftCollection(accountId: string): Promise<NftCollection | {
        error: string;
    }>;
    getItemsFromCollection(accountId: string, limit: number, offset?: number): Promise<NftItems | {
        error: string;
    }>;
    getNftItemsByAddresses(requestBody?: {
        account_ids: Array<string>;
    }): Promise<NftItems | {
        error: string;
    }>;
    getNftItemByAddress(accountId: string): Promise<NftItem | {
        error: string;
    }>;
    getNftHistoryById(accountId: string, limit: number, beforeLt?: number, startDate?: number, endDate?: number): Promise<AccountEvents | {
        error: string;
    }>;
    getRates(tokens: Array<string>, currencies: Array<string>): Promise<{
        rates: Record<string, TokenRates>;
    }>;
    getChartRates(token: string, currency?: string, startDate?: number, endDate?: number, pointsCount?: number): Promise<{
        points: any;
    }>;
    getMarketsRates(): Promise<{
        markets: Array<MarketTonRates>;
    }>;
    getAccountNominatorsPools(accountId: string): Promise<AccountStaking | {
        error: string;
    }>;
    getStakingPoolInfo(accountId: string): Promise<{
        implementation: PoolImplementation;
        pool: PoolInfo;
    }>;
    getStakingPoolHistory(accountId: string): Promise<{
        apy: Array<ApyHistory>;
    }>;
    getStakingPools(availableFor?: string, includeUnverified?: boolean): Promise<{
        pools: Array<PoolInfo>;
        implementations: Record<string, PoolImplementation>;
    }>;
    getStorageProviders(): Promise<{
        providers: Array<StorageProvider>;
    }>;
    getTrace(traceId: string): Promise<Trace | {
        error: string;
    }>;
    getWalletBackup(xTonConnectAuth: string): Promise<{
        dump: string;
    }>;
    setWalletBackup(xTonConnectAuth: string, requestBody: Blob): Promise<any>;
    tonConnectProof(requestBody: {
        address: string;
        proof: {
            timestamp: number;
            domain: {
                length_bytes?: number;
                value: string;
            };
            signature: string;
            payload: string;
            state_init?: string;
        };
    }): Promise<{
        token: string;
    }>;
    getWalletsByPublicKey(publicKey: string): Promise<Accounts | {
        error: string;
    }>;
    getAccountSeqno(accountId: string): Promise<Seqno | {
        error: string;
    }>;
    getRawMasterchainInfo(): Promise<{
        last: BlockRaw;
        state_root_hash: string;
        init: InitStateRaw;
    }>;
    getRawMasterchainInfoExt(mode: number): Promise<{
        mode: number;
        version: number;
        capabilities: number;
        last: BlockRaw;
        last_utime: number;
        now: number;
        state_root_hash: string;
        init: InitStateRaw;
    }>;
    getRawTime(): Promise<{
        time: number;
    }>;
    getRawBlockchainBlock(blockId: string): Promise<{
        id: BlockRaw;
        data: string;
    }>;
    getRawBlockchainBlockState(blockId: string): Promise<{
        id: BlockRaw;
        root_hash: string;
        file_hash: string;
        data: string;
    }>;
    getRawBlockchainBlockHeader(blockId: string, mode: number): Promise<{
        id: BlockRaw;
        mode: number;
        header_proof: string;
    }>;
    sendRawMessage(requestBody: {
        body: string;
    }): Promise<{
        code: number;
    }>;
    getRawAccountState(accountId: string, targetBlock?: string): Promise<{
        id: BlockRaw;
        shardblk: BlockRaw;
        shard_proof: string;
        proof: string;
        state: string;
    }>;
    getRawShardInfo(blockId: string, workchain: number, shard: number, exact: boolean): Promise<{
        id: BlockRaw;
        shardblk: BlockRaw;
        shard_proof: string;
        shard_descr: string;
    }>;
    getAllRawShardsInfo(blockId: string): Promise<{
        id: BlockRaw;
        proof: string;
        data: string;
    }>;
    getRawTransactions(accountId: string, count: number, lt: number, hash: string): Promise<{
        ids: Array<BlockRaw>;
        transactions: string;
    }>;
    getRawListBlockTransactions(blockId: string, mode: number, count: number, accountId?: string, lt?: number): Promise<{
        id: BlockRaw;
        req_count: number;
        incomplete: boolean;
        ids: Array<{
            mode: number;
            account?: string;
            lt?: number;
            hash?: string;
        }>;
        proof: string;
    }>;
    getRawBlockProof(knownBlock: string, mode: number, targetBlock?: string): Promise<{
        complete: boolean;
        from: BlockRaw;
        to: BlockRaw;
        steps: Array<{
            lite_server_block_link_back: {
                to_key_block: boolean;
                from: BlockRaw;
                to: BlockRaw;
                dest_proof: string;
                proof: string;
                state_proof: string;
            };
            lite_server_block_link_forward: {
                to_key_block: boolean;
                from: BlockRaw;
                to: BlockRaw;
                dest_proof: string;
                config_proof: string;
                signatures: {
                    validator_set_hash: number;
                    catchain_seqno: number;
                    signatures: Array<{
                        node_id_short: string;
                        signature: string;
                    }>;
                };
            };
        }>;
    }>;
    getRawConfig(blockId: string, mode: number): Promise<{
        mode: number;
        id: BlockRaw;
        state_proof: string;
        config_proof: string;
    }>;
    getRawShardBlockProof(blockId: string): Promise<{
        masterchain_id: BlockRaw;
        links: Array<{
            id: BlockRaw;
            proof: string;
        }>;
    }>;
    getOutMsgQueueSizes(): Promise<{
        ext_msg_queue_size_limit: number;
        shards: Array<{
            id: BlockRaw;
            size: number;
        }>;
    }>;
    gaslessConfig(): Promise<GaslessConfig | {
        error: string;
    }>;
    gaslessEstimate(masterId: string, requestBody: {
        wallet_address: string;
        wallet_public_key: string;
        messages: Array<{
            boc: string;
        }>;
    }): Promise<SignRawParams | {
        error: string;
    }>;
    gaslessSend(requestBody: {
        wallet_public_key: string;
        boc: string;
    }): Promise<any>;
    getAccountInscriptions(accountId: string, limit?: number, offset?: number): Promise<InscriptionBalances | {
        error: string;
    }>;
    getAccountInscriptionsHistory(accountId: string, beforeLt?: number, limit?: number): Promise<AccountEvents | {
        error: string;
    }>;
    getAccountInscriptionsHistoryByTicker(accountId: string, ticker: string, beforeLt?: number, limit?: number): Promise<AccountEvents | {
        error: string;
    }>;
    getInscriptionOpTemplate(type: 'ton20' | 'gram20', operation: 'transfer', amount: string, ticker: string, who: string, destination?: string, comment?: string): Promise<{
        comment: string;
        destination: string;
    }>;
    getJettons(limit?: number, offset?: number): Promise<Jettons | {
        error: string;
    }>;
    getJettonInfo(accountId: string): Promise<JettonInfo | {
        error: string;
    }>;
    getJettonHolders(accountId: string, limit?: number, offset?: number): Promise<JettonHolders | {
        error: string;
    }>;
    getJettonsEvents(eventId: string): Promise<Event | {
        error: string;
    }>;
    getEvent(eventId: string): Promise<Event | {
        error: string;
    }>;
    decodeMessage(requestBody: {
        boc: string;
    }): Promise<DecodedMessage | {
        error: string;
    }>;
    emulateMessageToEvent(requestBody: {
        boc: string;
    }, ignoreSignatureCheck?: boolean): Promise<Event | {
        error: string;
    }>;
    emulateMessageToTrace(requestBody: {
        boc: string;
    }, ignoreSignatureCheck?: boolean): Promise<Trace | {
        error: string;
    }>;
    emulateMessageToWallet(requestBody: {
        boc: string;
        params?: Array<{
            address: string;
            balance?: number;
        }>;
    }): Promise<MessageConsequences | {
        error: string;
    }>;
    emulateMessageToAccountEvent(accountId: string, requestBody: {
        boc: string;
    }, ignoreSignatureCheck?: boolean): Promise<AccountEvent | {
        error: string;
    }>;
    getTonConnectPayload(): Promise<{
        payload: string;
    }>;
    getAccountInfoByStateInit(requestBody: {
        state_init: string;
    }): Promise<AccountInfoByStateInit | {
        error: string;
    }>;
    getDnsInfo(domainName: string): Promise<DomainInfo | {
        error: string;
    }>;
    dnsResolve(domainName: string): Promise<DnsRecord | {
        error: string;
    }>;
    getDomainBids(domainName: string): Promise<DomainBids | {
        error: string;
    }>;
    getAllAuctions(tld?: string): Promise<Auctions | {
        error: string;
    }>;
    status(): Promise<ServiceStatus | {
        error: string;
    }>;
    getReducedBlockchainBlocks(from: number, to: number): Promise<ReducedBlocks | {
        error: string;
    }>;
    getBlockchainBlock(blockId: string): Promise<BlockchainBlock | {
        error: string;
    }>;
    getBlockchainMasterchainShards(masterchainSeqno: number): Promise<BlockchainBlockShards | {
        error: string;
    }>;
    getBlockchainMasterchainBlocks(masterchainSeqno: number): Promise<BlockchainBlocks | {
        error: string;
    }>;
    getBlockchainMasterchainTransactions(masterchainSeqno: number): Promise<Transactions | {
        error: string;
    }>;
    getBlockchainConfigFromBlock(masterchainSeqno: number): Promise<BlockchainConfig | {
        error: string;
    }>;
    getRawBlockchainConfigFromBlock(masterchainSeqno: number): Promise<RawBlockchainConfig | {
        error: string;
    }>;
    getBlockchainBlockTransactions(blockId: string): Promise<Transactions | {
        error: string;
    }>;
    getBlockchainTransaction(transactionId: string): Promise<Transaction | {
        error: string;
    }>;
    getBlockchainTransactionByMessageHash(msgId: string): Promise<Transaction | {
        error: string;
    }>;
    getBlockchainValidators(): Promise<Validators | {
        error: string;
    }>;
    getBlockchainMasterchainHead(): Promise<BlockchainBlock | {
        error: string;
    }>;
    getBlockchainRawAccount(accountId: string): Promise<BlockchainRawAccount | {
        error: string;
    }>;
    getBlockchainAccountTransactions(accountId: string, afterLt?: number, beforeLt?: number, limit?: number, sortOrder?: 'desc' | 'asc'): Promise<Transactions | {
        error: string;
    }>;
    execGetMethodForBlockchainAccount(accountId: string, methodName: string, args?: Array<string>): Promise<MethodExecutionResult | {
        error: string;
    }>;
    sendBlockchainMessage(requestBody: {
        boc?: string;
        batch?: Array<string>;
    }): Promise<any>;
    getBlockchainConfig(): Promise<BlockchainConfig | {
        error: string;
    }>;
    getRawBlockchainConfig(): Promise<RawBlockchainConfig | {
        error: string;
    }>;
    blockchainAccountInspect(accountId: string): Promise<BlockchainAccountInspect | {
        error: string;
    }>;
    addressParse(accountId: string): Promise<{
        raw_form: string;
        bounceable: {
            b64: string;
            b64url: string;
        };
        non_bounceable: {
            b64: string;
            b64url: string;
        };
        given_type: string;
        test_only: boolean;
    }>;
    getAccounts(currency?: string, requestBody?: {
        account_ids: Array<string>;
    }): Promise<Accounts | {
        error: string;
    }>;
    getAccount(accountId: string): Promise<Account | {
        error: string;
    }>;
    accountDnsBackResolve(accountId: string): Promise<DomainNames | {
        error: string;
    }>;
    getAccountJettonsBalances(accountId: string, currencies?: Array<string>): Promise<JettonsBalances | {
        error: string;
    }>;
    getAccountJettonBalance(accountId: string, jettonId: string, currencies?: Array<string>): Promise<JettonBalance | {
        error: string;
    }>;
    getAccountJettonsHistory(accountId: string, limit: number, beforeLt?: number, startDate?: number, endDate?: number): Promise<AccountEvents | {
        error: string;
    }>;
    getAccountJettonHistoryById(accountId: string, jettonId: string, limit: number, beforeLt?: number, startDate?: number, endDate?: number): Promise<AccountEvents | {
        error: string;
    }>;
    getAccountNftItems(accountId: string, collection?: string, limit?: number, indirectOwnership?: boolean, offset?: number): Promise<NftItems | {
        error: string;
    }>;
    getAccountEvents(accountId: string, limit: number, initiator?: boolean, subjectOnly?: boolean, beforeLt?: number, startDate?: number, endDate?: number): Promise<AccountEvents | {
        error: string;
    }>;
    getAccountEvent(accountId: string, eventId: string, subjectOnly: boolean): Promise<AccountEvent | {
        error: string;
    }>;
    getAccountTraces(accountId: string, beforeLt?: number, limit?: number): Promise<TraceIDs | {
        error: string;
    }>;
    getAccountSubscriptions(accountId: string): Promise<Subscriptions | {
        error: string;
    }>;
    reindexAccount(accountId: string): Promise<any>;
    searchAccounts(name: string): Promise<FoundAccounts | {
        error: string;
    }>;
    getAccountDnsExpiring(accountId: string, period?: number): Promise<DnsExpiring | {
        error: string;
    }>;
    getAccountPublicKey(accountId: string): Promise<{
        public_key: string;
    }>;
    getAccountMultisigs(accountId: string): Promise<Multisigs | {
        error: string;
    }>;
    getAccountDiff(accountId: string, startDate: number, endDate: number): Promise<{
        balance_change: number;
    }>;
    getAddressInformation(address: string): Promise<TonResponse>;
    getExtendedAddressInformation(address: string): Promise<TonResponse>;
    getWalletInformation(address: string): Promise<TonResponse>;
    getTransactions(params: GetTransactions): Promise<TonResponse>;
    getAddressBalance(address: string): Promise<TonResponse>;
    getAddressState(address: string): Promise<TonResponse>;
    packAddress(address: string): Promise<TonResponse>;
    unpackAddress(address: string): Promise<TonResponse>;
    getTokenData(address: string): Promise<TonResponse>;
    detectAddress(address: string): Promise<TonResponse>;
    getMasterchainInfo(): Promise<TonResponse>;
    getMasterchainBlockSignatures(seqno: number): Promise<TonResponse>;
    getShardBlockProof(params: GetShardBlockProof): Promise<TonResponse>;
    getConsensusBlock(): Promise<TonResponse>;
    lookupBlock(params: LookupBlock): Promise<TonResponse>;
    shards(seqno: number): Promise<TonResponse>;
    getBlockTransactions(params: GetBlockTransactions): Promise<TonResponse>;
    getBlockTransactionsExt(params: GetBlockTransactionsExt): Promise<TonResponse>;
    getBlockHeader(params: GetBlockHeader): Promise<TonResponse>;
    getOutMsqQueueSizes(): Promise<TonResponse>;
    tryLocateTx(params: TryLocateTx): Promise<TonResponse>;
    tryLocateResultTx(params: TryLocateTx): Promise<TonResponse>;
    tryLocateSourceTx(params: TryLocateTx): Promise<TonResponse>;
    runGetMethod(params: Body_run_get_method_runGetMethod_post): Promise<TonResponse>;
    sendBoc(params: Body_send_boc_sendBoc_post): Promise<TonResponse>;
    sendBocReturnHash(params: Body_send_boc_return_hash_sendBocReturnHash_post): Promise<TonResponse>;
    sendQuery(params: Body_send_query_sendQuery_post): Promise<TonResponse>;
    estimateFee(params: Body_estimate_fee_estimateFee_post): Promise<TonResponse>;
    jsonRPC(params: TonRequestJsonRPC): Promise<DeprecatedTonResponseJsonRPC>;
}
