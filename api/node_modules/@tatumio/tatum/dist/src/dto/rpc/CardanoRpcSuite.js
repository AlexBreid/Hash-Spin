"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationDirection = exports.Direction = exports.CoinAction = void 0;
var CoinAction;
(function (CoinAction) {
    CoinAction["CoinCreated"] = "coin_created";
    CoinAction["CoinSpent"] = "coin_spent";
})(CoinAction || (exports.CoinAction = CoinAction = {}));
var Direction;
(function (Direction) {
    Direction["forward"] = "forward";
    Direction["backward"] = "backward";
})(Direction || (exports.Direction = Direction = {}));
var RelationDirection;
(function (RelationDirection) {
    RelationDirection["Forward"] = "forward";
    RelationDirection["Backward"] = "backward";
})(RelationDirection || (exports.RelationDirection = RelationDirection = {}));
//# sourceMappingURL=CardanoRpcSuite.js.map