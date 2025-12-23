import { TatumConfig } from '../../tatum';
import { AbstractBatchRpc } from './AbstractBatchRpc';
export declare class GenericRpc extends AbstractBatchRpc {
    protected readonly config: TatumConfig;
    constructor(id: string);
}
