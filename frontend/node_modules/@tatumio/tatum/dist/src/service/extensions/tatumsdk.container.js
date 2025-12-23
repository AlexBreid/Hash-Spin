"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumSdkContainer = void 0;
const util_1 = require("../../util");
class TatumSdkContainer {
    constructor(containerInstance) {
        this.containerInstance = containerInstance;
    }
    get(type) {
        return this.containerInstance.get(type);
    }
    getRpc() {
        return util_1.Utils.getRpc(this.containerInstance.id, this.containerInstance.get(util_1.CONFIG));
    }
    getConfig() {
        return this.containerInstance.get(util_1.CONFIG);
    }
    getLogger() {
        return this.containerInstance.get(util_1.LOGGER);
    }
}
exports.TatumSdkContainer = TatumSdkContainer;
//# sourceMappingURL=tatumsdk.container.js.map