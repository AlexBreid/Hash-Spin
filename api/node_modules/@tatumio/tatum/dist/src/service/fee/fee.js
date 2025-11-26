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
var FeeEvm_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeEvm = exports.FeeUtxo = void 0;
const bignumber_js_1 = require("bignumber.js");
const typedi_1 = require("typedi");
const tatum_connector_1 = require("../../connector/tatum.connector");
const Currency_1 = require("../../dto/Currency");
const util_1 = require("../../util/");
let FeeUtxo = class FeeUtxo {
    constructor(id) {
        this.id = id;
        this.connector = typedi_1.Container.of(this.id).get(tatum_connector_1.TatumConnector);
        this.config = typedi_1.Container.of(this.id).get(util_1.CONFIG);
    }
    async getCurrentFee() {
        const currency = (0, Currency_1.networkToCurrency)(this.config.network);
        const response = await util_1.ErrorUtils.tryFail(() => this.connector.get({
            path: `blockchain/fee/${currency}`,
        }));
        const result = {
            data: null,
            status: util_1.Status.ERROR,
            error: response.error,
        };
        if (response.data) {
            result.data = {
                chain: this.config.network,
                lastRecalculated: response.data.time,
                basedOnBlockNumber: response.data.block,
                slow: response.data.slow.toString(),
                medium: response.data.medium.toString(),
                fast: response.data.fast.toString(),
            };
            result.status = util_1.Status.SUCCESS;
        }
        return result;
    }
};
exports.FeeUtxo = FeeUtxo;
exports.FeeUtxo = FeeUtxo = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new FeeUtxo(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], FeeUtxo);
let FeeEvm = FeeEvm_1 = class FeeEvm {
    constructor(id) {
        this.id = id;
        this.connector = typedi_1.Container.of(this.id).get(tatum_connector_1.TatumConnector);
        this.config = typedi_1.Container.of(this.id).get(util_1.CONFIG);
    }
    async getCurrentFee() {
        const currency = (0, Currency_1.networkToCurrency)(this.config.network);
        const response = await util_1.ErrorUtils.tryFail(() => this.connector.get({
            path: `blockchain/fee/${currency}`,
        }));
        const result = {
            data: null,
            status: util_1.Status.ERROR,
            error: response.error,
        };
        if (response.data) {
            result.data = {
                chain: this.config.network,
                gasPrice: FeeEvm_1.mapGasPrice(response.data),
                lastRecalculated: response.data.time,
                basedOnBlockNumber: response.data.block,
            };
            result.status = util_1.Status.SUCCESS;
        }
        return result;
    }
    static mapGasPrice({ slow, baseFee, fast, medium, }) {
        return {
            slow: new bignumber_js_1.BigNumber(slow.toString()).dividedBy(1e9).toFixed(),
            medium: new bignumber_js_1.BigNumber(medium.toString()).dividedBy(1e9).toFixed(),
            fast: new bignumber_js_1.BigNumber(fast.toString()).dividedBy(1e9).toFixed(),
            unit: 'Gwei',
            baseFee: new bignumber_js_1.BigNumber(baseFee.toString()).dividedBy(1e9).toFixed(),
        };
    }
};
exports.FeeEvm = FeeEvm;
exports.FeeEvm = FeeEvm = FeeEvm_1 = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new FeeEvm(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], FeeEvm);
//# sourceMappingURL=fee.js.map