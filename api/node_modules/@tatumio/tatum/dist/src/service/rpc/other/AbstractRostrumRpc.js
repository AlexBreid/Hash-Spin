"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractRostrumRpc = void 0;
const typedi_1 = require("typedi");
let AbstractRostrumRpc = class AbstractRostrumRpc {
    async blockchainAddressDecode(address) {
        return this.rpcCall('blockchain.address.decode', [address]);
    }
    async blockchainAddressGetBalance({ address, filter, }) {
        const params = [address];
        if (filter) {
            params.push(filter);
        }
        return this.rpcCall('blockchain.address.get_balance', params);
    }
    async blockchainAddressGetFirstUse({ address, filter, }) {
        const params = [address];
        if (filter) {
            params.push(filter);
        }
        return this.rpcCall('blockchain.address.get_first_use', params);
    }
    async blockchainAddressGetHistory({ address, filter, }) {
        const params = [address];
        if (filter) {
            params.push(filter);
        }
        return this.rpcCall('blockchain.address.get_history', params);
    }
    async blockchainAddressGetMempool({ address, filter, }) {
        const params = [address];
        if (filter) {
            params.push(filter);
        }
        return this.rpcCall('blockchain.address.get_mempool', params);
    }
    async blockchainAddressToScriptHash(address) {
        return this.rpcCall('blockchain.address.get_scripthash', [address]);
    }
    async blockchainListUnspent({ address, filter, }) {
        const params = [address];
        if (filter) {
            params.push(filter);
        }
        return this.rpcCall('blockchain.address.listunspent', params);
    }
    async blockchainAddressSubscribe(address) {
        return this.rpcCall('blockchain.address.subscribe', [address]);
    }
    async blockchainAddressUnsubscribe(address) {
        return this.rpcCall('blockchain.address.unsubscribe', [address]);
    }
    async blockchainBlockGet(heightOrHash) {
        return this.rpcCall('blockchain.block.get', [heightOrHash]);
    }
    async blockchainBlockHeader({ height, cp_height = 0, }) {
        return this.rpcCall('blockchain.block.header', [height, cp_height]);
    }
    async blockchainBlockHeaderVerbose(heightOrHash) {
        return this.rpcCall('blockchain.block.header_verbose', [heightOrHash]);
    }
    async blockchainBlockHeaders({ start_height, count, cp_height = 0, }) {
        return this.rpcCall('blockchain.block.headers', [start_height, count, cp_height]);
    }
    async blockchainEstimateFee(blocks) {
        return this.rpcCall('blockchain.estimatefee', [blocks]);
    }
    async blockchainHeadersSubscribe() {
        return this.rpcCall('blockchain.headers.subscribe');
    }
    async blockchainHeadersTip() {
        return this.rpcCall('blockchain.headers.tip');
    }
    async blockchainRelayFee() {
        return this.rpcCall('blockchain.relayfee');
    }
    async blockchainScriptHashGetBalance({ scripthash, filter, }) {
        const params = [scripthash];
        if (filter) {
            params.push(filter);
        }
        return this.rpcCall('blockchain.scripthash.get_balance', params);
    }
    async blockchainScriptHashGetFirstUse({ scripthash, filter, }) {
        const params = [scripthash];
        if (filter) {
            params.push(filter);
        }
        return this.rpcCall('blockchain.scripthash.get_first_use', params);
    }
    async blockchainScriptHashGetHistory({ scripthash, filter, }) {
        const params = [scripthash];
        if (filter) {
            params.push(filter);
        }
        return this.rpcCall('blockchain.scripthash.get_history', params);
    }
    async blockchainScriptHashGetMempool({ scripthash, filter, }) {
        const params = [scripthash];
        if (filter) {
            params.push(filter);
        }
        return this.rpcCall('blockchain.scripthash.get_mempool', params);
    }
    async blockchainScriptHashListUnspent({ scripthash, filter, }) {
        const params = [scripthash];
        if (filter) {
            params.push(filter);
        }
        return this.rpcCall('blockchain.scripthash.listunspent', params);
    }
    async blockchainScriptHashSubscribe(scripthash) {
        return this.rpcCall('blockchain.scripthash.subscribe', [scripthash]);
    }
    async blockchainScriptHashUnsubscribe(scripthash) {
        return this.rpcCall('blockchain.scripthash.unsubscribe', [scripthash]);
    }
    async blockchainTransactionBroadcast(raw_tx) {
        return this.rpcCall('blockchain.transaction.broadcast', [raw_tx]);
    }
    async blockchainTransactionGet({ tx_hash, verbose, }) {
        const params = [tx_hash];
        if (verbose) {
            params.push(verbose);
        }
        return this.rpcCall('blockchain.transaction.get', params);
    }
    async blockchainTransactionGetConfirmedBlockhash(tx_hash) {
        return this.rpcCall('blockchain.transaction.get_confirmed_blockhash', [tx_hash]);
    }
    async blockchainTransactionGetMerkle({ tx_hash, height, }) {
        const params = [tx_hash];
        if (height) {
            params.push(height);
        }
        return this.rpcCall('blockchain.transaction.get_merkle', params);
    }
    async blockchainTransactionIdFromPos({ height, tx_pos, merkle = false, }) {
        const params = [height, tx_pos, merkle];
        return this.rpcCall('blockchain.transaction.id_from_pos', params);
    }
    async blockchainUtxoGet(params) {
        const rpcParams = params.output_index !== undefined ? [params.tx_hash, params.output_index] : [params.outpoint_hash];
        return this.rpcCall('blockchain.utxo.get', rpcParams);
    }
    async tokenScripthashGetBalance({ scripthash, cursor, token, }) {
        const params = [scripthash];
        if (cursor !== undefined) {
            params.push(cursor);
        }
        if (token !== undefined) {
            params.push(token);
        }
        return this.rpcCall('token.scripthash.get_balance', params);
    }
    async tokenScripthashGetHistory({ scripthash, cursor, token, }) {
        const params = [scripthash];
        if (cursor !== undefined) {
            params.push(cursor);
        }
        if (token !== undefined) {
            params.push(token);
        }
        return this.rpcCall('token.scripthash.get_history', params);
    }
    async tokenScripthashGetMempool({ scripthash, cursor, token, }) {
        const params = [scripthash];
        if (cursor !== undefined) {
            params.push(cursor);
        }
        if (token !== undefined) {
            params.push(token);
        }
        return this.rpcCall('token.scripthash.get_mempool', params);
    }
    async tokenScripthashListUnspent({ scripthash, cursor, token, }) {
        const params = [scripthash];
        if (cursor !== undefined) {
            params.push(cursor);
        }
        if (token !== undefined) {
            params.push(token);
        }
        return this.rpcCall('token.scripthash.listunspent', params);
    }
    async tokenTransactionGetHistory({ token, cursor, commitment, }) {
        const params = [token];
        if (cursor !== undefined) {
            params.push(cursor);
        }
        if (commitment !== undefined) {
            params.push(commitment);
        }
        return this.rpcCall('token.transaction.get_history', params);
    }
    async tokenAddressGetBalance({ address, cursor, token, }) {
        const params = [address];
        if (cursor !== undefined) {
            params.push(cursor);
        }
        if (token !== undefined) {
            params.push(token);
        }
        return this.rpcCall('token.address.get_balance', params);
    }
    async tokenAddressGetHistory({ address, cursor, token, }) {
        const params = [address];
        if (cursor !== undefined) {
            params.push(cursor);
        }
        if (token !== undefined) {
            params.push(token);
        }
        return this.rpcCall('token.address.get_history', params);
    }
    async tokenAddressGetMempool({ address, cursor, token, }) {
        const params = [address];
        if (cursor !== undefined) {
            params.push(cursor);
        }
        if (token !== undefined) {
            params.push(token);
        }
        return this.rpcCall('token.address.get_mempool', params);
    }
    async tokenAddressListUnspent({ address, cursor, token, }) {
        const params = [address];
        if (cursor !== undefined) {
            params.push(cursor);
        }
        if (token !== undefined) {
            params.push(token);
        }
        return this.rpcCall('token.address.listunspent', params);
    }
    async tokenGenesisInfo(tokenId) {
        return this.rpcCall('token.genesis.info', [tokenId]);
    }
    async tokenNftList(params) {
        return this.rpcCall('token.nft.list', [params.token, params.cursor]);
    }
    async serverVersion(params) {
        return this.rpcCall('server.version', [params.client_name, params.protocol_version]);
    }
    async cashAccountQueryName({ name, height, }) {
        return this.rpcCall('cashaccount.query.name', [name, height]);
    }
    async serverBanner() {
        return this.rpcCall('server.banner');
    }
};
exports.AbstractRostrumRpc = AbstractRostrumRpc;
exports.AbstractRostrumRpc = AbstractRostrumRpc = __decorate([
    (0, typedi_1.Service)()
], AbstractRostrumRpc);
//# sourceMappingURL=AbstractRostrumRpc.js.map