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
exports.Notification = void 0;
const typedi_1 = require("typedi");
const connector_1 = require("../../connector");
const util_1 = require("../../util");
const notification_dto_1 = require("./notification.dto");
const subscribe_1 = require("./subscribe");
let Notification = class Notification {
    constructor(id) {
        this.id = id;
        this.subscribe = typedi_1.Container.of(this.id).get(subscribe_1.Subscribe);
        this.connector = typedi_1.Container.of(this.id).get(connector_1.TatumConnector);
    }
    /**
     * Get all existing subscriptions for given address.
     * @param body
     */
    async getAll(body) {
        return util_1.ErrorUtils.tryFail(async () => {
            const subscriptions = await this.connector.get({
                path: 'subscription',
                params: {
                    pageSize: body?.pageSize?.toString() ?? '10',
                    ...(body?.offset && { offset: body.offset.toString() }),
                    ...(body?.address && { address: body.address }),
                },
            });
            return subscriptions.map((notification) => {
                const result = {
                    id: notification.id,
                    network: util_1.Utils.mapNotificationChainToNetwork(notification.attr.chain),
                    url: notification.attr.url,
                    type: notification.type,
                };
                if (notification.type === notification_dto_1.NotificationType.CONTRACT_ADDRESS_LOG_EVENT) {
                    return {
                        ...result,
                        contractAddress: notification.attr.contractAddress,
                        event: notification.attr.event,
                    };
                }
                if (notification.attr.address) {
                    return {
                        ...result,
                        address: notification.attr.address,
                    };
                }
                return result;
            });
        });
    }
    /**
     * Unsubscribe from monitoring of the specific address.
     * @param id ID of a subscription.
     */
    async unsubscribe(id) {
        return util_1.ErrorUtils.tryFail(async () => this.connector.delete({ path: `subscription/${id}` }));
    }
    /**
     * Get all fired webhook notifications.
     * @param body
     */
    async getAllExecutedWebhooks(body) {
        return util_1.ErrorUtils.tryFail(async () => this.connector.get({
            path: 'subscription/webhook',
            params: {
                pageSize: body?.pageSize?.toString() ?? '10',
                ...(body?.offset && { offset: body.offset.toString() }),
                ...(body?.direction && { direction: body.direction }),
                ...(body?.filterFailed && { failed: body.filterFailed.toString() }),
            },
        }));
    }
};
exports.Notification = Notification;
exports.Notification = Notification = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new Notification(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], Notification);
//# sourceMappingURL=notification.js.map