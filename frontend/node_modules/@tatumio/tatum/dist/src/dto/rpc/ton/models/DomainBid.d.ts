import type { AccountAddress } from './AccountAddress';
export type DomainBid = {
    success: boolean;
    value: number;
    txTime: number;
    txHash: string;
    bidder: AccountAddress;
};
