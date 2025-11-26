"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractBeaconV1EvmRpc = void 0;
const util_1 = require("../../../util");
class AbstractBeaconV1EvmRpc {
    sendGet(path, params, prefix) {
        const fullPath = util_1.Utils.addQueryParams({
            basePath: `${prefix ?? util_1.Constant.BEACON_PREFIX}/${path}`,
            strategy: util_1.Utils.camelToSnakeCase,
            queryParams: params,
        });
        return this.get({ path: fullPath });
    }
    getBlockAttestations({ blockId, ...rest }) {
        return this.sendGet(`blocks/${blockId}/attestations`, rest);
    }
    getBlockHeader({ blockId, ...rest }) {
        return this.sendGet(`blocks/${blockId}/header`, rest);
    }
    getBlockHeaders({ slot, parentRoot, ...rest } = {}) {
        const queryParams = {
            ...(slot ? { slot } : {}),
            ...(parentRoot ? { parentRoot } : {}),
            ...rest,
        };
        return this.sendGet(`headers`, queryParams);
    }
    getBlockRoot({ blockId, ...rest }) {
        return this.sendGet(`blocks/${blockId}/root`, rest);
    }
    getGenesis() {
        return this.sendGet('genesis', {});
    }
    getStateCommittees({ stateId, ...rest }) {
        return this.sendGet(`states/${stateId}/committees`, rest);
    }
    getStateFinalityCheckpoints({ stateId, ...rest }) {
        return this.sendGet(`states/${stateId}/finality_checkpoints`, rest);
    }
    getStateFork({ stateId, ...rest }) {
        return this.sendGet(`states/${stateId}/fork`, rest);
    }
    getStateRoot({ stateId, ...rest }) {
        return this.sendGet(`states/${stateId}/root`, rest);
    }
    getStateSyncCommittees({ stateId, ...rest }) {
        return this.sendGet(`states/${stateId}/sync_committees`, rest);
    }
    getStateValidator({ stateId, validatorId, ...rest }) {
        return this.sendGet(`states/${stateId}/validators/${validatorId}`, rest);
    }
    getStateValidatorBalances({ stateId, ...rest }) {
        return this.sendGet(`states/${stateId}/validator_balances`, rest);
    }
    getStateValidators({ stateId, ...rest }) {
        return this.sendGet(`states/${stateId}/validators`, rest);
    }
    getNodeVersion() {
        return this.sendGet('node/version', {}, util_1.Constant.BEACON_BASE_PREFIX);
    }
}
exports.AbstractBeaconV1EvmRpc = AbstractBeaconV1EvmRpc;
//# sourceMappingURL=AbstractBeaconV1EvmRpc.js.map