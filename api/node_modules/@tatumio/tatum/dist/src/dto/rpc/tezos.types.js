"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartRollupRefuteGameEndedReason = exports.SmartRollupRefuteGameEndedPlayerOutcomes = exports.SmartRollupRefuteGameStatusOptions = exports.SmartRollupRefuteRevealProofKind = exports.SmartRollupInputProofKind = exports.SmartRollupRefutationOptions = exports.PvmKind = exports.METADATA_BALANCE_UPDATES_CATEGORY = exports.OPERATION_METADATA = exports.OpKind = void 0;
var OpKind;
(function (OpKind) {
    OpKind["ORIGINATION"] = "origination";
    OpKind["DELEGATION"] = "delegation";
    OpKind["REVEAL"] = "reveal";
    OpKind["TRANSACTION"] = "transaction";
    OpKind["ACTIVATION"] = "activate_account";
    OpKind["ENDORSEMENT"] = "endorsement";
    OpKind["PREENDORSEMENT"] = "preendorsement";
    OpKind["SET_DEPOSITS_LIMIT"] = "set_deposits_limit";
    OpKind["DOUBLE_PREENDORSEMENT_EVIDENCE"] = "double_preendorsement_evidence";
    OpKind["ENDORSEMENT_WITH_SLOT"] = "endorsement_with_slot";
    OpKind["SEED_NONCE_REVELATION"] = "seed_nonce_revelation";
    OpKind["DOUBLE_ENDORSEMENT_EVIDENCE"] = "double_endorsement_evidence";
    OpKind["DOUBLE_BAKING_EVIDENCE"] = "double_baking_evidence";
    OpKind["PROPOSALS"] = "proposals";
    OpKind["BALLOT"] = "ballot";
    OpKind["FAILING_NOOP"] = "failing_noop";
    OpKind["REGISTER_GLOBAL_CONSTANT"] = "register_global_constant";
    OpKind["TX_ROLLUP_ORIGINATION"] = "tx_rollup_origination";
    OpKind["TX_ROLLUP_SUBMIT_BATCH"] = "tx_rollup_submit_batch";
    OpKind["TX_ROLLUP_COMMIT"] = "tx_rollup_commit";
    OpKind["TX_ROLLUP_RETURN_BOND"] = "tx_rollup_return_bond";
    OpKind["TX_ROLLUP_FINALIZE_COMMITMENT"] = "tx_rollup_finalize_commitment";
    OpKind["TX_ROLLUP_REMOVE_COMMITMENT"] = "tx_rollup_remove_commitment";
    OpKind["TX_ROLLUP_REJECTION"] = "tx_rollup_rejection";
    OpKind["TX_ROLLUP_DISPATCH_TICKETS"] = "tx_rollup_dispatch_tickets";
    OpKind["TRANSFER_TICKET"] = "transfer_ticket";
    OpKind["INCREASE_PAID_STORAGE"] = "increase_paid_storage";
    OpKind["UPDATE_CONSENSUS_KEY"] = "update_consensus_key";
    OpKind["DRAIN_DELEGATE"] = "drain_delegate";
    OpKind["VDF_REVELATION"] = "vdf_revelation";
    OpKind["EVENT"] = "event";
    OpKind["TICKET_UPDATES"] = "ticket_updates";
    OpKind["SMART_ROLLUP_ORIGINATE"] = "smart_rollup_originate";
    OpKind["SMART_ROLLUP_ADD_MESSAGES"] = "smart_rollup_add_messages";
    OpKind["SMART_ROLLUP_EXECUTE_OUTBOX_MESSAGE"] = "smart_rollup_execute_outbox_message";
    OpKind["SMART_ROLLUP_PUBLISH"] = "smart_rollup_publish";
    OpKind["SMART_ROLLUP_CEMENT"] = "smart_rollup_cement";
    OpKind["SMART_ROLLUP_RECOVER_BOND"] = "smart_rollup_recover_bond";
    OpKind["SMART_ROLLUP_REFUTE"] = "smart_rollup_refute";
    OpKind["SMART_ROLLUP_TIMEOUT"] = "smart_rollup_timeout";
})(OpKind || (exports.OpKind = OpKind = {}));
var OPERATION_METADATA;
(function (OPERATION_METADATA) {
    OPERATION_METADATA["TOO_LARGE"] = "too large";
})(OPERATION_METADATA || (exports.OPERATION_METADATA = OPERATION_METADATA = {}));
var METADATA_BALANCE_UPDATES_CATEGORY;
(function (METADATA_BALANCE_UPDATES_CATEGORY) {
    METADATA_BALANCE_UPDATES_CATEGORY["BAKING_REWARDS"] = "baking rewards";
    METADATA_BALANCE_UPDATES_CATEGORY["REWARDS"] = "rewards";
    METADATA_BALANCE_UPDATES_CATEGORY["FEES"] = "fees";
    METADATA_BALANCE_UPDATES_CATEGORY["DEPOSITS"] = "deposits";
    METADATA_BALANCE_UPDATES_CATEGORY["LEGACY_REWARDS"] = "legacy_rewards";
    METADATA_BALANCE_UPDATES_CATEGORY["LEGACY_FEES"] = "legacy_fees";
    METADATA_BALANCE_UPDATES_CATEGORY["LEGACY_DEPOSITS"] = "legacy_deposits";
    METADATA_BALANCE_UPDATES_CATEGORY["BLOCK_FEES"] = "block fees";
    METADATA_BALANCE_UPDATES_CATEGORY["NONCE_REVELATION_REWARDS"] = "nonce revelation rewards";
    METADATA_BALANCE_UPDATES_CATEGORY["DOUBLE_SIGNING_EVIDENCE_REWARDS"] = "double signing evidence rewards";
    METADATA_BALANCE_UPDATES_CATEGORY["ENDORSING_REWARDS"] = "endorsing rewards";
    METADATA_BALANCE_UPDATES_CATEGORY["BAKING_BONUSES"] = "baking bonuses";
    METADATA_BALANCE_UPDATES_CATEGORY["STORAGE_FEES"] = "storage fees";
    METADATA_BALANCE_UPDATES_CATEGORY["PUNISHMENTS"] = "punishments";
    METADATA_BALANCE_UPDATES_CATEGORY["LOST_ENDORSING_REWARDS"] = "lost endorsing rewards";
    METADATA_BALANCE_UPDATES_CATEGORY["SUBSIDY"] = "subsidy";
    METADATA_BALANCE_UPDATES_CATEGORY["BURNED"] = "burned";
    METADATA_BALANCE_UPDATES_CATEGORY["COMMITMENT"] = "commitment";
    METADATA_BALANCE_UPDATES_CATEGORY["BOOTSTRAP"] = "bootstrap";
    METADATA_BALANCE_UPDATES_CATEGORY["INVOICE"] = "invoice";
    METADATA_BALANCE_UPDATES_CATEGORY["MINTED"] = "minted";
    METADATA_BALANCE_UPDATES_CATEGORY["TX_ROLLUP_REJECTION_REWARDS"] = "tx_rollup_rejection_rewards";
    METADATA_BALANCE_UPDATES_CATEGORY["TX_ROLLUP_REJECTION_PUNISHMENTS"] = "tx_rollup_rejection_punishments";
    METADATA_BALANCE_UPDATES_CATEGORY["BONDS"] = "bonds";
})(METADATA_BALANCE_UPDATES_CATEGORY || (exports.METADATA_BALANCE_UPDATES_CATEGORY = METADATA_BALANCE_UPDATES_CATEGORY = {}));
var PvmKind;
(function (PvmKind) {
    PvmKind["WASM2"] = "wasm_2_0_0";
    PvmKind["ARITH"] = "arith";
})(PvmKind || (exports.PvmKind = PvmKind = {}));
var SmartRollupRefutationOptions;
(function (SmartRollupRefutationOptions) {
    SmartRollupRefutationOptions["START"] = "start";
    SmartRollupRefutationOptions["MOVE"] = "move";
})(SmartRollupRefutationOptions || (exports.SmartRollupRefutationOptions = SmartRollupRefutationOptions = {}));
var SmartRollupInputProofKind;
(function (SmartRollupInputProofKind) {
    SmartRollupInputProofKind["INBOX_PROOF"] = "inbox_proof";
    SmartRollupInputProofKind["REVEAL_PROOF"] = "reveal_proof";
    SmartRollupInputProofKind["FIRST_INPUT"] = "first_input";
})(SmartRollupInputProofKind || (exports.SmartRollupInputProofKind = SmartRollupInputProofKind = {}));
var SmartRollupRefuteRevealProofKind;
(function (SmartRollupRefuteRevealProofKind) {
    SmartRollupRefuteRevealProofKind["RAW_DATA_PROOF"] = "raw_data_proof";
    SmartRollupRefuteRevealProofKind["METADATA_PROOF"] = "metadata_proof";
    SmartRollupRefuteRevealProofKind["DAL_PAGE_PROOF"] = "dal_page_proof";
})(SmartRollupRefuteRevealProofKind || (exports.SmartRollupRefuteRevealProofKind = SmartRollupRefuteRevealProofKind = {}));
var SmartRollupRefuteGameStatusOptions;
(function (SmartRollupRefuteGameStatusOptions) {
    SmartRollupRefuteGameStatusOptions["ONGOING"] = "ongoing";
    SmartRollupRefuteGameStatusOptions["ENDED"] = "ended";
})(SmartRollupRefuteGameStatusOptions || (exports.SmartRollupRefuteGameStatusOptions = SmartRollupRefuteGameStatusOptions = {}));
var SmartRollupRefuteGameEndedPlayerOutcomes;
(function (SmartRollupRefuteGameEndedPlayerOutcomes) {
    SmartRollupRefuteGameEndedPlayerOutcomes["LOSER"] = "loser";
    SmartRollupRefuteGameEndedPlayerOutcomes["DRAW"] = "draw";
})(SmartRollupRefuteGameEndedPlayerOutcomes || (exports.SmartRollupRefuteGameEndedPlayerOutcomes = SmartRollupRefuteGameEndedPlayerOutcomes = {}));
var SmartRollupRefuteGameEndedReason;
(function (SmartRollupRefuteGameEndedReason) {
    SmartRollupRefuteGameEndedReason["CONFLICT_RESOLVED"] = "conflict_resolved";
    SmartRollupRefuteGameEndedReason["TIMEOUT"] = "timeout";
})(SmartRollupRefuteGameEndedReason || (exports.SmartRollupRefuteGameEndedReason = SmartRollupRefuteGameEndedReason = {}));
//# sourceMappingURL=tezos.types.js.map