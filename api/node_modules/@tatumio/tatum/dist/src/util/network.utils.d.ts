import { Network, NetworkMetadata } from '../dto';
export declare const NetworkUtils: {
    getNetworkMetadata: (network: Network) => NetworkMetadata;
    isTestnet(network: Network): boolean;
    getChainId: (network: Network) => number;
    isAlternateTestnet: (network: Network) => boolean;
    getV4ApiKeyForNetwork: (network: Network) => string | undefined;
};
