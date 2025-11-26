"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractCasperRpc = void 0;
class AbstractCasperRpc {
    getBlockIdentifier(block_identifier) {
        if (typeof block_identifier === 'number') {
            return { Height: block_identifier };
        }
        else {
            return { Hash: block_identifier };
        }
    }
    async accountPutDeploy(deploy) {
        return this.rpcCall('account_put_deploy', [deploy]);
    }
    async speculativeExec(params) {
        return this.rpcCall('speculative_exec', params);
    }
    async chainGetBlock(block_identifier) {
        return this.rpcCall('chain_get_block', [this.getBlockIdentifier(block_identifier)]);
    }
    async chainGetBlockTransfers(block_identifier) {
        return this.rpcCall('chain_get_block_transfers', [this.getBlockIdentifier(block_identifier)]);
    }
    async chainGetEraSummary(block_identifier) {
        const paramsRequest = block_identifier ? [this.getBlockIdentifier(block_identifier)] : [];
        return this.rpcCall('chain_get_era_summary', paramsRequest);
    }
    async chainGetStateRootHash(block_identifier) {
        const paramsRequest = block_identifier ? [this.getBlockIdentifier(block_identifier)] : [];
        return this.rpcCall('chain_get_state_root_hash', paramsRequest);
    }
    async infoGetChainspec() {
        return this.rpcCall('info_get_chainspec', []);
    }
    async infoGetDeploy(params) {
        const paramsRequest = [params.deploy_hash];
        if (params.finalized_approvals !== undefined) {
            paramsRequest.push(params.finalized_approvals);
        }
        return this.rpcCall('info_get_deploy', paramsRequest);
    }
    async queryBalance(params) {
        const paramsRequest = [
            { name: "state_identifier", value: params.state_identifier },
            { name: "purse_identifier", value: params.purse_identifier },
        ];
        return this.rpcCall('query_balance', paramsRequest);
    }
    async queryGlobalState(params) {
        const paramsRequest = [
            { name: "state_identifier", value: params.state_identifier },
            { name: "key", value: params.key },
            { name: "path", value: params.path }
        ];
        return this.rpcCall('query_global_state', paramsRequest);
    }
    async stateGetAccountInfo(params) {
        const paramsRequest = [{ Hash: params.block_identifier }, params.public_key];
        return this.rpcCall('state_get_account_info', paramsRequest);
    }
    async stateGetDictionaryItem(params) {
        const paramsRequest = [params.dictionary_identifier, params.state_root_hash];
        return this.rpcCall('state_get_dictionary_item', paramsRequest);
    }
    async infoGetStatus() {
        return this.rpcCall('info_get_status', []);
    }
}
exports.AbstractCasperRpc = AbstractCasperRpc;
//# sourceMappingURL=AbstractCasperRpc.js.map