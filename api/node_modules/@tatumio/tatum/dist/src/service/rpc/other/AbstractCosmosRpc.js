"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractCosmosRpc = void 0;
const AbstractCardanoRpc_1 = require("./AbstractCardanoRpc");
const util_1 = require("../../../util");
class AbstractCosmosRpc extends AbstractCardanoRpc_1.AbstractCardanoRpc {
    async sendGet({ path, queryParams, }) {
        return this.get({
            path: util_1.Utils.addQueryParams({
                basePath: path,
                queryParams: queryParams,
            })
        });
    }
    getAccounts(params) {
        return this.sendGet({
            path: '/api/cosmos/auth/v1beta1/accounts',
            queryParams: params
        });
    }
    getAccountDetails(params) {
        const { address } = params;
        return this.sendGet({
            path: `/api/cosmos/auth/v1beta1/accounts/${address}`,
        });
    }
    getAllParams() {
        return this.sendGet({
            path: '/api/cosmos/auth/v1beta1/params',
        });
    }
    getAllBalances(params) {
        const { address, ...paginationParams } = params;
        return this.sendGet({
            path: `/api/cosmos/bank/v1beta1/balances/${address}`,
            queryParams: paginationParams
        });
    }
    getDenomsMetadata(params) {
        return this.sendGet({
            path: '/api/cosmos/bank/v1beta1/denoms_metadata',
            queryParams: params
        });
    }
    getDenomMetadata(params) {
        const { denom } = params;
        return this.sendGet({
            path: `/api/cosmos/bank/v1beta1/denoms_metadata/${denom}`,
        });
    }
    getBankParams() {
        return this.sendGet({
            path: '/api/cosmos/bank/v1beta1/params',
        });
    }
    getTotalSupply(params) {
        return this.sendGet({
            path: '/api/cosmos/bank/v1beta1/supply',
            queryParams: params
        });
    }
    getSupplyOfCoin(params) {
        const { denom } = params;
        return this.sendGet({
            path: `/api/cosmos/bank/v1beta1/supply/${denom}`,
        });
    }
    getLatestBlock() {
        return this.sendGet({
            path: '/api/cosmos/base/tendermint/v1beta1/blocks/latest',
        });
    }
    getBlockByHeight(params) {
        const { height } = params;
        return this.sendGet({
            path: `/api/cosmos/base/tendermint/v1beta1/blocks/${height}`,
        });
    }
    getNodeInfo() {
        return this.sendGet({
            path: '/api/cosmos/base/tendermint/v1beta1/node_info',
        });
    }
    getSyncing() {
        return this.sendGet({
            path: '/api/cosmos/base/tendermint/v1beta1/syncing',
        });
    }
    getLatestValidatorSet(params) {
        return this.sendGet({
            path: '/api/cosmos/base/tendermint/v1beta1/validatorsets/latest',
            queryParams: params
        });
    }
    getValidatorSetByHeight(params) {
        const { height, ...paginationParams } = params;
        return this.sendGet({
            path: `/api/cosmos/base/tendermint/v1beta1/validatorsets/${height}`,
            queryParams: paginationParams
        });
    }
    getCommunityPool() {
        return this.sendGet({
            path: '/api/cosmos/distribution/v1beta1/community_pool',
        });
    }
    getDelegationTotalRewards(params) {
        const { delegator_address } = params;
        return this.sendGet({
            path: `/api/cosmos/distribution/v1beta1/delegators/${delegator_address}/rewards`,
        });
    }
    getDelegationRewards(params) {
        const { delegator_address, validator_address } = params;
        return this.sendGet({
            path: `/api/cosmos/distribution/v1beta1/delegators/${delegator_address}/rewards/${validator_address}`,
        });
    }
    getDelegatorValidators(params) {
        const { delegator_address } = params;
        return this.sendGet({
            path: `/api/cosmos/distribution/v1beta1/delegators/${delegator_address}/validators`,
        });
    }
    getDelegatorWithdrawAddress(params) {
        const { delegator_address } = params;
        return this.sendGet({
            path: `/api/cosmos/distribution/v1beta1/delegators/${delegator_address}/withdraw_address`,
        });
    }
    getDistributionParams() {
        return this.sendGet({
            path: '/api/cosmos/distribution/v1beta1/params',
        });
    }
    getValidatorCommission(params) {
        const { validator_address } = params;
        return this.sendGet({
            path: `/api/cosmos/distribution/v1beta1/validators/${validator_address}/commission`,
        });
    }
    getValidatorOutstandingRewards(params) {
        const { validator_address } = params;
        return this.sendGet({
            path: `/api/cosmos/distribution/v1beta1/validators/${validator_address}/outstanding_rewards`,
        });
    }
    getValidatorSlashes(params) {
        const { validator_address, ...paginationParams } = params;
        return this.sendGet({
            path: `/api/cosmos/distribution/v1beta1/validators/${validator_address}/slashes`,
            queryParams: paginationParams
        });
    }
    getAllEvidence(params) {
        return this.sendGet({
            path: '/api/cosmos/evidence/v1beta1/evidence',
            queryParams: params
        });
    }
    getGovernanceParams(params) {
        const { params_type } = params;
        return this.sendGet({
            path: `/api/cosmos/gov/v1beta1/params/${params_type}`,
        });
    }
    getAllProposals(params) {
        return this.sendGet({
            path: '/api/cosmos/gov/v1beta1/proposals',
            queryParams: params
        });
    }
    getProposalDetails(params) {
        const { proposal_id } = params;
        return this.sendGet({
            path: `/api/cosmos/gov/v1beta1/proposals/${proposal_id}`,
        });
    }
    getDeposits(params) {
        const { proposal_id } = params;
        return this.sendGet({
            path: `/api/cosmos/gov/v1beta1/proposals/${proposal_id}/deposits`,
        });
    }
    getTallyResult(params) {
        const { proposal_id } = params;
        return this.sendGet({
            path: `/api/cosmos/gov/v1beta1/proposals/${proposal_id}/tally`,
        });
    }
    getVotes(params) {
        const { proposal_id, ...paginationParams } = params;
        return this.sendGet({
            path: `/api/cosmos/gov/v1beta1/proposals/${proposal_id}/votes`,
            queryParams: paginationParams
        });
    }
    getVote(params) {
        const { proposal_id, voter } = params;
        return this.sendGet({
            path: `/api/cosmos/gov/v1beta1/proposals/${proposal_id}/votes/${voter}`,
        });
    }
    getAnnualProvisions() {
        return this.sendGet({
            path: '/api/cosmos/mint/v1beta1/annual_provisions',
        });
    }
    getInflation() {
        return this.sendGet({
            path: '/api/cosmos/mint/v1beta1/inflation',
        });
    }
    getMintingParams() {
        return this.sendGet({
            path: '/api/cosmos/mint/v1beta1/params',
        });
    }
    getSpecificParam(params) {
        const { subspace, key } = params;
        return this.sendGet({
            path: '/api/cosmos/params/v1beta1/params',
            queryParams: { subspace, key }
        });
    }
    getSlashingParams() {
        return this.sendGet({
            path: '/api/cosmos/slashing/v1beta1/params',
        });
    }
    getSigningInfos() {
        return this.sendGet({
            path: '/api/cosmos/slashing/v1beta1/signing_infos',
        });
    }
    getSingingInfoByConsAddress(params) {
        const { cons_address } = params;
        return this.sendGet({
            path: `/api/cosmos/slashing/v1beta1/signing_infos/${cons_address}`,
        });
    }
    getDelegations(params) {
        const { delegator_address, ...paginationParams } = params;
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/delegations/${delegator_address}`,
            queryParams: paginationParams
        });
    }
    getRedelegations(params) {
        const { delegator_addr, ...queryParams } = params;
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/delegators/${delegator_addr}/redelegations`,
            queryParams: queryParams
        });
    }
    getUnbondingDelegations(params) {
        const { delegator_addr, ...paginationParams } = params;
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/delegators/${delegator_addr}/unbonding_delegations`,
            queryParams: paginationParams
        });
    }
    getValidators(params) {
        const { delegator_addr, ...paginationParams } = params;
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/delegators/${delegator_addr}/validators`,
            queryParams: paginationParams
        });
    }
    getValidatorInfo(params) {
        const { delegator_addr, validator_addr } = params;
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/delegators/${delegator_addr}/validators/${validator_addr}`,
        });
    }
    getHistoricalInfo(params) {
        const { height } = params;
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/historical_info/${height}`,
        });
    }
    getStakingParams() {
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/params`,
        });
    }
    getPoolInfo() {
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/pool`,
        });
    }
    getValidatorsForGivenStatus(params) {
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/validators`,
            queryParams: params
        });
    }
    getValidatorInfoForAddress(params) {
        const { validator_addr } = params;
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/validators/${validator_addr}`,
        });
    }
    getDelegationsForValidator(params) {
        const { validator_addr, ...paginationParams } = params;
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/validators/${validator_addr}/delegations`,
            queryParams: paginationParams
        });
    }
    getUnbondingDelegation(params) {
        const { validator_addr, delegator_addr } = params;
        return this.sendGet({
            path: `/api/cosmos/staking/v1beta1/validators/${validator_addr}/delegations/${delegator_addr}/unbonding_delegation`,
        });
    }
    getAppliedPlan(params) {
        const { name } = params;
        return this.sendGet({
            path: `/api/cosmos/upgrade/v1beta1/applied_plan/${name}`,
        });
    }
    getCurrentPlan() {
        return this.sendGet({
            path: `/api/cosmos/upgrade/v1beta1/current_plan`,
        });
    }
    getModuleVersions() {
        return this.sendGet({
            path: `/api/cosmos/upgrade/v1beta1/module_versions`,
        });
    }
    getUpgradedConsensusState(lastHeight) {
        return this.sendGet({
            path: `/api/cosmos/upgrade/v1beta1/upgraded_consensus_state/${lastHeight}`,
        });
    }
    getGrants(params) {
        return this.sendGet({
            path: `/api/cosmos/authz/v1beta1/grants`,
            queryParams: params,
        });
    }
    getAllowance(params) {
        const { granter, grantee } = params;
        return this.sendGet({
            path: `/api/cosmos/feegrant/v1beta1/allowance/${granter}/${grantee}`,
        });
    }
    getAllowanceForAddress(params) {
        const { grantee } = params;
        return this.sendGet({
            path: `/api/cosmos/feegrant/v1beta1/allowances/${grantee}`,
        });
    }
    simulate(params) {
        return this.sendPost({
            path: '/api/cosmos/tx/v1beta1/simulates',
            body: params,
        });
    }
    getTxsByEvent(params) {
        return this.sendGet({
            path: '/api/cosmos/tx/v1beta1/txs',
            queryParams: params,
        });
    }
    broadcastTx(params) {
        return this.sendPost({
            path: '/api/cosmos/tx/v1beta1/txs',
            body: params,
        });
    }
    getTxByHash(hash) {
        return this.sendGet({
            path: `/api/cosmos/tx/v1beta1/txs/${hash}`,
        });
    }
}
exports.AbstractCosmosRpc = AbstractCosmosRpc;
//# sourceMappingURL=AbstractCosmosRpc.js.map