"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractIotaRpc = void 0;
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
let AbstractIotaRpc = class AbstractIotaRpc {
    async sendGet({ path, queryParams }) {
        return this.get({ path: util_1.Utils.addQueryParams({ basePath: path, queryParams: queryParams }) });
    }
    getNodeHealth() {
        return this.get({ path: '/health' });
    }
    getAvailableRouteGroups() {
        return this.get({ path: '/api/routes' });
    }
    getNodeInfo() {
        return this.get({ path: '/api/core/v2/info' });
    }
    getTips() {
        return this.get({ path: '/api/core/v2/tips' });
    }
    submitBlock(params) {
        return this.post({ path: '/api/core/v2/blocks', body: params });
    }
    getBlockDataById(params) {
        return this.get({ path: `/api/core/v2/blocks/${params.blockId}` });
    }
    getBlockMetadata(params) {
        return this.get({ path: `/api/core/v2/blocks/${params.blockId}/metadata` });
    }
    findOutputById(outputId) {
        return this.get({ path: `/api/core/v2/outputs/${encodeURIComponent(outputId)}` });
    }
    getOutputMetadata(outputId) {
        return this.get({ path: `/api/core/v2/outputs/${encodeURIComponent(outputId)}/metadata` });
    }
    getAllReceipts() {
        return this.get({ path: `/api/core/v2/receipts` });
    }
    getReceiptsByMigrationIndex(migratedAt) {
        return this.get({ path: `/api/core/v2/receipts/${migratedAt}` });
    }
    getTransactionIncludedBlock(transactionId) {
        return this.get({ path: `/api/core/v2/transactions/${transactionId}/included-block` });
    }
    findIncludedBlockMetadata(transactionId) {
        return this.get({ path: `/api/core/v2/transactions/${transactionId}/included-block/metadata` });
    }
    getMilestoneById(milestoneId) {
        return this.get({ path: `/api/core/v2/milestones/${milestoneId}` });
    }
    getMilestoneUtxoChangesByMilestone(milestoneId) {
        return this.get({ path: `/api/core/v2/milestones/${milestoneId}/utxo-changes` });
    }
    lookupMilestoneByIndex(index) {
        return this.get({ path: `/api/core/v2/milestones/by-index/${index}` });
    }
    getMilestoneUtxoChangesById(index) {
        return this.get({ path: `/api/core/v2/milestones/by-index/${index}/utxo-changes` });
    }
    computeMerkleRouteHashes(params) {
        return this.post({ path: '/api/core/v2/whiteflag', body: params });
    }
    pruneDatabase(request) {
        return this.post({ path: '/api/core/v2/control/database/prune', body: request });
    }
    createSnapshot(requestData) {
        return this.post({ path: `/api/core/v2/control/snapshot/create`, body: requestData });
    }
    getTreasuryInformation() {
        return this.get({ path: '/api/core/v2/treasury' });
    }
    getPeerInfo(peerId) {
        return this.get({ path: `api/core/v2/peers/${peerId}` });
    }
    getPeers() {
        return this.get({ path: '/api/core/v2/peers' });
    }
    addPeer(peerData) {
        return this.post({ path: '/api/core/v2/peers', body: peerData });
    }
    getOutputs(params) {
        return this.sendGet({ path: '/api/indexer/v1/outputs', queryParams: params });
    }
    getBasicOutputs(params) {
        return this.sendGet({ path: '/api/indexer/v1/outputs/basic', queryParams: params });
    }
    getAliasOutputs(params) {
        return this.sendGet({ path: '/api/indexer/v1/outputs/alias', queryParams: params });
    }
    getCurrentUnspentAliasOutput(aliasId) {
        return this.sendGet({ path: `/api/indexer/v1/outputs/alias/${aliasId}` });
    }
    getFoundryOutputs(params) {
        return this.sendGet({ path: '/api/indexer/v1/outputs/foundry', queryParams: params });
    }
    getCurrentUnspentFoundryOutput(foundryId) {
        return this.sendGet({ path: `/api/indexer/v1/outputs/foundry/${foundryId}` });
    }
    getNftOutputs(params) {
        return this.sendGet({ path: '/api/indexer/v1/outputs/nft', queryParams: params });
    }
    getCurrentNftOutput(nftId) {
        return this.sendGet({ path: `/api/indexer/v1/outputs/nft/${nftId}` });
    }
    async getBalanceByAddress(address) {
        return this.sendGet({ path: `/api/explorer/v2/balance/${address}` });
    }
    async getBlockChildren(blockId) {
        return this.sendGet({ path: `/api/explorer/v2/blocks/${blockId}/children` });
    }
    async getMilestones(params) {
        return this.sendGet({
            path: `/api/explorer/v2/milestones`,
            queryParams: params,
        });
    }
    async getBlocksByMilestone(params) {
        const { milestoneId, ...rest } = params;
        return this.sendGet({
            path: `/api/explorer/v2/milestones/${milestoneId}/blocks`,
            queryParams: rest,
        });
    }
    async getBlocksByMilestoneIndex(params) {
        const { milestoneIndex, ...rest } = params;
        return this.sendGet({
            path: `/api/explorer/v2/milestones/by-index/${milestoneIndex}/blocks`,
            queryParams: rest,
        });
    }
    async getLedgerUpdatesByAddress(params) {
        const { address, ...rest } = params;
        return this.sendGet({
            path: `/api/explorer/v2/ledger/updates/by-address/${address}`,
            queryParams: rest,
        });
    }
    async getLedgerUpdatesByMilestone(params) {
        const { milestoneId, ...rest } = params;
        return this.sendGet({
            path: `/api/explorer/v2/ledger/updates/by-milestone/${milestoneId}`,
            queryParams: rest,
        });
    }
    async getTopRichestAddresses(params) {
        return this.sendGet({
            path: `/api/explorer/v2/ledger/richest-addresses`,
            queryParams: params,
        });
    }
    async getTokenDistribution(ledgerIndex) {
        return this.sendGet({
            path: `/api/explorer/v2/ledger/token-distribution`,
            queryParams: { ledgerIndex },
        });
    }
    async authenticate(params) {
        return this.post({
            path: '/auth',
            body: params,
        });
    }
    async authInfo() {
        return this.sendGet({ path: '/auth/info' });
    }
    async getChains() {
        return this.sendGet({ path: '/v1/chains' });
    }
    async getChainInfo(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}`, queryParams: rest });
    }
    async removeAccessNode(params) {
        const { chainID, peer } = params;
        return this.delete({ path: `/v1/chains/${chainID}/remove-node/${peer}` });
    }
    async addAccessNode(params) {
        const { chainID, peer } = params;
        return this.put({ path: `/v1/chains/${chainID}/access-node/${peer}` });
    }
    async activateChain(params) {
        return this.post({ path: `/v1/chains/${params.chainID}/activate` });
    }
    async callView(params) {
        const { chainID, ...rest } = params;
        return this.post({ path: `/v1/chains/${chainID}/callview`, body: rest });
    }
    async setChainRecord(params) {
        const { chainID, ...rest } = params;
        return this.post({ path: `/v1/chains/${params.chainID}/chainrecord`, body: rest });
    }
    async getCommitteeInfo(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/committee`, queryParams: rest });
    }
    async getContracts(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${params.chainID}/contracts`, queryParams: rest });
    }
    async getAccounts(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/accounts`, queryParams: rest });
    }
    async accountsGetAccountBalance(params) {
        const { chainID, agentID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/accounts/${agentID}/balance`, queryParams: rest });
    }
    async accountsGetAccountFoundries(params) {
        const { chainID, agentID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/accounts/${agentID}/foundries`,
            queryParams: rest,
        });
    }
    async accountsGetAccountNFTIDs(params) {
        const { chainID, agentID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/accounts/${agentID}/nfts`, queryParams: rest });
    }
    async accountsGetAccountNonce(params) {
        const { chainID, agentID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/accounts/${agentID}/nonce`, queryParams: rest });
    }
    async accountsGetFoundryOutput(params) {
        const { chainID, serialNumber, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/accounts/foundry_output/${serialNumber}`,
            queryParams: rest,
        });
    }
    async accountsGetNFTData(params) {
        const { chainID, nftID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/accounts/nftdata/${nftID}`, queryParams: rest });
    }
    async accountsGetNativeTokenIDRegistry(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/accounts/token_registry`,
            queryParams: rest,
        });
    }
    async accountsGetTotalAssets(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/accounts/total_assets`, queryParams: rest });
    }
    async blobsGetAllBlobs(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/blobs`, queryParams: rest });
    }
    async blobsGetBlobInfo(params) {
        const { chainID, blobHash, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/blobs/${blobHash}`, queryParams: rest });
    }
    async blobsGetBlobValue(params) {
        const { chainID, blobHash, fieldKey, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blobs/${blobHash}/data/${fieldKey}`,
            queryParams: rest,
        });
    }
    async blocklogGetLatestBlockInfo(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/blocklog/blocks/latest`, queryParams: rest });
    }
    async blocklogGetRequestReceiptsOfLatestBlock(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/blocks/latest/receipts`,
            queryParams: rest,
        });
    }
    async blocklogGetRequestIDsForLatestBlock(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/blocks/latest/requestids`,
            queryParams: rest,
        });
    }
    async blocklogGetBlockInfo(params) {
        const { chainID, blockIndex, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/blocks/${blockIndex}`,
            queryParams: rest,
        });
    }
    async blocklogGetRequestReceiptsOfBlock(params) {
        const { chainID, blockIndex, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/blocks/${blockIndex}/receipts`,
            queryParams: rest,
        });
    }
    async blocklogGetRequestIDsForBlock(params) {
        const { chainID, blockIndex, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/blocks/${blockIndex}/requestids`,
            queryParams: rest,
        });
    }
    async blocklogGetControlAddresses(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/controladdresses`,
            queryParams: rest,
        });
    }
    async blocklogGetEventsOfLatestBlock(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/events/latest`,
            queryParams: rest,
        });
    }
    async blocklogGetEventsOfBlock(params) {
        const { chainID, blockIndex, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/events/${blockIndex}`,
            queryParams: rest,
        });
    }
    async blocklogGetEventsOfContract(params) {
        const { chainID, contractHname, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/events/contract/${contractHname}`,
            queryParams: rest,
        });
    }
    async blocklogGetEventsOfRequest(params) {
        const { chainID, requestID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/events/request/${requestID}`,
            queryParams: rest,
        });
    }
    async blocklogGetRequestReceipt(params) {
        const { chainID, requestID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/requests/${requestID}`,
            queryParams: rest,
        });
    }
    async blocklogGetRequestIsProcessed(params) {
        const { chainID, requestID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/blocklog/requests/${requestID}/processed`,
            queryParams: rest,
        });
    }
    async errorsGetErrorMessageFormat(params) {
        const { chainID, contractHname, errorID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/errors/${contractHname}/message/${errorID}`,
            queryParams: rest,
        });
    }
    async getAllowedStateControllerAddresses(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({
            path: `/v1/chains/${chainID}/core/governance/allowedstatecontrollers`,
            queryParams: rest,
        });
    }
    async governanceGetChainInfo(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/governance/chaininfo`, queryParams: rest });
    }
    async governanceGetChainOwner(params) {
        const { chainID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/core/governance/chainowner`, queryParams: rest });
    }
    async deactivateChain(params) {
        return this.post({ path: `/v1/chains/${params.chainID}/deactivate` });
    }
    async estimateGasOffledger(params, requestBody) {
        return this.post({ path: `/v1/chains/${params.chainID}/estimategas-offledger`, body: requestBody });
    }
    async estimateGasOnledger(params, requestBody) {
        return this.post({ path: `/v1/chains/${params.chainID}/estimategas-onledger`, body: requestBody });
    }
    async submitJSONRPCRequest(params) {
        return this.post({ path: `/v1/chains/${params.chainID}/evm`, body: {} });
    }
    async getMempoolContents(params) {
        return this.sendGet({ path: `/v1/chains/${params.chainID}/mempool` });
    }
    async getReceipt(params) {
        const { chainID, requestID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/receipts/${requestID}`, queryParams: rest });
    }
    async waitForRequest(params) {
        const { chainID, requestID, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/requests/${requestID}/wait`, queryParams: rest });
    }
    async getStateValue(params) {
        const { chainID, stateKey, ...rest } = params;
        return this.sendGet({ path: `/v1/chains/${chainID}/state/${stateKey}`, queryParams: rest });
    }
    async getChainMessageMetrics(params) {
        return this.sendGet({ path: `/v1/metrics/chains/${params.chainID}/messages` });
    }
    async getChainPipeMetrics(params) {
        return this.sendGet({ path: `/v1/metrics/chains/${params.chainID}/pipes` });
    }
    async getChainWorkflowMetrics(params) {
        return this.sendGet({ path: `/v1/metrics/chains/${params.chainID}/workflows` });
    }
    async getNodeMessageMetrics() {
        return this.sendGet({ path: `/v1/metrics/node/messages` });
    }
    async getConfiguration() {
        return this.sendGet({ path: `/v1/node/config` });
    }
    async generateDKS(params) {
        return this.post({ path: `/v1/node/dks`, body: params });
    }
    async getDKSInfo(sharedAddress) {
        return this.sendGet({ path: `/v1/node/dks/${sharedAddress}` });
    }
    async getInfo() {
        return this.sendGet({ path: `/v1/node/info` });
    }
    async ownerCertificate() {
        return this.sendGet({ path: `/v1/node/owner/certificate` });
    }
    async getAllPeers() {
        return this.sendGet({ path: `/v1/node/peers` });
    }
    async getPeeringIdentity() {
        return this.sendGet({ path: `/v1/node/peers/identity` });
    }
    async getTrustedPeers() {
        return this.sendGet({ path: `/v1/node/peers/trusted` });
    }
    async trustPeer(requestBody) {
        return this.post({ path: `/v1/node/peers/trusted`, body: requestBody });
    }
    async distrustPeer(peer) {
        return this.delete({ path: `/v1/node/peers/trusted/${peer}` });
    }
    async shutdownNode() {
        return this.post({ path: `/v1/node/shutdown` });
    }
    async getVersion() {
        return this.sendGet({ path: `/v1/node/version` });
    }
    async offLedger(requestBody) {
        return this.post({ path: `/v1/requests/offledger`, body: requestBody });
    }
    async getUsers() {
        return this.sendGet({ path: `/v1/users` });
    }
    async addUser(body) {
        return this.post({ path: `/v1/users`, body });
    }
    async deleteUser(username) {
        return this.delete({ path: `/v1/users/${username}` });
    }
    async getUser(username) {
        return this.sendGet({ path: `/v1/users/${username}` });
    }
    async changeUserPassword(params) {
        return this.put({ path: `/v1/users/${params.username}/password`, body: params });
    }
    async changeUserPermissions(params) {
        return this.put({ path: `/v1/users/${params.username}/permissions`, body: params });
    }
};
exports.AbstractIotaRpc = AbstractIotaRpc;
exports.AbstractIotaRpc = AbstractIotaRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractIotaRpc);
//# sourceMappingURL=AbstractIotaRpc.js.map