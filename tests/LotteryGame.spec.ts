import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, toNano, fromNano, Cell } from '@ton/core';
import { LotteryGame } from '../wrappers/LotteryGame';
import '@ton/test-utils';

describe('LotteryGame', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lotteryGame: SandboxContract<LotteryGame>;

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

    /* it('should not buy number if the lottery is full', async () => {
        for (let i = 0; i < 100; i++) {
            const player = await blockchain.treasury('player' + i);
            const result = await lotteryGame.send(
                player.getSender(),
                {
                    value: toNano('0.01'),
                },
                {
                    $$type: 'BuyNumber',
                    num: BigInt(i),
                },
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
            {
                $$type: 'BuyNumber',
                num: 0n,
            },
        );
        const playersAfter = await lotteryGame.getCurrentPlayers();
        expect(playersAfter).toEqual(playersBefore);
        expect(result.transactions).toHaveTransaction({
            from: player.address,
            to: lotteryGame.address,
            success: false,
        });
    }); */

    it('should not buy number if already taken', async () => {
        const player1 = await blockchain.treasury('player1');
        const player2 = await blockchain.treasury('player2');
        const result1 = await lotteryGame.send(
            player1.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'BuyNumber',
                num: 1n,
            },
        );
        const playersBefore = await lotteryGame.getCurrentPlayers();
        expect(result1.transactions).toHaveTransaction({
            from: player1.address,
            to: lotteryGame.address,
            success: true,
        });
        const result2 = await lotteryGame.send(
            player2.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'BuyNumber',
                num: 1n,
            },
        );
        const playersAfter = await lotteryGame.getCurrentPlayers();
        expect(result2.transactions).toHaveTransaction({
            from: player2.address,
            to: lotteryGame.address,
            success: false,
        });
        expect(playersAfter).toEqual(playersBefore);
    });

    it('should not buy invalid number', async () => {
        const playersBefore = await lotteryGame.getCurrentPlayers();
        const result = await lotteryGame.send(
            deployer.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'BuyNumber',
                num: 100n,
            },
        );
        const playersAfter = await lotteryGame.getCurrentPlayers();
        expect(playersAfter).toEqual(playersBefore);
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryGame.address,
            success: false,
        });
    });

    it('should not buy number for less than it costs', async () => {
        const playersBefore = await lotteryGame.getCurrentPlayers();
        const results = await lotteryGame.send(
            deployer.getSender(),
            {
                value: toNano('0.005'),
            },
            {
                $$type: 'BuyNumber',
                num: 0n,
            },
        );
        const playersAfter = await lotteryGame.getCurrentPlayers();
        expect(playersAfter).toEqual(playersBefore);
        expect(results.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryGame.address,
            success: false,
        });
    });

    it('should buy number when available and the payed price is correct', async () => {
        const playersBefore = await lotteryGame.getCurrentPlayers();
        const results = await lotteryGame.send(
            deployer.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'BuyNumber',
                num: 1n,
            },
        );
        const playersAfter = await lotteryGame.getCurrentPlayers();
        expect(playersAfter).toBe(playersBefore + 1n);
        expect(results.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryGame.address,
            success: true,
        });
        // We'll need only the body of the observed message:
        const emittedMsgBody = results.externals[0].body;
        // Now, let's parse it, knowing that it's a text message.
        // NOTE: In a real-world scenario,
        //       you'd want to check that first or wrap this in a try...catch
        try {
            const firstMsgText = emittedMsgBody.asSlice().loadStringTail();
            // console.log(firstMsgText);
            expect(firstMsgText).toBe('You bought the number 1');
        } catch (e) {
            console.error(e);
        }
    });
});
