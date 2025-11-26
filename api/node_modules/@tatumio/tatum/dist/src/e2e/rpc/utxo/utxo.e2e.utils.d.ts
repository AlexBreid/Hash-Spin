import { Network } from '../../../dto';
import { BaseUtxo, Dogecoin } from '../../../service';
export declare enum UtxoNetworkType {
    MAIN = "main",
    TEST = "test",
    TESTNET4 = "testnet4"
}
interface TatumBtcUtils {
    type: UtxoNetworkType;
    network: Network;
    apiKey?: string;
    skipEstimateSmartFee?: boolean;
}
export declare const UtxoE2eUtils: {
    initTatum: <T extends BaseUtxo | Dogecoin>(params: TatumBtcUtils) => Promise<T>;
    e2e: (params: TatumBtcUtils) => void;
};
export {};
