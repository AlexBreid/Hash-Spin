import type { Transaction } from './Transaction';
export type Trace = {
    transaction: Transaction;
    interfaces: Array<string>;
    children?: Array<Trace>;
    emulated?: boolean;
};
