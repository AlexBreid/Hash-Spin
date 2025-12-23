"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionDetails = exports.Encoding = exports.Commitment = void 0;
var Commitment;
(function (Commitment) {
    Commitment["Processed"] = "processed";
    Commitment["Confirmed"] = "confirmed";
    Commitment["Finalized"] = "finalized";
})(Commitment || (exports.Commitment = Commitment = {}));
var Encoding;
(function (Encoding) {
    Encoding["Base58"] = "base58";
    Encoding["Base64"] = "base64";
    Encoding["Base64_ZSTD"] = "base64+zstd";
    Encoding["JsonParsed"] = "jsonParsed";
})(Encoding || (exports.Encoding = Encoding = {}));
var TransactionDetails;
(function (TransactionDetails) {
    TransactionDetails["Full"] = "full";
    TransactionDetails["Accounts"] = "accounts";
    TransactionDetails["Signatures"] = "signatures";
    TransactionDetails["None"] = "none";
})(TransactionDetails || (exports.TransactionDetails = TransactionDetails = {}));
//# sourceMappingURL=SolanaRpcSuite.js.map