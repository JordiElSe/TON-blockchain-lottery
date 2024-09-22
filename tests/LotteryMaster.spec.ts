import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { LotteryMaster } from '../wrappers/LotteryMaster';
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
                numOfTickets: 100n,
                ticketPrice: toNano('0.01'),
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: nonOwner.address,
            to: lotteryMaster.address,
            success: false,
        });
    });
});
