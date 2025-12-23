import { Network, TxPayload } from '../../../dto';
import { CreateErc1155NftCollection, CreateFungibleToken, CreateNftCollection } from '../../../dto/walletProvider';
import { ITatumSdkContainer, TatumSdkWalletProvider } from '../../extensions';
export declare class MetaMask extends TatumSdkWalletProvider<string, TxPayload> {
    supportedNetworks: Network[];
    private readonly config;
    private readonly rpc;
    private readonly connector;
    private readonly logger;
    constructor(tatumSdkContainer: ITatumSdkContainer);
    /**
     * Connect to MetaMask wallet. this method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the address of the connected account. If not, it throws an error.
     * @returns address of the connected account.
     */
    getWallet(): Promise<string>;
    /**
     * Sign native transaction with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     * @param recipient recipient of the transaction
     * @param amount amount to be sent, in native currency (ETH, BSC)
     */
    transferNative(recipient: string, amount: string): Promise<string>;
    /**
     * Sign ERC-20 fungible token `transfer` transaction (https://ethereum.org/en/developers/docs/standards/tokens/erc-20/#methods) with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     * @param recipient recipient of the transaction
     * @param amount amount to be sent, in token currency
     * @param tokenAddress address of the token contract
     */
    transferErc20(recipient: string, amount: string, tokenAddress: string): Promise<string>;
    /**
     * Deploy new ERC-721 NFT Collection contract with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     */
    createNftCollection(body: CreateNftCollection): Promise<string>;
    /**
     * Deploy new ERC-20 Token (USDT or USDC like) contract with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     */
    createFungibleToken(body: CreateFungibleToken): Promise<string>;
    /**
     * Deploy new ERC-1155 NFT Collection contract with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     */
    createErc1155NftCollection(body?: CreateErc1155NftCollection): Promise<string>;
    /**
     * Sign ERC-721 non-fungible token `safeTransferFrom` transaction (https://ethereum.org/en/developers/docs/standards/tokens/erc-721/#methods) with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     * @param recipient recipient of the transaction
     * @param tokenId ID of the NFT token
     * @param tokenAddress address of the token contract
     */
    transferNft(recipient: string, tokenId: string, tokenAddress: string): Promise<string>;
    /**
     * Sign ERC-20 fungible token `approve` transaction (https://ethereum.org/en/developers/docs/standards/tokens/erc-20/#methods) with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     * @param spender address to be approved to spend the tokens
     * @param amount amount to be sent, in token currency
     * @param tokenAddress address of the token contract
     */
    approveErc20(spender: string, amount: string, tokenAddress: string): Promise<string>;
    /**
     * Sign custom transaction with MetaMask wallet. This method checks if MetaMask is installed and if it is connected to the browser.
     * If so, it returns the signed transaction hash. If not, it throws an error.
     * @param payload Transaction payload. From field is ignored and will be overwritten by the connected account.
     */
    signAndBroadcast(payload: TxPayload): Promise<string>;
}
