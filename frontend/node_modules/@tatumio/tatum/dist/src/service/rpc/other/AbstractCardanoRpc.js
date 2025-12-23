"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractCardanoRpc = void 0;
const util_1 = require("../../../util");
class AbstractCardanoRpc {
    sendPost({ path, body }) {
        const post = {
            path,
        };
        if (body) {
            post.body = util_1.Utils.convertObjCamelToSnake(body);
        }
        return this.post(post);
    }
    getNetworkList(body) {
        return this.sendPost({ path: '/network/list', body });
    }
    getNetworkStatus(body) {
        return this.sendPost({ path: '/network/status', body: body });
    }
    getNetworkOptions(body) {
        return this.sendPost({ path: '/network/options', body: body });
    }
    getBlock(body) {
        return this.sendPost({ path: '/block', body });
    }
    getBlockTransaction(body) {
        return this.sendPost({ path: '/block/transaction', body });
    }
    getMempool(body) {
        return this.sendPost({ path: '/mempool', body });
    }
    getMempoolTransaction(body) {
        return this.sendPost({ path: '/mempool/transaction', body });
    }
    getAccountBalance(body) {
        return this.sendPost({ path: '/account/balance', body });
    }
    getAccountCoins(body) {
        return this.sendPost({ path: '/account/coins', body });
    }
    deriveAccount(body) {
        return this.sendPost({ path: '/construction/derive', body });
    }
    constructionPreprocess(body) {
        return this.sendPost({ path: '/construction/preprocess', body });
    }
    getTransactionConstructionMetadata(body) {
        return this.sendPost({ path: '/construction/metadata', body });
    }
    generateUnsignedTransactionAndSigningPayloads(body) {
        return this.sendPost({ path: '/construction/payloads', body });
    }
    createNetworkTransaction(body) {
        return this.sendPost({ path: '/construction/combine', body });
    }
    parseTransaction(body) {
        return this.sendPost({
            path: '/construction/parse',
            body,
        });
    }
    getHashOfTransaction(body) {
        return this.sendPost({ path: '/construction/hash', body });
    }
    submitTransaction(body) {
        return this.sendPost({ path: '/construction/submit', body });
    }
    call(body) {
        return this.sendPost({ path: '/call', body });
    }
    getEventsBlocks(body) {
        return this.sendPost({ path: '/events/blocks', body });
    }
    searchTransactions(body) {
        return this.sendPost({ path: '/search/transactions', body });
    }
}
exports.AbstractCardanoRpc = AbstractCardanoRpc;
//# sourceMappingURL=AbstractCardanoRpc.js.map