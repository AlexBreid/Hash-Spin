"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvUtils = void 0;
exports.EnvUtils = {
    isBrowser: () => typeof window !== 'undefined',
    isProcessAvailable: () => typeof process !== 'undefined',
    isDevelopment: () => (exports.EnvUtils.isProcessAvailable() && (!process.env?.NODE_ENV || process.env?.NODE_ENV === 'development')) ||
        (exports.EnvUtils.isBrowser() && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)),
};
//# sourceMappingURL=env.js.map