import { ITatumSdkContainer, TatumSdkWalletProvider } from '../extensions';
export declare class WalletProvider {
    private readonly id;
    constructor(id: string);
    /**
     * Works are an entrypoint to interact with wallet providers of choice.
     * @param type - Wallet Provider type imported to the SDK instance
     */
    use<T, P, E extends TatumSdkWalletProvider<T, P>>(type: new (tatumSdkContainer: ITatumSdkContainer, ...args: any[]) => E): E;
}
