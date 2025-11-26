import { LogLevel, Logger } from './logger.types';
interface TatumDevelopmentBrowserLoggerOptions {
    welcome: boolean;
    level: LogLevel;
}
export declare class TatumDevelopmentBrowserLogger implements Logger {
    private static readonly DISABLE_WELCOME;
    private static isWelcomeDisabled;
    private static disableWelcome;
    private readonly options;
    private readonly logger;
    private readonly _DEBUG;
    private readonly _INFO;
    private readonly _WARN;
    private readonly _ERROR;
    private readonly _TATUM;
    constructor(options?: Partial<TatumDevelopmentBrowserLoggerOptions>);
    private join;
    private welcome;
    trace(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}
export {};
