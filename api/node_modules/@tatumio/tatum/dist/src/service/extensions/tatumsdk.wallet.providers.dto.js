"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumSdkWalletProvider = void 0;
const tatumsdk_extensions_dto_1 = require("./tatumsdk.extensions.dto");
/**
 * TatumSdkWalletProvider serves as the base class for all wallet providers.
 *
 * @template T Represents the wallet type (e.g., accountId for MetaMask, mnemonic and xpub for local wallets).
 * @template P Represents the transaction payload type specific to a blockchain or transaction.
 *
 * @method getWallet Fetches or initializes the wallet of type T.
 * @method signAndBroadcast Signs a transaction based on the provided payload of type P and broadcasts it to the network.
 */
class TatumSdkWalletProvider extends tatumsdk_extensions_dto_1.TatumSdkExtension {
}
exports.TatumSdkWalletProvider = TatumSdkWalletProvider;
//# sourceMappingURL=tatumsdk.wallet.providers.dto.js.map