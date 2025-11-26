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
exports.Subscribe = void 0;
const typedi_1 = require("typedi");
const tatum_connector_1 = require("../../connector/tatum.connector");
const util_1 = require("../../util");
const network_utils_1 = require("../../util/network.utils");
const notification_dto_1 = require("./notification.dto");
let Subscribe = class Subscribe {
    constructor(id) {
        this.id = id;
        /**
         * Subscribe to address event.
         */
        this.addressEvent = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.ADDRESS_EVENT);
        /**
         * Subscribe to incoming native tx.
         */
        this.incomingNativeTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.INCOMING_NATIVE_TX);
        /**
         * Subscribe to outgoing native tx.
         */
        this.outgoingNativeTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.OUTGOING_NATIVE_TX);
        /**
         * Subscribe to outgoing failed tx.
         */
        this.outgoingFailedTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.OUTGOING_FAILED_TX);
        /**
         * Subscribe to paid fee.
         */
        this.paidFee = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.PAID_FEE);
        /**
         * Subscribe to incoming internal tx.
         */
        this.incomingInternalTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.INCOMING_INTERNAL_TX);
        /**
         * Subscribe to outgoing internal tx.
         */
        this.outgoingInternalTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.OUTGOING_INTERNAL_TX);
        /**
         * Subscribe to incoming fungible tx.
         */
        this.incomingFungibleTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.INCOMING_FUNGIBLE_TX);
        /**
         * Subscribe to outgoing fungible tx.
         */
        this.outgoingFungibleTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.OUTGOING_FUNGIBLE_TX);
        /**
         * Subscribe to incoming NFT tx.
         */
        this.incomingNftTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.INCOMING_NFT_TX);
        /**
         * Subscribe to outgoing NFT tx.
         */
        this.outgoingNftTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.OUTGOING_NFT_TX);
        /**
         * Subscribe to incoming multitoken tx.
         */
        this.incomingMultitokenTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.INCOMING_MULTITOKEN_TX);
        /**
         * Subscribe to outgoing multitoken tx.
         */
        this.outgoingMultitokenTx = async (addressBasedNotificationDetail) => this.addressBasedNotification(addressBasedNotificationDetail, notification_dto_1.NotificationType.OUTGOING_MULTITOKEN_TX);
        /**
         * Subscribe to outgoing multitoken tx.
         */
        this.contractAddressLogEvent = async (contractBasedNotificationDetail) => this.contractBasedNotification(contractBasedNotificationDetail, notification_dto_1.NotificationType.CONTRACT_ADDRESS_LOG_EVENT);
        /**
         * Subscribe to failed txs per block.
         */
        this.failedTxsPerBlock = async ({ url, }) => this.blockBasedNotification({ url }, notification_dto_1.NotificationType.FAILED_TXS_PER_BLOCK);
        this.connector = typedi_1.Container.of(this.id).get(tatum_connector_1.TatumConnector);
        this.config = typedi_1.Container.of(this.id).get(util_1.CONFIG);
    }
    async addressBasedNotification({ address, url }, type) {
        return util_1.ErrorUtils.tryFail(async () => {
            const chain = util_1.Utils.mapNetworkToNotificationChain(this.config.network);
            const path = network_utils_1.NetworkUtils.isAlternateTestnet(this.config.network)
                ? `subscription?testnetType=${this.config.network}`
                : 'subscription';
            const { id } = await this.connector.post({
                path,
                body: {
                    type: type,
                    attr: {
                        chain,
                        address,
                        url,
                    },
                },
            });
            return {
                id,
                address,
                chain,
                url,
            };
        });
    }
    async contractBasedNotification({ contractAddress, url, event }, type) {
        return util_1.ErrorUtils.tryFail(async () => {
            const chain = util_1.Utils.mapNetworkToNotificationChain(this.config.network);
            const { id } = await this.connector.post({
                path: 'subscription',
                body: {
                    type: type,
                    attr: {
                        chain,
                        contractAddress,
                        url,
                        event,
                    },
                },
            });
            return {
                id,
                contractAddress,
                chain,
                url,
                event,
            };
        });
    }
    async blockBasedNotification({ url }, type) {
        return util_1.ErrorUtils.tryFail(async () => {
            const chain = util_1.Utils.mapNetworkToNotificationChain(this.config.network);
            const { id } = await this.connector.post({
                path: 'subscription',
                body: {
                    type: type,
                    attr: {
                        chain,
                        url,
                    },
                },
            });
            return {
                id,
                chain,
                url,
            };
        });
    }
};
exports.Subscribe = Subscribe;
exports.Subscribe = Subscribe = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new Subscribe(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], Subscribe);
//# sourceMappingURL=subscribe.js.map