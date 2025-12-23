import { LogLevel, Logger } from './logger.types';
interface TatumProductionLoggerOptions {
    level: LogLevel;
}
export declare class TatumProductionLogger implements Logger {
    private readonly logger;
    private readonly options;
    constructor(options?: Partial<TatumProductionLoggerOptions>);
    trace(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}
export {};
