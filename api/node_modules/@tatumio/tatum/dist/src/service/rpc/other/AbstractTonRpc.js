"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractTonRpc = void 0;
const util_1 = require("../../../util");
class AbstractTonRpc {
    prepareRequest({ path, body, queryParams }) {
        return {
            path: util_1.Utils.addQueryParams({
                basePath: path,
                strategy: util_1.Utils.camelToDashCase,
                queryParams: queryParams,
            }),
            body,
        };
    }
    sendPost(request) {
        return this.post(this.prepareRequest(request));
    }
    sendPut(request) {
        return this.put(this.prepareRequest(request));
    }
    async sendGet({ path, queryParams }) {
        return this.get({ path: util_1.Utils.addQueryParams({ basePath: path, queryParams: queryParams }) });
    }
    // Multisig
    getMultisigAccount(accountId) {
        return this.sendGet({ path: `/v2/multisig/${accountId}` });
    }
    // NftE2eClient
    getAccountNftHistory(accountId, limit, beforeLt, startDate, endDate) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/nfts/history`,
            queryParams: { limit, before_lt: beforeLt, start_date: startDate, end_date: endDate }
        });
    }
    getNftCollections(limit, offset) {
        return this.sendGet({
            path: `/v2/nfts/collections`,
            queryParams: { limit, offset }
        });
    }
    getNftCollection(accountId) {
        return this.sendGet({ path: `/v2/nfts/collections/${accountId}` });
    }
    getItemsFromCollection(accountId, limit, offset) {
        return this.sendGet({
            path: `/v2/nfts/collections/${accountId}/items`,
            queryParams: { limit, offset }
        });
    }
    getNftItemsByAddresses(requestBody) {
        return this.sendPost({
            path: `/v2/nfts/_bulk`,
            body: requestBody
        });
    }
    getNftItemByAddress(accountId) {
        return this.sendGet({ path: `/v2/nfts/${accountId}` });
    }
    getNftHistoryById(accountId, limit, beforeLt, startDate, endDate) {
        return this.sendGet({
            path: `/v2/nfts/${accountId}/history`,
            queryParams: { limit, before_lt: beforeLt, start_date: startDate, end_date: endDate }
        });
    }
    // RatesE2eClient
    getRates(tokens, currencies) {
        return this.sendGet({
            path: `/v2/rates`,
            queryParams: { tokens: tokens.join(','), currencies: currencies.join(',') }
        });
    }
    getChartRates(token, currency, startDate, endDate, pointsCount) {
        return this.sendGet({
            path: `/v2/rates/chart`,
            queryParams: { token, currency, start_date: startDate, end_date: endDate, points_count: pointsCount }
        });
    }
    getMarketsRates() {
        return this.sendGet({ path: `/v2/rates/markets` });
    }
    // StakingE2eClient
    getAccountNominatorsPools(accountId) {
        return this.sendGet({ path: `/v2/staking/nominator/${accountId}/pools` });
    }
    getStakingPoolInfo(accountId) {
        return this.sendGet({
            path: `/v2/staking/pool/${accountId}`,
        });
    }
    getStakingPoolHistory(accountId) {
        return this.sendGet({ path: `/v2/staking/pool/${accountId}/history` });
    }
    getStakingPools(availableFor, includeUnverified) {
        return this.sendGet({
            path: `/v2/staking/pools`,
            queryParams: { available_for: availableFor, include_unverified: includeUnverified }
        });
    }
    // StorageE2eClient
    getStorageProviders() {
        return this.sendGet({ path: `/v2/storage/providers` });
    }
    // TracesE2eClient
    getTrace(traceId) {
        return this.sendGet({ path: `/v2/traces/${traceId}` });
    }
    // WalletE2eClient
    getWalletBackup(xTonConnectAuth) {
        return this.sendGet({
            path: `/v2/wallet/backup`,
            queryParams: { 'X-TonConnect-Auth': xTonConnectAuth }
        });
    }
    setWalletBackup(xTonConnectAuth, requestBody) {
        return this.sendPut({
            path: `/v2/wallet/backup`,
            body: requestBody,
            queryParams: { 'X-TonConnect-Auth': xTonConnectAuth }
        });
    }
    tonConnectProof(requestBody) {
        return this.sendPost({
            path: `/v2/wallet/auth/proof`,
            body: requestBody
        });
    }
    getWalletsByPublicKey(publicKey) {
        return this.sendGet({ path: `/v2/pubkeys/${publicKey}/wallets` });
    }
    getAccountSeqno(accountId) {
        return this.sendGet({ path: `/v2/wallet/${accountId}/seqno` });
    }
    // Lite Server
    getRawMasterchainInfo() {
        return this.sendGet({ path: '/v2/liteserver/get_masterchain_info' });
    }
    getRawMasterchainInfoExt(mode) {
        return this.sendGet({
            path: '/v2/liteserver/get_masterchain_info_ext',
            queryParams: { mode },
        });
    }
    getRawTime() {
        return this.sendGet({ path: '/v2/liteserver/get_time' });
    }
    getRawBlockchainBlock(blockId) {
        return this.sendGet({
            path: `/v2/liteserver/get_block/${blockId}`,
        });
    }
    getRawBlockchainBlockState(blockId) {
        return this.sendGet({
            path: `/v2/liteserver/get_state/${blockId}`,
        });
    }
    getRawBlockchainBlockHeader(blockId, mode) {
        return this.sendGet({
            path: `/v2/liteserver/get_block_header/${blockId}`,
            queryParams: { mode },
        });
    }
    sendRawMessage(requestBody) {
        return this.sendPost({
            path: '/v2/liteserver/send_message',
            body: requestBody,
        });
    }
    getRawAccountState(accountId, targetBlock) {
        return this.sendGet({
            path: `/v2/liteserver/get_account_state/${accountId}`,
            queryParams: { target_block: targetBlock },
        });
    }
    getRawShardInfo(blockId, workchain, shard, exact) {
        return this.sendGet({
            path: `/v2/liteserver/get_shard_info/${blockId}`,
            queryParams: { workchain, shard, exact },
        });
    }
    getAllRawShardsInfo(blockId) {
        return this.sendGet({
            path: `/v2/liteserver/get_all_shards_info/${blockId}`,
        });
    }
    getRawTransactions(accountId, count, lt, hash) {
        return this.sendGet({
            path: `/v2/liteserver/get_transactions/${accountId}`,
            queryParams: { count, lt, hash },
        });
    }
    getRawListBlockTransactions(blockId, mode, count, accountId, lt) {
        return this.sendGet({
            path: `/v2/liteserver/list_block_transactions/${blockId}`,
            queryParams: { mode, count, account_id: accountId, lt },
        });
    }
    getRawBlockProof(knownBlock, mode, targetBlock) {
        return this.sendGet({
            path: '/v2/liteserver/get_block_proof',
            queryParams: { known_block: knownBlock, target_block: targetBlock, mode },
        });
    }
    getRawConfig(blockId, mode) {
        return this.sendGet({
            path: `/v2/liteserver/get_config_all/${blockId}`,
            queryParams: { mode },
        });
    }
    getRawShardBlockProof(blockId) {
        return this.sendGet({
            path: `/v2/liteserver/get_shard_block_proof/${blockId}`,
        });
    }
    getOutMsgQueueSizes() {
        return this.sendGet({ path: '/v2/liteserver/get_out_msg_queue_sizes' });
    }
    // GasLess
    gaslessConfig() {
        return this.sendGet({ path: '/v2/gasless/config' });
    }
    gaslessEstimate(masterId, requestBody) {
        return this.sendPost({
            path: `/v2/gasless/estimate/${masterId}`,
            body: requestBody,
        });
    }
    gaslessSend(requestBody) {
        return this.sendPost({
            path: '/v2/gasless/send',
            body: requestBody,
        });
    }
    // Inscriptions
    getAccountInscriptions(accountId, limit, offset) {
        return this.sendGet({
            path: `/v2/experimental/accounts/${accountId}/inscriptions`,
            queryParams: { limit, offset },
        });
    }
    getAccountInscriptionsHistory(accountId, beforeLt, limit) {
        return this.sendGet({
            path: `/v2/experimental/accounts/${accountId}/inscriptions/history`,
            queryParams: { before_lt: beforeLt, limit },
        });
    }
    getAccountInscriptionsHistoryByTicker(accountId, ticker, beforeLt, limit) {
        return this.sendGet({
            path: `/v2/experimental/accounts/${accountId}/inscriptions/${ticker}/history`,
            queryParams: { before_lt: beforeLt, limit },
        });
    }
    getInscriptionOpTemplate(type, operation, amount, ticker, who, destination, comment) {
        return this.sendGet({
            path: '/v2/experimental/inscriptions/op-template',
            queryParams: { type, destination, comment, operation, amount, ticker, who },
        });
    }
    // Jettons
    getJettons(limit, offset) {
        return this.sendGet({
            path: '/v2/jettons',
            queryParams: { limit, offset },
        });
    }
    getJettonInfo(accountId) {
        return this.sendGet({
            path: `/v2/jettons/${accountId}`,
        });
    }
    getJettonHolders(accountId, limit, offset) {
        return this.sendGet({
            path: `/v2/jettons/${accountId}/holders`,
            queryParams: { limit, offset },
        });
    }
    getJettonsEvents(eventId) {
        return this.sendGet({
            path: `/v2/events/${eventId}/jettons`,
        });
    }
    getEvent(eventId) {
        return this.sendGet({
            path: `/v2/events/${eventId}`,
        });
    }
    // emulation
    decodeMessage(requestBody) {
        return this.sendPost({
            path: '/v2/message/decode',
            body: requestBody,
        });
    }
    emulateMessageToEvent(requestBody, ignoreSignatureCheck) {
        return this.sendPost({
            path: '/v2/events/emulate',
            body: requestBody,
            queryParams: { ignore_signature_check: ignoreSignatureCheck },
        });
    }
    emulateMessageToTrace(requestBody, ignoreSignatureCheck) {
        return this.sendPost({
            path: '/v2/traces/emulate',
            body: requestBody,
            queryParams: { ignore_signature_check: ignoreSignatureCheck },
        });
    }
    emulateMessageToWallet(requestBody) {
        return this.sendPost({
            path: '/v2/wallet/emulate',
            body: requestBody,
        });
    }
    emulateMessageToAccountEvent(accountId, requestBody, ignoreSignatureCheck) {
        return this.sendPost({
            path: `/v2/accounts/${accountId}/events/emulate`,
            body: requestBody,
            queryParams: { ignore_signature_check: ignoreSignatureCheck },
        });
    }
    // Connect
    getTonConnectPayload() {
        return this.sendGet({
            path: '/v2/tonconnect/payload',
        });
    }
    getAccountInfoByStateInit(requestBody) {
        return this.sendPost({
            path: '/v2/tonconnect/stateinit',
            body: requestBody,
        });
    }
    // DNS
    getDnsInfo(domainName) {
        return this.sendGet({
            path: `/v2/dns/${domainName}`,
        });
    }
    dnsResolve(domainName) {
        return this.sendGet({
            path: `/v2/dns/${domainName}/resolve`,
        });
    }
    getDomainBids(domainName) {
        return this.sendGet({
            path: `/v2/dns/${domainName}/bids`,
        });
    }
    getAllAuctions(tld) {
        return this.sendGet({
            path: '/v2/dns/auctions',
            queryParams: { tld },
        });
    }
    // blockchain
    status() {
        return this.sendGet({
            path: '/v2/status',
        });
    }
    getReducedBlockchainBlocks(from, to) {
        return this.sendGet({
            path: '/v2/blockchain/reduced/blocks',
            queryParams: { from, to },
        });
    }
    getBlockchainBlock(blockId) {
        return this.sendGet({
            path: `/v2/blockchain/blocks/${blockId}`,
        });
    }
    getBlockchainMasterchainShards(masterchainSeqno) {
        return this.sendGet({
            path: `/v2/blockchain/masterchain/${masterchainSeqno}/shards`,
        });
    }
    getBlockchainMasterchainBlocks(masterchainSeqno) {
        return this.sendGet({
            path: `/v2/blockchain/masterchain/${masterchainSeqno}/blocks`,
        });
    }
    getBlockchainMasterchainTransactions(masterchainSeqno) {
        return this.sendGet({
            path: `/v2/blockchain/masterchain/${masterchainSeqno}/transactions`,
        });
    }
    getBlockchainConfigFromBlock(masterchainSeqno) {
        return this.sendGet({
            path: `/v2/blockchain/masterchain/${masterchainSeqno}/config`,
        });
    }
    getRawBlockchainConfigFromBlock(masterchainSeqno) {
        return this.sendGet({
            path: `/v2/blockchain/masterchain/${masterchainSeqno}/config/raw`,
        });
    }
    getBlockchainBlockTransactions(blockId) {
        return this.sendGet({
            path: `/v2/blockchain/blocks/${blockId}/transactions`,
        });
    }
    getBlockchainTransaction(transactionId) {
        return this.sendGet({
            path: `/v2/blockchain/transactions/${transactionId}`,
        });
    }
    getBlockchainTransactionByMessageHash(msgId) {
        return this.sendGet({
            path: `/v2/blockchain/messages/${msgId}/transaction`,
        });
    }
    getBlockchainValidators() {
        return this.sendGet({
            path: '/v2/blockchain/validators',
        });
    }
    getBlockchainMasterchainHead() {
        return this.sendGet({
            path: '/v2/blockchain/masterchain-head',
        });
    }
    getBlockchainRawAccount(accountId) {
        return this.sendGet({
            path: `/v2/blockchain/accounts/${accountId}`,
        });
    }
    getBlockchainAccountTransactions(accountId, afterLt, beforeLt, limit, sortOrder = 'desc') {
        return this.sendGet({
            path: `/v2/blockchain/accounts/${accountId}/transactions`,
            queryParams: {
                after_lt: afterLt,
                before_lt: beforeLt,
                limit,
                sort_order: sortOrder,
            },
        });
    }
    execGetMethodForBlockchainAccount(accountId, methodName, args) {
        return this.sendGet({
            path: `/v2/blockchain/accounts/${accountId}/methods/${methodName}`,
            queryParams: { args },
        });
    }
    sendBlockchainMessage(requestBody) {
        return this.sendPost({
            path: '/v2/blockchain/message',
            body: requestBody,
        });
    }
    getBlockchainConfig() {
        return this.sendGet({
            path: '/v2/blockchain/config',
        });
    }
    getRawBlockchainConfig() {
        return this.sendGet({
            path: '/v2/blockchain/config/raw',
        });
    }
    blockchainAccountInspect(accountId) {
        return this.sendGet({
            path: `/v2/blockchain/accounts/${accountId}/inspect`,
        });
    }
    addressParse(accountId) {
        return this.sendGet({
            path: `/v2/address/${accountId}/parse`,
        });
    }
    getAccounts(currency, requestBody) {
        return this.sendPost({
            path: '/v2/accounts/_bulk',
            body: requestBody,
            queryParams: { currency },
        });
    }
    getAccount(accountId) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}`,
        });
    }
    accountDnsBackResolve(accountId) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/dns/backresolve`,
        });
    }
    getAccountJettonsBalances(accountId, currencies) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/jettons`,
            queryParams: { currencies },
        });
    }
    getAccountJettonBalance(accountId, jettonId, currencies) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/jettons/${jettonId}`,
            queryParams: { currencies },
        });
    }
    getAccountJettonsHistory(accountId, limit, beforeLt, startDate, endDate) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/jettons/history`,
            queryParams: { before_lt: beforeLt, limit, start_date: startDate, end_date: endDate },
        });
    }
    getAccountJettonHistoryById(accountId, jettonId, limit, beforeLt, startDate, endDate) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/jettons/${jettonId}/history`,
            queryParams: { before_lt: beforeLt, limit, start_date: startDate, end_date: endDate },
        });
    }
    getAccountNftItems(accountId, collection, limit, indirectOwnership, offset) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/nfts`,
            queryParams: { collection, limit, offset, indirect_ownership: indirectOwnership },
        });
    }
    getAccountEvents(accountId, limit, initiator, subjectOnly, beforeLt, startDate, endDate) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/events`,
            queryParams: { initiator, subject_only: subjectOnly, before_lt: beforeLt, limit, start_date: startDate, end_date: endDate },
        });
    }
    getAccountEvent(accountId, eventId, subjectOnly) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/events/${eventId}`,
            queryParams: { subject_only: subjectOnly },
        });
    }
    getAccountTraces(accountId, beforeLt, limit) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/traces`,
            queryParams: { before_lt: beforeLt, limit },
        });
    }
    getAccountSubscriptions(accountId) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/subscriptions`,
        });
    }
    reindexAccount(accountId) {
        return this.sendPost({
            path: `/v2/accounts/${accountId}/reindex`,
        });
    }
    searchAccounts(name) {
        return this.sendGet({
            path: '/v2/accounts/search',
            queryParams: { name },
        });
    }
    getAccountDnsExpiring(accountId, period) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/dns/expiring`,
            queryParams: { period },
        });
    }
    getAccountPublicKey(accountId) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/publickey`,
        });
    }
    getAccountMultisigs(accountId) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/multisigs`,
        });
    }
    getAccountDiff(accountId, startDate, endDate) {
        return this.sendGet({
            path: `/v2/accounts/${accountId}/diff`,
            queryParams: { start_date: startDate, end_date: endDate },
        });
    }
    // Ton Http API
    getAddressInformation(address) {
        return this.sendGet({
            path: `/getAddressInformation`,
            queryParams: { address },
        });
    }
    getExtendedAddressInformation(address) {
        return this.sendGet({
            path: `/getExtendedAddressInformation`,
            queryParams: { address },
        });
    }
    getWalletInformation(address) {
        return this.sendGet({
            path: `/getWalletInformation`,
            queryParams: { address },
        });
    }
    getTransactions(params) {
        return this.sendGet({
            path: `/getTransactions`,
            queryParams: params,
        });
    }
    getAddressBalance(address) {
        return this.sendGet({
            path: `/getAddressBalance`,
            queryParams: { address },
        });
    }
    getAddressState(address) {
        return this.sendGet({
            path: `/getAddressState`,
            queryParams: { address },
        });
    }
    packAddress(address) {
        return this.sendGet({
            path: `/packAddress`,
            queryParams: { address },
        });
    }
    unpackAddress(address) {
        return this.sendGet({
            path: `/unpackAddress`,
            queryParams: { address },
        });
    }
    getTokenData(address) {
        return this.sendGet({
            path: `/getTokenData`,
            queryParams: { address },
        });
    }
    detectAddress(address) {
        return this.sendGet({
            path: `/detectAddress`,
            queryParams: { address },
        });
    }
    getMasterchainInfo() {
        return this.sendGet({
            path: `/getMasterchainInfo`,
        });
    }
    getMasterchainBlockSignatures(seqno) {
        return this.sendGet({
            path: `/getMasterchainBlockSignatures`,
            queryParams: { seqno },
        });
    }
    getShardBlockProof(params) {
        return this.sendGet({
            path: `/getShardBlockProof`,
            queryParams: params,
        });
    }
    getConsensusBlock() {
        return this.sendGet({
            path: `/getConsensusBlock`,
        });
    }
    lookupBlock(params) {
        return this.sendGet({
            path: `/lookupBlock`,
            queryParams: params,
        });
    }
    shards(seqno) {
        return this.sendGet({
            path: `/shards`,
            queryParams: { seqno },
        });
    }
    getBlockTransactions(params) {
        return this.sendGet({
            path: `/getBlockTransactions`,
            queryParams: params,
        });
    }
    getBlockTransactionsExt(params) {
        return this.sendGet({
            path: `/getBlockTransactionsExt`,
            queryParams: params,
        });
    }
    getBlockHeader(params) {
        return this.sendGet({
            path: `/getBlockHeader`,
            queryParams: params,
        });
    }
    getOutMsqQueueSizes() {
        return this.sendGet({
            path: `/getOutMsqQueueSizes`,
        });
    }
    tryLocateTx(params) {
        return this.sendGet({
            path: `/tryLocateTx`,
            queryParams: params,
        });
    }
    tryLocateResultTx(params) {
        return this.sendGet({
            path: `/tryLocateResultTx`,
            queryParams: params,
        });
    }
    tryLocateSourceTx(params) {
        return this.sendGet({
            path: `/tryLocateSourceTx`,
            queryParams: params,
        });
    }
    runGetMethod(params) {
        return this.sendPost({
            path: `/runGetMethod`,
            body: params,
        });
    }
    sendBoc(params) {
        return this.sendPost({
            path: `/sendBoc`,
            body: params,
        });
    }
    sendBocReturnHash(params) {
        return this.sendPost({
            path: `/sendBocReturnHash`,
            body: params,
        });
    }
    sendQuery(params) {
        return this.sendPost({
            path: `/sendQuery`,
            body: params,
        });
    }
    estimateFee(params) {
        return this.sendPost({
            path: `/estimateFee`,
            body: params,
        });
    }
    jsonRPC(params) {
        return this.sendPost({
            path: `/jsonRPC`,
            body: params,
        });
    }
}
exports.AbstractTonRpc = AbstractTonRpc;
//# sourceMappingURL=AbstractTonRpc.js.map