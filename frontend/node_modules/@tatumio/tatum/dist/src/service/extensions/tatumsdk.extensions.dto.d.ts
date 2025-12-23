import { Network } from '../../dto';
import { ITatumSdkContainer } from './tatumsdk.container';
/**
 * `TatumSdkExtension` is the base class for all extensions integrated into the Tatum SDK.
 * It provides lifecycle methods for the initialization and disposal of extensions, ensuring
 * consistent integration and teardown processes across various extensions.
 *
 * @property tatumSdkContainer Provides access to the SDK configuration and internal sub-modules along with other registered extensions.
 *
 *
 * @property supportedNetworks An abstract property that needs to be defined by the extending classes.
 *                             It represents an array of networks that the extension supports.
 *
 * @method init Intended to handle the setup or initialization logic for the extension.
 *
 * @method destroy Intended to handle the teardown or disposal logic for the extension,
 *                 ensuring resources are freed and cleanup is performed appropriately.
 */
export declare abstract class TatumSdkExtension {
    protected readonly tatumSdkContainer: ITatumSdkContainer;
    protected constructor(tatumSdkContainer: ITatumSdkContainer);
    abstract supportedNetworks: Network[];
    init(): Promise<void>;
    destroy(): Promise<void>;
}
export type ExtensionConstructor = new (tatumSdkContainer: ITatumSdkContainer, ...args: any[]) => TatumSdkExtension;
export type ExtensionWithConfig = {
    type: ExtensionConstructor;
    config: any;
};
export type ExtensionConstructorOrConfig = ExtensionConstructor | ExtensionWithConfig;
export type ServiceConstructor<T> = new (...args: any[]) => T;
