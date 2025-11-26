"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumDevelopmentBrowserLogger = void 0;
const env_1 = require("../../util/env");
const logger_types_1 = require("./logger.types");
class TatumDevelopmentBrowserLogger {
    static isWelcomeDisabled() {
        if (!env_1.EnvUtils.isBrowser())
            return false;
        const anyWindow = window;
        return anyWindow[TatumDevelopmentBrowserLogger.DISABLE_WELCOME];
    }
    static disableWelcome() {
        if (!env_1.EnvUtils.isBrowser())
            return;
        const anyWindow = window;
        anyWindow[TatumDevelopmentBrowserLogger.DISABLE_WELCOME] = true;
    }
    constructor(options = {}) {
        this.logger = console;
        this._DEBUG = ['%c Debug %c ', bgGray, initial];
        this._INFO = ['%c Info %c ', bgBlue, initial];
        this._WARN = ['%c Warn %c ', bgYellowStrong, initial];
        this._ERROR = ['%c Error %c ', bgRedStrong, initial];
        this._TATUM = ['%c Tatum %c ', bgGradient, initial];
        const defaultOptions = {
            welcome: env_1.EnvUtils.isDevelopment() && !TatumDevelopmentBrowserLogger.isWelcomeDisabled(),
            level: logger_types_1.LogLevel.INFO,
        };
        this.options = { ...defaultOptions, ...options };
        if (this.options.welcome) {
            this.welcome();
            TatumDevelopmentBrowserLogger.disableWelcome();
        }
    }
    join(...messages) {
        return messages.reduce((acc, curr) => {
            acc[0] += curr[0];
            acc.push(...curr.slice(1));
            return acc;
        }, ['']);
    }
    welcome() {
        this.logger.log(...this.join(this._TATUM, WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]));
    }
    trace(...args) {
        if (this.options.level > logger_types_1.LogLevel.TRACE)
            return;
        this.logger.trace(...args);
    }
    debug(...args) {
        if (this.options.level > logger_types_1.LogLevel.DEBUG)
            return;
        this.logger.debug(...this._DEBUG, ...args);
    }
    info(...args) {
        if (this.options.level > logger_types_1.LogLevel.INFO)
            return;
        this.logger.info(...this._INFO, ...args);
    }
    warn(...args) {
        if (this.options.level > logger_types_1.LogLevel.WARN)
            return;
        this.logger.warn(...this._WARN, ...args);
    }
    error(...args) {
        if (this.options.level > logger_types_1.LogLevel.ERROR)
            return;
        this.logger.error(...this._ERROR, ...args);
    }
}
exports.TatumDevelopmentBrowserLogger = TatumDevelopmentBrowserLogger;
TatumDevelopmentBrowserLogger.DISABLE_WELCOME = '__TTM_DISABLE_WELCOME__';
const bgGradient = 'color: white; font-weight: bold; background-image: linear-gradient(126deg,#513bff 9%,#89ffca 97%);';
const initial = 'color: inherit; font-weight: inherit;';
const initialStrong = 'color: inherit; font-weight: bold;';
const green = 'color: rgb(137, 255, 202);';
const bgRedStrong = 'color: white; background-color: rgb(238, 52, 52); font-weight: bold;';
const bgYellowStrong = 'color: white; background-color: rgb(255, 140, 0); font-weight: bold;';
const bgBlue = 'color: white; background-color: rgb(81, 59, 255);';
const bgGray = 'color: white; background-color: rgb(158, 158, 158);';
const WELCOME = 'Hi! 👋 Welcome to Tatum, the Javascript SDK for Web3.';
const BOLD = [initialStrong, initial];
const WELCOME_MESSAGES = [
    [
        `%c${WELCOME}%c\nVisit our docs to see how Tatum will help you launch projects fast: https://co.tatum.io/docs`,
        ...BOLD,
    ],
    [`%c${WELCOME}%c\nKick start by making your first RPC call: https://co.tatum.io/start`, ...BOLD],
    [`%c${WELCOME}%c\nSee what apps you can build with Tatum: https://co.tatum.io/apps`, ...BOLD],
    [
        `%c${WELCOME}%c\n%cFREE Testnet Tokens%c: Explore %cTatum Faucets%c available for over 5 chains: https://co.tatum.io/faucets`,
        ...BOLD,
        ...BOLD,
        green,
        initial,
    ],
];
//# sourceMappingURL=logger.development.browser.js.map