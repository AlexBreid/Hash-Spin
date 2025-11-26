"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractEosRpc = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const typedi_1 = require("typedi");
const util_1 = require("../../../util");
let AbstractEosRpc = class AbstractEosRpc {
    sendPost({ path, body, notConvertCamelToSnake, }) {
        const post = {
            path,
        };
        if (body) {
            post.body = notConvertCamelToSnake ? body : util_1.Utils.convertObjCamelToSnake(body);
        }
        return this.post(post);
    }
    abiBinToJson(body) {
        return this.sendPost({ path: '/abi_bin_to_json', body });
    }
    abiJsonToBin(body) {
        return this.sendPost({ path: '/abi_json_to_bin', body });
    }
    getAbi(body) {
        return this.sendPost({ path: '/get_abi', body });
    }
    getAccount(body) {
        return this.sendPost({ path: '/get_account', body });
    }
    getAccountsByAuthorizers(body) {
        return this.sendPost({ path: '/get_accounts_by_authorizers', body });
    }
    getActivatedProtocolFeatures(body) {
        return this.sendPost({ path: '/get_activated_protocol_features', body });
    }
    getBlock(body) {
        return this.sendPost({ path: '/get_block', body });
    }
    getBlockHeaderState(body) {
        return this.sendPost({ path: '/get_block_header_state', body });
    }
    getBlockInfo(body) {
        return this.sendPost({ path: '/get_block_info', body });
    }
    getCode(body) {
        return this.sendPost({ path: '/get_code', body });
    }
    getCurrencyBalance(body) {
        return this.sendPost({ path: '/get_currency_balance', body });
    }
    getCurrencyStats(body) {
        return this.sendPost({ path: '/get_currency_stats', body });
    }
    getInfo() {
        return this.sendPost({ path: '/get_info' });
    }
    getKvTableRows(body) {
        return this.sendPost({ path: '/get_kv_table_rows', body });
    }
    getProducers(body) {
        return this.sendPost({ path: '/get_producers', body });
    }
    getRawAbi(body) {
        return this.sendPost({ path: '/get_raw_abi', body });
    }
    getRawCodeAndAbi(body) {
        return this.sendPost({ path: '/get_raw_code_and_abi', body });
    }
    getRequiredKeys(body) {
        return this.sendPost({ path: '/get_required_keys', body });
    }
    getScheduledTransaction(body) {
        return this.sendPost({ path: '/get_scheduled_transaction', body });
    }
    getTableByScope(body) {
        return this.sendPost({ path: '/get_table_by_scope', body });
    }
    getTableRows(body) {
        return this.sendPost({ path: '/get_table_rows', body });
    }
    pushTransaction(body) {
        return this.sendPost({ path: '/push_transaction', body });
    }
    pushTransactions(body) {
        return this.sendPost({ path: '/push_transactions', body });
    }
    sendTransaction(body) {
        return this.sendPost({ path: '/send_transaction', body });
    }
};
exports.AbstractEosRpc = AbstractEosRpc;
exports.AbstractEosRpc = AbstractEosRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractEosRpc);
//# sourceMappingURL=AbstractEosRpc.js.map