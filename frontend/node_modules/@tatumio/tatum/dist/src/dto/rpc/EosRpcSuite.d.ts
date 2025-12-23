export interface GetProducers {
    json?: boolean;
    lowerBound?: string;
    limit?: number;
}
export interface Action {
    account: string;
    name: string;
    authorization: Authority[];
    data: object;
    hexData: string;
}
export interface Authority {
    actor: string;
    permission: string;
}
export type Extension = Array<number | string>;
export type PublicKeys = string[];
export interface Transaction {
    expiration: string;
    refBlockNum: number;
    refBlockPrefix: number;
    maxNetUsageWords: string | number;
    maxCpuUsageMs: string | number;
    delaySec: number;
    contextFreeActions: Action[];
    actions: Action[];
    transactionExtensions?: Extension[];
}
export interface GetRequiredKeys {
    transaction: Transaction;
    availableKeys: PublicKeys;
}
export interface PushTransaction {
    signatures: string[];
    compression: boolean;
    packedContextFreeData: string;
    packedTrx: string;
}
export interface BlockNumOrId {
    blockNumOrId: string;
}
export interface BlockNum {
    blockNum: number;
}
export interface AccountName {
    accountName: string;
}
export interface GetCurrencyBalance {
    code: string;
    account: string;
    symbol: string;
}
export interface GetCurrencyStats {
    code: string;
    symbol: string;
}
export interface AbiJsonToBin {
    code?: string;
    action?: string;
    args?: object;
}
export interface AbiBinToJson {
    code: string;
    action: string;
    binargs: object;
}
export interface GetTableByScope {
    code: string;
    table?: string;
    lowerBound?: string;
    upperBound?: string;
    limit?: number;
    reverse?: boolean;
    showPayer?: boolean;
}
export interface GetTableRows {
    code: string;
    table: string;
    scope: string;
    indexPosition?: string;
    keyType?: string;
    encodeType?: string;
    lowerBound?: string;
    upperBound?: string;
    limit?: number;
    reverse?: boolean;
    showPayer?: boolean;
}
export interface GetKVTableRows {
    code: string;
    table: string;
    indexName: string;
    encodeType?: 'bytes' | 'string' | 'name' | 'dec' | 'hex';
    indexValue?: string;
    lowerBound?: string;
    upperBound?: string;
    limit?: number;
    reverse?: boolean;
    showPayer?: boolean;
}
export interface GetCode {
    accountName: string;
    codeAsWasm: 1;
}
export interface GetActivatedProtocolFeatures {
    lowerBound?: number;
    upperBound?: number;
    limit?: number;
    searchByBlockNum?: boolean;
    reverse?: boolean;
}
export interface GetAccountByAuthorizers {
    accounts: Array<string | Authority>;
    keys: PublicKeys[];
}
export interface EosRpcSuite {
    /**
     * Returns an object containing various details about a specific account on the blockchain.
     *
     * @param body - The name of the account to retrieve.
     * @return {Promise<any>} - A promise that resolves with the account information.
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_account
     */
    getAccount(body: AccountName): Promise<any>;
    /**
     * Returns an object containing various details about a specific block on the blockchain.
     *
     * @param body - The number or ID of the block to retrieve.
     * @return {Promise<any>} - A promise that resolves with the block information.
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_block
     */
    getBlock(body: BlockNumOrId): Promise<any>;
    /**
     * Similar to get_block but returns a fixed-size smaller subset of the block data.
     *
     * @param body - The number or ID of the block to retrieve.
     * @return {Promise<any>} - A promise that resolves with the block information.
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_block_info
     */
    getBlockInfo(body: BlockNum): Promise<any>;
    /**
     * Returns an object containing various details about the blockchain.
     *
     * @return {Promise<any>} - A promise that resolves with the blockchain information.
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_info
     */
    getInfo(): Promise<any>;
    /**
     * This method expects a transaction in JSON format and will attempt to apply it to the blockchain.
     * @param body - The transaction to push.
     * @return {Promise<any>} - Returns nothing on success.
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/push_transaction
     */
    pushTransaction(body: PushTransaction): Promise<any>;
    /**
     * This method expects a transaction in JSON format and will attempt to apply it to the blockchain.
     * @param body - The transaction to push.
     * @return {Promise<any>} - Returns nothing on success.
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/send_transaction
     */
    sendTransaction(body: PushTransaction): Promise<any>;
    /**
     * This method expects a transaction in JSON format and will attempt to apply it to the blockchain.
     * @param body
     * @return {Promise<any>} - Returns nothing on success.
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/push_transactions
     */
    pushTransactions(body: Transaction[]): Promise<any>;
    /**
     * Retrieves the block header state
     *
     * @param body - The block number or ID to retrieve.
     * @return {Promise<any>} - block header state
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_block_header_state
     */
    getBlockHeaderState(body: BlockNumOrId): Promise<any>;
    /**
     * Retrieves the ABI for a contract based on its account name
     *
     * @param body - The account name to retrieve the ABI for.
     * @return {Promise<any>} - ABI for a contract
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_abi
     */
    getAbi(body: AccountName): Promise<any>;
    /**
     * Retrieves the current balance
     *
     * @param body - The currency balance to retrieve.
     * @return {Promise<any>} - current balance
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_currency_balance
     */
    getCurrencyBalance(body: GetCurrencyBalance): Promise<any>;
    /**
     * Retrieves currency stats
     * @param body - The currency stats to retrieve.
     * @return {Promise<any>} - currency stats
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_currency_stats
     */
    getCurrencyStats(body: GetCurrencyStats): Promise<any>;
    /**
     * Returns the required keys needed to sign a transaction.
     * @param body - The transaction to retrieve required keys for.
     * @return {Promise<any>} - required keys
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_required_keys
     */
    getRequiredKeys(body: GetRequiredKeys): Promise<any>;
    /**
     * Retrieves producers list
     * @param body - The producers list to retrieve.
     * @return {Promise<any>} - producers list
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_producers
     */
    getProducers(body: GetProducers): Promise<any>;
    /**
     * Retrieves raw code and ABI for a contract based on account name
     * @param body - The account name to retrieve the raw code and ABI for.
     * @return {Promise<any>} - raw code and ABI
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_raw_code_and_abi
     */
    getRawCodeAndAbi(body: AccountName): Promise<any>;
    /**
     * Retrieves scheduled transactions
     * @param body - The scheduled transactions to retrieve.
     * @return {Promise<any>} - scheduled transactions
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_scheduled_transaction
     */
    getScheduledTransaction(body: GetProducers): Promise<any>;
    /**
     * Retrieves table scope
     * @param body - The table scope to retrieve.
     * @return {Promise<any>} - table scope
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_table_by_scope
     */
    getTableByScope(body: GetTableByScope): Promise<any>;
    /**
     * Returns an object containing rows from the specified table.
     * @param body - The table rows to retrieve.
     * @return {Promise<any>} - table rows
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_table_by_scope
     */
    getTableRows(body: GetTableRows): Promise<any>;
    /**
     * Returns an object containing rows from the specified kv table.
     * @param body - The kv table rows to retrieve.
     * @return {Promise<any>} - kv table rows
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_kv_table_rows
     */
    getKvTableRows(body: GetKVTableRows): Promise<any>;
    /**
     * Returns an object containing the serialized action data.
     * @param body - The serialized action data to retrieve.
     * @return {Promise<any>} - serialized action data
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/abi_json_to_bin
     */
    abiJsonToBin(body: AbiJsonToBin): Promise<any>;
    /**
     * Returns an object containing the deserialized action data.
     * @param body - The deserialized action data to retrieve.
     * @return {Promise<any>} - deserialized action data
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/abi_bin_to_json
     */
    abiBinToJson(body: AbiBinToJson): Promise<any>;
    /**
     * Returns an object containing the smart contract WASM code.
     *
     * @param body - The smart contract WASM code to retrieve.
     * @return {Promise<any>} - smart contract WASM code
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_code
     */
    getCode(body: GetCode): Promise<any>;
    /**
     * Returns an object containing the smart contract abi.
     *
     * @param body - The smart contract abi to retrieve.
     * @return {Promise<any>} - smart contract abi
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_raw_abi
     */
    getRawAbi(body: AccountName): Promise<any>;
    /**
     * Retrieves the activated protocol features for producer node
     *
     * @param body - The activated protocol features to retrieve.
     * @return {Promise<any>} - activated protocol features
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_activated_protocol_features
     */
    getActivatedProtocolFeatures(body: GetActivatedProtocolFeatures): Promise<any>;
    /**
     * Given a set of account names and public keys, find all account permission authorities that are, in part or whole, satisfiable
     *
     * @param body - The accounts and keys to retrieve.
     * @return {Promise<any>} - accounts and keys
     * https://developers.eos.io/manuals/eos/v2.2/nodeos/plugins/chain_api_plugin/api-reference/index#operation/get_accounts_by_authorizers
     */
    getAccountsByAuthorizers(body: GetAccountByAuthorizers): Promise<any>;
}
