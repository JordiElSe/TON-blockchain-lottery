import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { toNano, fromNano, Dictionary } from '@ton/core';
import { LotteryMaster } from '../wrappers/LotteryMaster';
import { LotteryGame } from '../wrappers/LotteryGame';
import '@ton/test-utils';

describe('LotteryMaster', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lotteryMaster: SandboxContract<LotteryMaster>;

    const prizeAmounts = [10, 15, 30];
    const winnerCounts = [3, 2, 1];

    let prizes = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Uint(16));
    prizeAmounts.forEach((amount, i) => {
        prizes.set(amount, winnerCounts[i]);
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        lotteryMaster = blockchain.openContract(await LotteryMaster.fromInit(1n));

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
                devFee: 10n,
                prizes: prizes,
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: nonOwner.address,
            to: lotteryMaster.address,
            success: false,
            exitCode: 132,
        });
    });

    it('should reject and bounce CreateLottery messages when not enough balance to deploy new lottery', async () => {
        //Fund the lottery master with less than it takes to deploy a new lottery
        // await lotteryMaster.send(
        //     deployer.getSender(),
        //     {
        //         value: toNano('0.019'),
        //     },
        //     null,
        // );
        console.log('contract balance', await lotteryMaster.getBalance());
        const results = await lotteryMaster.send(
            deployer.getSender(),
            {
                value: toNano('0.02'), // Minus the fees is not enough to deploy a new lottery
            },
            {
                $$type: 'CreateLottery',
                maxPlayers: 100n,
                numPrice: toNano('0.01'),
                devFee: 10n,
                prizes: prizes,
            },
        );
        printTransactionFees(results.transactions);

        expect(results.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryMaster.address,
            success: false,
            actionResultCode: 37, // Not enough TON during action phase
        });
    });

    it('should create a lottery game with the specified parameters', async () => {
        const result = await lotteryMaster.send(
            deployer.getSender(),
            {
                value: toNano('0.03'),
            },
            {
                $$type: 'CreateLottery',
                maxPlayers: 100n,
                numPrice: toNano('0.01'),
                devFee: 10n,
                prizes: prizes,
            },
        );

        const lotteryGameAddr = await lotteryMaster.getLotteryGameAddress(100n, toNano('0.01'), 10n, prizes);

        expect(result.transactions).toHaveTransaction({
            from: lotteryMaster.address,
            to: lotteryGameAddr,
            success: true,
            deploy: true,
        });

        const lotteryGame = blockchain.openContract(LotteryGame.fromAddress(lotteryGameAddr));

        // console.log('lotteryGame parameters:');
        const owner = await lotteryGame.getOwner();
        expect(owner.toString()).toEqual(deployer.address.toString());
        // const maxPlayers = await lotteryGame.getMaxPlayers();
        // // console.log('maxPlayers', maxPlayers);
        // expect(maxPlayers).toEqual('100');
        // const numPrice = await lotteryGame.getNumPrice();
        // // console.log(`numPrice: ${numPrice} ton`);
        // expect(numPrice).toEqual('0.01');
        // const prizesInSc = await lotteryGame.getPrizes();
        // expect(prizesInSc).toBe(prizes);
    });
});
