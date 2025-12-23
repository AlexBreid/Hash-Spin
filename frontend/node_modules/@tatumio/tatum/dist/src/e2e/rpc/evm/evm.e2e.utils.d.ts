import { Network } from '../../../dto';
import { BaseEvm } from '../../../service';
interface EvmE2eI {
    network: Network;
    apiKey?: string;
    data?: {
        estimateGas?: any;
    };
    skipEstimateGas?: boolean;
    url?: string;
}
export declare const EvmE2eUtils: {
    initTatum: <T extends BaseEvm>(network: Network, apiKey?: string, url?: string) => Promise<T>;
    e2e: (evmE2eI: EvmE2eI) => void;
};
export {};
