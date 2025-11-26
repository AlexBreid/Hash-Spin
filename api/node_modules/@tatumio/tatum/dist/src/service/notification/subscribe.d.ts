import { ResponseDto } from '../../util';
import { AddressBasedNotification, AddressBasedNotificationDetail, BlockBasedNotification, BlockBasedNotificationDetail, ContractBasedNotification, ContractBasedNotificationDetail } from './notification.dto';
export declare class Subscribe {
    private readonly id;
    private readonly connector;
    private readonly config;
    constructor(id: string);
    private addressBasedNotification;
    private contractBasedNotification;
    private blockBasedNotification;
    /**
     * Subscribe to address event.
     */
    addressEvent: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to incoming native tx.
     */
    incomingNativeTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to outgoing native tx.
     */
    outgoingNativeTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to outgoing failed tx.
     */
    outgoingFailedTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to paid fee.
     */
    paidFee: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to incoming internal tx.
     */
    incomingInternalTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to outgoing internal tx.
     */
    outgoingInternalTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to incoming fungible tx.
     */
    incomingFungibleTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to outgoing fungible tx.
     */
    outgoingFungibleTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to incoming NFT tx.
     */
    incomingNftTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to outgoing NFT tx.
     */
    outgoingNftTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to incoming multitoken tx.
     */
    incomingMultitokenTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to outgoing multitoken tx.
     */
    outgoingMultitokenTx: (addressBasedNotificationDetail: AddressBasedNotificationDetail) => Promise<ResponseDto<AddressBasedNotification>>;
    /**
     * Subscribe to outgoing multitoken tx.
     */
    contractAddressLogEvent: (contractBasedNotificationDetail: ContractBasedNotificationDetail) => Promise<ResponseDto<ContractBasedNotification>>;
    /**
     * Subscribe to failed txs per block.
     */
    failedTxsPerBlock: ({ url, }: BlockBasedNotificationDetail) => Promise<ResponseDto<BlockBasedNotification>>;
}
