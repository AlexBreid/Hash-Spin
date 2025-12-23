"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcNodeType = exports.ApiVersion = void 0;
var ApiVersion;
(function (ApiVersion) {
    ApiVersion["V3"] = "V3";
    ApiVersion["V4"] = "V4";
})(ApiVersion || (exports.ApiVersion = ApiVersion = {}));
var RpcNodeType;
(function (RpcNodeType) {
    // Normal node without access to archive data
    RpcNodeType[RpcNodeType["NORMAL"] = 0] = "NORMAL";
    // Node with access to archive data, will be used for historical data
    RpcNodeType[RpcNodeType["ARCHIVE"] = 1] = "ARCHIVE";
})(RpcNodeType || (exports.RpcNodeType = RpcNodeType = {}));
//# sourceMappingURL=tatum.dto.js.map