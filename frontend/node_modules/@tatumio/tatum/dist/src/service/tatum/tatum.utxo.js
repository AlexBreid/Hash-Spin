"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dogecoin = exports.ZCash = exports.BitcoinCash = exports.Litecoin = exports.Bitcoin = exports.FullUtxo = exports.NotificationUtxo = exports.UtxoFee = exports.BaseUtxo = void 0;
const typedi_1 = require("typedi");
const util_1 = require("../../util");
const address_1 = require("../address");
const fee_1 = require("../fee");
const ipfs_1 = require("../ipfs");
const notification_1 = require("../notification");
const rate_1 = require("../rate");
const tatum_1 = require("./tatum");
class BaseUtxo extends tatum_1.TatumSdkChain {
    constructor(id) {
        super(id);
        this.rpc = util_1.Utils.getRpc(id, typedi_1.Container.of(id).get(util_1.CONFIG));
        this.ipfs = typedi_1.Container.of(id).get(ipfs_1.Ipfs);
        this.rates = typedi_1.Container.of(id).get(rate_1.Rates);
    }
}
exports.BaseUtxo = BaseUtxo;
class UtxoFee extends BaseUtxo {
    constructor(id) {
        super(id);
        this.fee = typedi_1.Container.of(id).get(fee_1.FeeUtxo);
    }
}
exports.UtxoFee = UtxoFee;
class NotificationUtxo extends UtxoFee {
    constructor(id) {
        super(id);
        this.notification = typedi_1.Container.of(id).get(notification_1.Notification);
    }
}
exports.NotificationUtxo = NotificationUtxo;
class FullUtxo extends NotificationUtxo {
    constructor(id) {
        super(id);
        this.address = typedi_1.Container.of(id).get(address_1.Address);
    }
}
exports.FullUtxo = FullUtxo;
class Bitcoin extends FullUtxo {
}
exports.Bitcoin = Bitcoin;
class Litecoin extends FullUtxo {
}
exports.Litecoin = Litecoin;
class BitcoinCash extends NotificationUtxo {
    constructor(id) {
        super(id);
        this.rpc = util_1.Utils.getRpc(id, typedi_1.Container.of(id).get(util_1.CONFIG));
    }
}
exports.BitcoinCash = BitcoinCash;
class ZCash extends BaseUtxo {
}
exports.ZCash = ZCash;
class Dogecoin extends tatum_1.TatumSdkChain {
    constructor(id) {
        super(id);
        this.rpc = util_1.Utils.getRpc(id, typedi_1.Container.of(id).get(util_1.CONFIG));
        this.ipfs = typedi_1.Container.of(id).get(ipfs_1.Ipfs);
        this.rates = typedi_1.Container.of(id).get(rate_1.Rates);
        this.fee = typedi_1.Container.of(id).get(fee_1.FeeUtxo);
        this.notification = typedi_1.Container.of(id).get(notification_1.Notification);
        this.address = typedi_1.Container.of(id).get(address_1.Address);
    }
}
exports.Dogecoin = Dogecoin;
//# sourceMappingURL=tatum.utxo.js.map