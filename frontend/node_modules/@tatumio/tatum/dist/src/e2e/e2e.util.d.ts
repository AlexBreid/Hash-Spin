import { AddressBasedNotification, AddressBasedNotificationDetail, BlockBasedNotification, BlockBasedNotificationDetail, ContractBasedNotification, ContractBasedNotificationDetail, FullSdk, Network, TatumConfig } from '../service';
import { ResponseDto } from '../util';
export declare const e2eUtil: {
    initConfig: (network: Network, apiKey?: string, url?: string) => TatumConfig;
    subscriptions: {
        getAddress: (network: Network) => string;
        testAddressBasedSubscription: (tatum: FullSdk, address: string, func: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>) => Promise<string>;
        testContractBasedSubscription: (tatum: FullSdk, contractAddress: string, func: (contractBasedNotificationDetail: ContractBasedNotificationDetail) => Promise<ResponseDto<ContractBasedNotification>>) => Promise<void>;
        testBlockBasedSubscription: (tatum: FullSdk, func: (blockBasedNotificationDetail: BlockBasedNotificationDetail) => Promise<ResponseDto<BlockBasedNotification>>) => Promise<void>;
    };
    isVerbose: boolean;
    flushSubscriptions: (tatum: FullSdk) => Promise<void>;
};
