import { Token } from 'typedi';
import { Logger } from '../service/logger/logger.types';
import { TatumConfig } from '../service/tatum/tatum.dto';
export declare const CONFIG: Token<TatumConfig>;
export declare const LOGGER: Token<Logger>;
