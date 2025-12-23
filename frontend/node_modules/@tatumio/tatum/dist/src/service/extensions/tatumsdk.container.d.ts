import { ContainerInstance } from 'typedi';
import { Logger } from '../logger/logger.types';
import { TatumConfig } from '../tatum';
import { ServiceConstructor } from './tatumsdk.extensions.dto';
export interface ITatumSdkContainer {
    get<T>(type: ServiceConstructor<T>): T;
    getRpc<T>(): T;
    getConfig(): TatumConfig;
    getLogger(): Logger;
}
export declare class TatumSdkContainer implements ITatumSdkContainer {
    private readonly containerInstance;
    constructor(containerInstance: ContainerInstance);
    get<T>(type: ServiceConstructor<T>): T;
    getRpc<T>(): T;
    getConfig(): TatumConfig;
    getLogger(): Logger;
}
