import { LogLevel, Logger } from './logger.types';
interface TatumDevelopmentLoggerOptions {
    welcome: boolean;
    level: LogLevel;
}
export declare class TatumDevelopmentLogger implements Logger {
    private static readonly DISABLE_WELCOME;
    private static isWelcomeDisabled;
    private static disableWelcome;
    private readonly options;
    private readonly logger;
    private readonly _trace;
    private readonly _debug;
    private readonly _info;
    private readonly _warn;
    private readonly _error;
    private readonly _DEBUG;
    private readonly _INFO;
    private readonly _WARN;
    private readonly _ERROR;
    constructor(options?: Partial<TatumDevelopmentLoggerOptions>);
    private welcome;
    trace(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}
export {};
