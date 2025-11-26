"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rates = void 0;
const typedi_1 = require("typedi");
const tatum_connector_1 = require("../../connector/tatum.connector");
const util_1 = require("../../util");
let Rates = class Rates {
    constructor(id) {
        this.id = id;
        this.connector = typedi_1.Container.of(this.id).get(tatum_connector_1.TatumConnector);
    }
    getCurrentRate(currency, basePair) {
        return util_1.ErrorUtils.tryFail(async () => {
            return this.connector.get({
                path: `rate/${currency}`,
                params: { basePair },
            });
        });
    }
    getCurrentRateBatch(pairs) {
        pairs.forEach((pair) => {
            if (!pair.batchId) {
                pair.batchId = `${pair.currency}/${pair.basePair}`;
            }
        });
        return util_1.ErrorUtils.tryFail(async () => {
            return this.connector.post({
                path: `rate`,
                body: pairs,
            });
        });
    }
};
exports.Rates = Rates;
exports.Rates = Rates = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new Rates(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], Rates);
//# sourceMappingURL=rates.js.map