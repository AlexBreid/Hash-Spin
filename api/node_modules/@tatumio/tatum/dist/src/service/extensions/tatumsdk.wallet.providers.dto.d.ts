import { ITatumSdkContainer } from './tatumsdk.container';
import { TatumSdkExtension } from './tatumsdk.extensions.dto';
export type TxId = string;
/**
 * TatumSdkWalletProvider serves as the base class for all wallet providers.
 *
 * @template T Represents the wallet type (e.g., accountId for MetaMask, mnemonic and xpub for local wallets).
 * @template P Represents the transaction payload type specific to a blockchain or transaction.
 *
 * @method getWallet Fetches or initializes the wallet of type T.
 * @method signAndBroadcast Signs a transaction based on the provided payload of type P and broadcasts it to the network.
 */
export declare abstract class TatumSdkWalletProvider<T, P> extends TatumSdkExtension {
    abstract getWallet(): Promise<T>;
    abstract signAndBroadcast(payload: P): Promise<TxId>;
}
export type WalletProviderConstructor = new (tatumSdkContainer: ITatumSdkContainer, ...args: any[]) => TatumSdkWalletProvider<any, any>;
export type WalletProviderWithConfig = {
    type: WalletProviderConstructor;
    config: any;
};
export type WalletProviderConstructorOrConfig = WalletProviderConstructor | WalletProviderWithConfig;
