import { Block } from '../../../api/api.dto';
import { GetI } from '../../../dto/GetI';
import { Box } from '../../../dto/rpc/AlgorandAlgodRpcSuite';
import { AccountInformationRequest, AccountRequest, AccountResponse, AccountsResponse, AccountTransactionsRequest, AccountTransactionsResponse, AlgorandIndexerRpcSuite, ApplicationBoxesParams, ApplicationBoxesResponse, ApplicationBoxParams, ApplicationSearchParams, ApplicationSearchResponse, AppLookupParams, AppLookupResponse, AppsLocalStateRequest, AppsLocalStateResponse, AssetBalancesParams, AssetBalancesResponse, AssetLookupParams, AssetLookupResponse, AssetSearchParams, AssetSearchResponse, AssetsRequest, AssetsResponse, AssetTransactionsParams, AssetTransactionsResponse, BlockLookupParams, CreatedApplicationsRequest, CreatedApplicationsResponse, CreatedAssetsRequest, CreatedAssetsResponse, HealthCheck, LogsLookupParams, LogsLookupResponse, TransactionLookupParams, TransactionLookupResponse, TransactionsParams, TransactionsResponse } from '../../../dto/rpc/AlgorandIndexerRpcSuite';
export declare abstract class AbstractAlgorandIndexerRpc implements AlgorandIndexerRpcSuite {
    protected abstract get<T>(get: GetI): Promise<T>;
    private sendGet;
    getAccount(params: AccountInformationRequest): Promise<AccountResponse>;
    getAccountApplications(params: CreatedApplicationsRequest): Promise<CreatedApplicationsResponse>;
    getAccountAppsLocalState(params: AppsLocalStateRequest): Promise<AppsLocalStateResponse>;
    getAccountAssets(params: AssetsRequest): Promise<AssetsResponse>;
    getAccountCreatedAssets(params: CreatedAssetsRequest): Promise<CreatedAssetsResponse>;
    getAccountTransactions(params: AccountTransactionsRequest): Promise<AccountTransactionsResponse>;
    getAccounts(params: AccountRequest): Promise<AccountsResponse>;
    getApplication(params: AppLookupParams): Promise<AppLookupResponse>;
    getApplicationBox(params: ApplicationBoxParams): Promise<Box>;
    getApplicationBoxes(params: ApplicationBoxesParams): Promise<ApplicationBoxesResponse>;
    getApplicationLogs(params: LogsLookupParams): Promise<LogsLookupResponse>;
    getApplications(params: ApplicationSearchParams): Promise<ApplicationSearchResponse>;
    getAsset(params: AssetLookupParams): Promise<AssetLookupResponse>;
    getAssetBalances(params: AssetBalancesParams): Promise<AssetBalancesResponse>;
    getAssetTransactions(params: AssetTransactionsParams): Promise<AssetTransactionsResponse>;
    getAssets(params: AssetSearchParams): Promise<AssetSearchResponse>;
    getBlock(params: BlockLookupParams): Promise<Block>;
    getHealth(): Promise<HealthCheck>;
    getTransaction(params: TransactionLookupParams): Promise<TransactionLookupResponse>;
    getTransactions(params: TransactionsParams): Promise<TransactionsResponse>;
}
