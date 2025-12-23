import { BlockQuery, EvmBeaconResponse, EvmBeaconV1Interface, StateCommitteesQuery, StateQuery, StateSyncCommitteesQuery, ValidatorBalancesQuery, ValidatorQuery, ValidatorsQuery } from '../../../dto';
import { GetI } from '../../../dto/GetI';
export declare abstract class AbstractBeaconV1EvmRpc implements EvmBeaconV1Interface {
    protected abstract get<T>(get: GetI): Promise<T>;
    private sendGet;
    getBlockAttestations({ blockId, ...rest }: BlockQuery): Promise<EvmBeaconResponse<any>>;
    getBlockHeader({ blockId, ...rest }: BlockQuery): Promise<EvmBeaconResponse<any>>;
    getBlockHeaders({ slot, parentRoot, ...rest }?: {
        slot?: string;
        parentRoot?: string;
    }): Promise<EvmBeaconResponse<any>>;
    getBlockRoot({ blockId, ...rest }: BlockQuery): Promise<EvmBeaconResponse<any>>;
    getGenesis(): Promise<EvmBeaconResponse<any>>;
    getStateCommittees({ stateId, ...rest }: StateCommitteesQuery): Promise<EvmBeaconResponse<any>>;
    getStateFinalityCheckpoints({ stateId, ...rest }: StateQuery): Promise<EvmBeaconResponse<any>>;
    getStateFork({ stateId, ...rest }: StateQuery): Promise<EvmBeaconResponse<any>>;
    getStateRoot({ stateId, ...rest }: StateQuery): Promise<EvmBeaconResponse<any>>;
    getStateSyncCommittees({ stateId, ...rest }: StateSyncCommitteesQuery): Promise<EvmBeaconResponse<any>>;
    getStateValidator({ stateId, validatorId, ...rest }: ValidatorQuery): Promise<EvmBeaconResponse<any>>;
    getStateValidatorBalances({ stateId, ...rest }: ValidatorBalancesQuery): Promise<EvmBeaconResponse<any>>;
    getStateValidators({ stateId, ...rest }: ValidatorsQuery): Promise<EvmBeaconResponse<any>>;
    getNodeVersion(): Promise<EvmBeaconResponse<any>>;
}
