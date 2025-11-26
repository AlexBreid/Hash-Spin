"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumProductionLogger = void 0;
const logger_types_1 = require("./logger.types");
const DEFAULT_PRODUCTION_OPTIONS = {
    level: logger_types_1.LogLevel.INFO,
};
class TatumProductionLogger {
    constructor(options = {}) {
        this.logger = console;
        this.options = { ...DEFAULT_PRODUCTION_OPTIONS, ...options };
    }
    trace(...args) {
        if (this.options.level > logger_types_1.LogLevel.TRACE)
            return;
        this.logger.trace(...args);
    }
    debug(...args) {
        if (this.options.level > logger_types_1.LogLevel.DEBUG)
            return;
        this.logger.debug(...args);
    }
    info(...args) {
        if (this.options.level > logger_types_1.LogLevel.INFO)
            return;
        this.logger.info(...args);
    }
    warn(...args) {
        if (this.options.level > logger_types_1.LogLevel.WARN)
            return;
        this.logger.warn(...args);
    }
    error(...args) {
        if (this.options.level > logger_types_1.LogLevel.ERROR)
            return;
        this.logger.error(...args);
    }
}
exports.TatumProductionLogger = TatumProductionLogger;
//# sourceMappingURL=logger.production.js.map