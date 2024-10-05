import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, toNano, fromNano, Cell, Dictionary } from '@ton/core';
import { LotteryGame } from '../wrappers/LotteryGame';
import '@ton/test-utils';

describe('LotteryGame', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lotteryGame: SandboxContract<LotteryGame>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        lotteryGame = blockchain.openContract(await LotteryGame.fromInit(100n, toNano('1'), deployer.address, null));
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

        blockchain.now = deployResult.transactions[1].now;
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
                value: toNano('1'),
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
                value: toNano('1'),
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
                value: toNano('1'),
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
                value: toNano('0.999'),
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
                value: toNano('1'),
            },
            {
                $$type: 'BuyNumber',
                num: 1n,
            },
        );
        const playersAfter = await lotteryGame.getCurrentPlayers();
        expect(playersAfter).toBe(playersBefore + 1n);
        const addedPlayer = await lotteryGame.getPlayer(1n);
        expect(addedPlayer?.toString()).toEqual(deployer.address.toString());
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

    // it('should pick the winners and distribute the prize once the time period to enter the lottery is finished', async () => {
    //     for (let i = 0; i < 100; i++) {
    //         const player = await blockchain.treasury('t6-player' + i);
    //         await lotteryGame.send(
    //             player.getSender(),
    //             {
    //                 value: toNano('1'),
    //             },
    //             {
    //                 $$type: 'BuyNumber',
    //                 num: BigInt(i),
    //             },
    //         );
    //     }
    //     const playersBefore = await lotteryGame.getCurrentPlayers();
    //     expect(playersBefore).toBe(100n);
    //     // const player = await blockchain.treasury('t6-player' + 99);
    //     // const player100 = await lotteryGame.getPlayer(99n);
    //     // console.log('Player 0:', player100);
    //     // expect(player100?.toString()).toEqual(player.address.toString());
    //     // const lotteryPotBefore = await lotteryGame.getBalance();
    //     // console.log('Lottery pot before:', lotteryPotBefore);
    //     let winnersMap = Dictionary.empty(Dictionary.Keys.Uint(16), Dictionary.Values.Uint(8));
    //     winnersMap.set(50, 1); // one winner takes 50% of the prize
    //     blockchain.now!! += 7 * 24 * 60 * 60; // 7 days later
    //     console.log('deployer initial balance', fromNano(await deployer.getBalance()));
    //     const result = await lotteryGame.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano('0.01'),
    //         },
    //         {
    //             $$type: 'InternalPickWinners',
    //             winnersMap: winnersMap,
    //         },
    //     );
    //     console.log('deployer balance after pick winners', fromNano(await deployer.getBalance()));
    //     // printTransactionFees(result.transactions);
    //     expect(result.transactions).toHaveTransaction({
    //         from: deployer.address,
    //         to: lotteryGame.address,
    //         success: true,
    //     });
    //     // We'll need only the body of the observed message:
    //     const emittedMsgBody = result.externals[0].body;
    //     // Now, let's parse it, knowing that it's a text message.
    //     // NOTE: In a real-world scenario,
    //     //       you'd want to check that first or wrap this in a try...catch
    //     try {
    //         const firstMsgText = emittedMsgBody.asSlice().loadStringTail();
    //         console.log(firstMsgText);
    //     } catch (e) {
    //         console.error(e);
    //     }
    //     // expect(result.transactions).toHaveTransaction({
    //     //     from: lotteryGame.address,
    //     //     to: lotteryGame.address,
    //     //     success: true,
    //     // });
    // });
});
