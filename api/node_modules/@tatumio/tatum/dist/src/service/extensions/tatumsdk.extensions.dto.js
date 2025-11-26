"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumSdkExtension = void 0;
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
class TatumSdkExtension {
    constructor(tatumSdkContainer) {
        this.tatumSdkContainer = tatumSdkContainer;
    }
    init() {
        return Promise.resolve(undefined);
    }
    destroy() {
        return Promise.resolve(undefined);
    }
}
exports.TatumSdkExtension = TatumSdkExtension;
//# sourceMappingURL=tatumsdk.extensions.dto.js.map