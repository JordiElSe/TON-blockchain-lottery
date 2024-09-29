import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, toNano, fromNano } from '@ton/core';
import { LotteryGame } from '../wrappers/LotteryGame';
import '@ton/test-utils';

describe('LotteryGame', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lotteryGame: SandboxContract<LotteryGame>;
    const maxPlayers: bigint = 100n;
    const ticketPrice = toNano('2');

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        lotteryGame = blockchain.openContract(await LotteryGame.fromInit(100n, toNano('0.01'), deployer.address));
        const deployResult = await lotteryGame.send(
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
            to: lotteryGame.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and lotteryGame are ready to use
    });

    it('should not buy ticket number if the lottery is full', async () => {
        for (let i = 0; i < 100; i++) {
            const player = await blockchain.treasury('player' + i);
            const result = await lotteryGame.send(
                player.getSender(),
                {
                    value: toNano('0.01'),
                },
                'BuyTicket',
            );
            expect(result.transactions).toHaveTransaction({
                from: player.address,
                to: lotteryGame.address,
                success: true,
            });
        }
        const playersBefore = await lotteryGame.getCurrentPlayers();
        const player = await blockchain.treasury('player' + 100);
        const result = await lotteryGame.send(
            player.getSender(),
            {
                value: toNano('0.01'),
            },
            'BuyTicket',
        );
        const playersAfter = await lotteryGame.getCurrentPlayers();
        expect(playersAfter).toEqual(playersBefore);
        expect(result.transactions).toHaveTransaction({
            from: player.address,
            to: lotteryGame.address,
            success: false,
        });
    });

    it('should not buy ticket for less than it costs', async () => {
        const playersBefore = await lotteryGame.getCurrentPlayers();
        const results = await lotteryGame.send(
            deployer.getSender(),
            {
                value: toNano('0.005'),
            },
            'BuyTicket',
        );
        const playersAfter = await lotteryGame.getCurrentPlayers();
        expect(playersAfter).toEqual(playersBefore);
        expect(results.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryGame.address,
            success: false,
        });
    });
});
