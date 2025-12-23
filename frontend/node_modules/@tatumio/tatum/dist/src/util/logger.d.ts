import { TatumDevelopmentBrowserLogger, TatumDevelopmentLogger, TatumProductionLogger } from '../service/logger';
import { TatumConfig } from '../service/tatum';
export declare const LoggerUtils: {
    setLoggerForEnv: (config: TatumConfig, isDevelopment: boolean, isBrowser: boolean) => void;
    getDefaultLogger: (isDevelopment: boolean, isBrowser: boolean) => TatumDevelopmentLogger | TatumDevelopmentBrowserLogger | TatumProductionLogger;
};
