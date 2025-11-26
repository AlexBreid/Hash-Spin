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
exports.WalletProvider = void 0;
const typedi_1 = require("typedi");
let WalletProvider = class WalletProvider {
    constructor(id) {
        this.id = id;
    }
    /**
     * Works are an entrypoint to interact with wallet providers of choice.
     * @param type - Wallet Provider type imported to the SDK instance
     */
    use(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type) {
        return typedi_1.Container.of(this.id).get(type);
    }
};
exports.WalletProvider = WalletProvider;
exports.WalletProvider = WalletProvider = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new WalletProvider(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], WalletProvider);
//# sourceMappingURL=wallet.provider.js.map