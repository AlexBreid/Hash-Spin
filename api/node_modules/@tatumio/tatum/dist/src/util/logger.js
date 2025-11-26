"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerUtils = void 0;
const logger_1 = require("../service/logger");
exports.LoggerUtils = {
    setLoggerForEnv: (config, isDevelopment, isBrowser) => {
        if (config.quiet)
            config.logger = new logger_1.TatumQuietLogger();
        config.logger ??= exports.LoggerUtils.getDefaultLogger(isDevelopment, isBrowser);
    },
    // TODO: make this tree shakeable
    getDefaultLogger: (isDevelopment, isBrowser) => {
        if (!isDevelopment && !isBrowser)
            return new logger_1.TatumProductionLogger();
        if (isBrowser)
            return new logger_1.TatumDevelopmentBrowserLogger();
        return new logger_1.TatumDevelopmentLogger();
    },
};
//# sourceMappingURL=logger.js.map