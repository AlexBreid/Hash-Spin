import { ITatumSdkContainer, Network, TatumSdkExtension, TatumSdkWalletProvider, TxId } from '../../service';
export declare class TestExtension extends TatumSdkExtension {
    private readonly mockTestExtension;
    private readonly sdkConfig;
    constructor(tatumSdkContainer: ITatumSdkContainer, mockTestExtension: any);
    sayHello(): Promise<void>;
    init(): Promise<void>;
    destroy(): Promise<void>;
    supportedNetworks: Network[];
}
export declare class TestWalletProvider extends TatumSdkWalletProvider<string, string> {
    private readonly mockTestExtension?;
    private readonly sdkConfig;
    constructor(tatumSdkContainer: ITatumSdkContainer, mockTestExtension?: any, someOtherConfig?: {
        someConfigValue: boolean;
    });
    getWallet(): Promise<string>;
    init(): Promise<void>;
    destroy(): Promise<void>;
    signAndBroadcast(payload: string): Promise<TxId>;
    supportedNetworks: Network[];
}
