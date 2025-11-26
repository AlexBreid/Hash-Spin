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
exports.Token = void 0;
const typedi_1 = require("typedi");
const tatum_api_1 = require("../../api/tatum.api");
const dto_1 = require("../../dto");
const util_1 = require("../../util");
const token_dto_1 = require("./token.dto");
const api_dto_1 = require("../../api/api.dto");
let Token = class Token {
    constructor(id) {
        this.id = id;
        this.config = typedi_1.Container.of(this.id).get(util_1.CONFIG);
        this.api = typedi_1.Container.of(this.id).get(tatum_api_1.TatumApi);
    }
    /**
     * Get balance of fungible tokens for given addresses.
     * You can get balance of multiple addresses in one call.
     */
    async getBalance({ page = 0, pageSize = 50, addresses, }) {
        const chain = this.config.network;
        if ((0, dto_1.isDataApiEvmEnabledNetwork)(chain)) {
            return util_1.ErrorUtils.tryFail(() => this.api
                .getBalancesOfAddresses({
                chain,
                addresses: addresses.join(','),
                pageSize,
                offset: page,
                tokenTypes: 'fungible',
            })
                .then((r) => r.map((value) => {
                return token_dto_1.mapper.toFungibleTokenBalance(value);
            })));
        }
        else {
            throw new Error(`Not supported for ${chain} network.`);
        }
    }
    /**
     * Create new fungible collection (ERC-20 compatible smart contract). This operation deploys new smart contract to the blockchain and sets the owner of the token.
     * You don't need to specify the default minter of the collection, as the owner of the collection is the default minter.
     * You don't have to have any funds on the address, as the smart contract is deployed by Tatum.
     * @param body Body of the request.
     * @returns ResponseDto<{txId: string}> Transaction ID of the deployment transaction. You can get the contract address from the transaction details using rpc.getContractAddress(transactionId) function, once transaction is included in the block.
     */
    async createNewFungibleToken(body) {
        const chain = (0, api_dto_1.networkToChain)(this.config.network);
        return util_1.ErrorUtils.tryFail(() => this.api
            .createFungibleToken({
            ...body,
            chain,
            contractType: 'fungible',
        })
            .then((r) => token_dto_1.mapper.toCreateTokenResponse(r)));
    }
    /**
     * Get metadata of fungible token.
     */
    async getTokenMetadata({ tokenAddress }) {
        const chain = (0, api_dto_1.networkToChain)(this.config.network);
        return util_1.ErrorUtils.tryFail(() => this.api
            .getTokenInfo({
            chain,
            tokenAddress,
        })
            .then((r) => token_dto_1.mapper.toTokenMetadata(r)));
    }
    /**
     * Get all token transactions for given address.
     * @param details  You can get multiple token transactions in one call.
     * @param page
     * @param pageSize
     */
    async getAllFungibleTransactions({ page = 0, pageSize = 50, tokenAddress, addresses, transactionTypes, blockFrom, blockTo, }) {
        const chain = (0, api_dto_1.networkToChain)(this.config.network);
        return util_1.ErrorUtils.tryFail(() => this.api
            .getTransactions({
            chain,
            tokenAddress,
            pageSize,
            offset: page,
            blockFrom,
            blockTo,
            transactionSubTypes: transactionTypes?.join(','),
            addresses: addresses.join(','),
            transactionTypes: 'fungible',
        })
            .then((r) => r.map((value) => {
            return token_dto_1.mapper.toTransaction(value);
        })));
    }
};
exports.Token = Token;
exports.Token = Token = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new Token(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], Token);
//# sourceMappingURL=token.js.map