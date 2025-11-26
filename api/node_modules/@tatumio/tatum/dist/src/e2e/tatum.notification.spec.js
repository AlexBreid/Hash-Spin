"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dto_1 = require("../dto");
const service_1 = require("../service");
const util_1 = require("../util");
const e2e_constant_1 = require("./e2e.constant");
const e2e_util_1 = require("./e2e.util");
describe.skip('notification', () => {
    describe('createSubscription', () => {
        describe('IP auth', () => {
            describe('Address Event', () => {
                it.each(Object.values(e2e_constant_1.AddressEventNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.addressEvent);
                });
            });
            describe('Incoming Native Tx', () => {
                it.each(Object.values(e2e_constant_1.IncomingNativeTxNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.incomingNativeTx);
                });
            });
            describe('Outgoing Native Tx', () => {
                it.each(Object.values(e2e_constant_1.OutgoingNativeTxNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.outgoingNativeTx);
                });
            });
            describe('Outgoing Failed Tx', () => {
                it.each(Object.values(e2e_constant_1.OutgoingFailedNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.outgoingFailedTx);
                });
            });
            describe('Paid Fee', () => {
                it.each(Object.values(e2e_constant_1.PaidFeeNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.paidFee);
                });
            });
            describe('Incoming Internal Tx', () => {
                it.each(Object.values(e2e_constant_1.InternalTxNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.incomingInternalTx);
                });
            });
            describe('Outgoing Internal Tx', () => {
                it.each(Object.values(e2e_constant_1.InternalTxNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.outgoingInternalTx);
                });
            });
            describe('Incoming Fungible Tx', () => {
                it.each(Object.values(e2e_constant_1.FungibleTxNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.incomingFungibleTx);
                });
            });
            describe('Outgoing Fungible Tx', () => {
                it.each(Object.values(e2e_constant_1.FungibleTxNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.outgoingFungibleTx);
                });
            });
            describe('Incoming Nft Tx', () => {
                it.each(Object.values(e2e_constant_1.NftNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.incomingNftTx);
                });
            });
            describe('Outgoing Nft Tx', () => {
                it.each(Object.values(e2e_constant_1.NftNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.outgoingNftTx);
                });
            });
            describe('Incoming Multitoken Tx', () => {
                it.each(Object.values(e2e_constant_1.MultitokenNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.incomingMultitokenTx);
                });
            });
            describe('Outgoing Multitoken Tx', () => {
                it.each(Object.values(e2e_constant_1.MultitokenNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testAddressBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.outgoingMultitokenTx);
                });
            });
            describe('Failed Txs Per Block', () => {
                it.each(Object.values(e2e_constant_1.FailedTxPerBlockNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testBlockBasedSubscription(tatum, tatum.notification.subscribe.failedTxsPerBlock);
                });
            });
            describe('Contract Address Log Event', () => {
                it.each(Object.values(e2e_constant_1.ContractAddressLogEventNetworks))('OK %s', async (network) => {
                    const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(network));
                    await e2e_util_1.e2eUtil.subscriptions.testContractBasedSubscription(tatum, e2e_util_1.e2eUtil.subscriptions.getAddress(network), tatum.notification.subscribe.contractAddressLogEvent);
                });
            });
        });
        it('NOK - existing subscription ', async () => {
            const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(dto_1.Network.ETHEREUM));
            await tatum.notification.subscribe.addressEvent({
                url: 'https://tatum.com',
                address: e2e_constant_1.TestConst.EXISTING_SUBSCRIPTION_ETH_ADDRESS,
            });
            const { status, error } = await tatum.notification.subscribe.addressEvent({
                url: 'https://tatum.io',
                address: e2e_constant_1.TestConst.EXISTING_SUBSCRIPTION_ETH_ADDRESS,
            });
            expect(status).toEqual(util_1.Status.ERROR);
            expect(error?.message[0]).toMatch(/^Subscription for type ADDRESS_EVENT on the address id 0xbaf6dc2e647aeb6f510f9e318856a1bcd66c5e19 and currency ETH already exists./);
            expect(error?.code).toEqual('subscription.exists.on.address-and-currency');
            await tatum.destroy();
        });
        it('NOK - invalid address', async () => {
            const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(dto_1.Network.ETHEREUM));
            const { status, error } = await tatum.notification.subscribe.addressEvent({
                url: 'https://tatum.io',
                address: e2e_constant_1.TestConst.INVALID_ETH_ADDRESS,
            });
            expect(status).toEqual(util_1.Status.ERROR);
            expect(error?.message).toEqual([
                'address must be a valid ETH address. Address must start with 0x and must contain 40 hexadecimal characters after and have the correct checksum. ',
            ]);
            expect(error?.code).toEqual('validation.failed');
            await tatum.destroy();
        });
    });
    describe('deleteSubscription', () => {
        it('OK', async () => {
            const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(dto_1.Network.ETHEREUM_SEPOLIA));
            const address = e2e_util_1.e2eUtil.subscriptions.getAddress(dto_1.Network.ETHEREUM_SEPOLIA);
            const { data: subscribeData } = await tatum.notification.subscribe.addressEvent({
                url: 'https://tatum.io',
                address,
            });
            const { id } = subscribeData;
            await tatum.notification.unsubscribe(id);
            const { data } = await tatum.notification.getAll();
            const subscriptions = data.find((s) => s.network === dto_1.Network.ETHEREUM && s.address?.toLowerCase() === address.toLowerCase());
            expect(subscriptions).toEqual(undefined);
            await tatum.destroy();
        });
        it('NOK - invalid subscription', async () => {
            const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(dto_1.Network.ETHEREUM_SEPOLIA));
            const { data, status, error } = await tatum.notification.unsubscribe('invalid-subscription-id');
            expect(data).toEqual(null);
            expect(status).toEqual(util_1.Status.ERROR);
            expect((error?.message)[0]).toEqual('id should be valid id and 24 characters long, e.g. 6398ded68bfa23a9709b1b17');
            await tatum.destroy();
        });
    });
    it('getAll', async () => {
        const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(dto_1.Network.ETHEREUM));
        const { data } = await tatum.notification.getAll();
        expect(data).not.toHaveLength(0);
        expect(data[0].id).toBeDefined();
        expect(data[0].network).toBeDefined();
        expect(data[0].address).toBeDefined();
        expect(data[0].url).toBeDefined();
        expect(data[0].type).toBeDefined();
        expect(data.length).toBeGreaterThan(0);
        await tatum.destroy();
    });
    // TODO pipeline dont work with this test - IP auth
    it.skip('getAllExecutedWebhooks', async () => {
        const tatum = await service_1.TatumSDK.init(e2e_util_1.e2eUtil.initConfig(dto_1.Network.ETHEREUM_SEPOLIA));
        const { data } = await tatum.notification.getAllExecutedWebhooks();
        expect(data[0].type).toBeDefined();
        expect(data[0].id).toBeDefined();
        expect(data[0].subscriptionId).toBeDefined();
        expect(data[0].url).toBeDefined();
        expect(data[0].data).toBeDefined();
        expect(data[0].timestamp).toBeDefined();
        expect(data[0].failed).toBeDefined();
        expect(data[0].response).toBeDefined();
        await tatum.destroy();
    });
});
//# sourceMappingURL=tatum.notification.spec.js.map