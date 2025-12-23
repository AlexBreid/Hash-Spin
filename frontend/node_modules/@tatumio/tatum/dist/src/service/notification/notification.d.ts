import { ResponseDto } from '../../util';
import { GetAllExecutedWebhooksQuery, GetAllSubscriptionsQuery, NotificationSubscription, Webhook } from './notification.dto';
import { Subscribe } from './subscribe';
export declare class Notification {
    private id;
    private connector;
    subscribe: Subscribe;
    constructor(id: string);
    /**
     * Get all existing subscriptions for given address.
     * @param body
     */
    getAll(body?: GetAllSubscriptionsQuery): Promise<ResponseDto<NotificationSubscription[]>>;
    /**
     * Unsubscribe from monitoring of the specific address.
     * @param id ID of a subscription.
     */
    unsubscribe(id: string): Promise<ResponseDto<void>>;
    /**
     * Get all fired webhook notifications.
     * @param body
     */
    getAllExecutedWebhooks(body?: GetAllExecutedWebhooksQuery): Promise<ResponseDto<Webhook[]>>;
}
