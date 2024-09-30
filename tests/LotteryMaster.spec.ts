import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { toNano, fromNano } from '@ton/core';
import { LotteryMaster } from '../wrappers/LotteryMaster';
import { LotteryGame } from '../wrappers/LotteryGame';
import '@ton/test-utils';

describe('LotteryMaster', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lotteryMaster: SandboxContract<LotteryMaster>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        lotteryMaster = blockchain.openContract(await LotteryMaster.fromInit(561345n));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await lotteryMaster.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryMaster.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and lotteryMaster are ready to use
    });

    it('should set the deployer as the owner', async () => {
        // console.log('deployer address', deployer.address.toString());
        // console.log('lotteryMaster address', lotteryMaster.address.toString());
        expect(deployer.address.toString()).toEqual((await lotteryMaster.getOwner()).toString());
    });

    it('should reject CreateLottery messages from non-owners', async () => {
        const nonOwner = await blockchain.treasury('sender');

        const result = await lotteryMaster.send(
            nonOwner.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'CreateLottery',
                maxPlayers: 100n,
                numPrice: toNano('0.01'),
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: nonOwner.address,
            to: lotteryMaster.address,
            success: false,
        });
    });

    it('should reject and bounce CreateLottery messages when not enough balance to deploy new lottery', async () => {
        const results = await lotteryMaster.send(
            deployer.getSender(),
            {
                value: toNano('0.029'),
            },
            {
                $$type: 'CreateLottery',
                maxPlayers: 100n,
                numPrice: toNano('0.01'),
            },
        );

        // Reject the CreateLottery message
        expect(results.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryMaster.address,
            success: false,
        });

        // Send bounced message back to the sender
        expect(results.transactions).toHaveTransaction({
            from: lotteryMaster.address,
            to: deployer.address,
            success: true,
            inMessageBounced: true,
        });
    });

    it('should create a lottery game with the specified parameters', async () => {
        const result = await lotteryMaster.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CreateLottery',
                maxPlayers: 100n,
                numPrice: toNano('0.01'),
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryMaster.address,
            success: true,
        });

        const lotteryGameAddr = await lotteryMaster.getLotteryGameAddress(100n, toNano('0.01'));
        const lotteryGame = blockchain.openContract(LotteryGame.fromAddress(lotteryGameAddr));

        // console.log('lotteryGame parameters:');
        const owner = await lotteryGame.getOwner();
        expect(owner.toString()).toEqual(deployer.address.toString());
        const maxPlayers = await lotteryGame.getMaxPlayers();
        // console.log('maxPlayers', maxPlayers);
        expect(maxPlayers).toEqual('100');
        const numPrice = await lotteryGame.getNumPrice();
        // console.log(`numPrice: ${numPrice} ton`);
        expect(numPrice).toEqual('0.01');
    });
});
