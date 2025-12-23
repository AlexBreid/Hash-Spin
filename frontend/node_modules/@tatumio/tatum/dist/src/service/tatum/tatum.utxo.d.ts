import { UtxoBasedRpcSuite, UtxoBasedRpcSuiteEstimateFee, DogeRpcSuite } from '../../dto';
import { Address } from '../address';
import { FeeUtxo } from '../fee';
import { Ipfs } from '../ipfs';
import { Notification } from '../notification';
import { Rates } from '../rate';
import { TatumSdkChain } from './tatum';
export declare abstract class BaseUtxo extends TatumSdkChain {
    rpc: UtxoBasedRpcSuite;
    ipfs: Ipfs;
    rates: Rates;
    constructor(id: string);
}
export declare abstract class UtxoFee extends BaseUtxo {
    fee: FeeUtxo;
    constructor(id: string);
}
export declare abstract class NotificationUtxo extends UtxoFee {
    notification: Notification;
    constructor(id: string);
}
export declare abstract class FullUtxo extends NotificationUtxo {
    address: Address;
    constructor(id: string);
}
export declare class Bitcoin extends FullUtxo {
}
export declare class Litecoin extends FullUtxo {
}
export declare class BitcoinCash extends NotificationUtxo {
    rpc: UtxoBasedRpcSuiteEstimateFee;
    constructor(id: string);
}
export declare class ZCash extends BaseUtxo {
}
export declare class Dogecoin extends TatumSdkChain {
    rpc: DogeRpcSuite;
    ipfs: Ipfs;
    rates: Rates;
    fee: FeeUtxo;
    notification: Notification;
    address: Address;
    constructor(id: string);
}
