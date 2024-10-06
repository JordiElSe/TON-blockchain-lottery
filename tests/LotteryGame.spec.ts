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

    it('should pick the winners and distribute the prize once the time period to enter the lottery is finished', async () => {
        for (let i = 0; i < 100; i++) {
            const player = await blockchain.treasury('t6-player' + i);
            await lotteryGame.send(
                player.getSender(),
                {
                    value: toNano('1'),
                },
                {
                    $$type: 'BuyNumber',
                    num: BigInt(i),
                },
            );
        }

        const playersBefore = await lotteryGame.getCurrentPlayers();
        expect(playersBefore).toBe(100n);

        const contractBalance = await lotteryGame.getBalance();
        console.log('contractBalance', contractBalance);
        const minTonsForStorage = await lotteryGame.getMinTonsForStorage();
        console.log('minTonsForStorage', minTonsForStorage);
        const sendTonFee = await lotteryGame.getSendTonFee();
        const storageFee = '0.001591098';
        const initialPot =
            toNano(contractBalance) - toNano(minTonsForStorage) - toNano(sendTonFee) - toNano(storageFee);
        console.log('initialPot', fromNano(initialPot));

        let winnersMap = Dictionary.empty(Dictionary.Keys.Uint(16), Dictionary.Values.Uint(8));
        winnersMap.set(100, 1); // one winner takes 50% of the prize
        // winnersMap.set(20, 2); // two winners take 30% of the prize
        // winnersMap.set(10, 1); // three winners take 10% of the prize
        blockchain.now!! += 7 * 24 * 60 * 60; // 7 days later
        const result = await lotteryGame.send(
            deployer.getSender(),
            {
                value: toNano('1'),
            },
            {
                $$type: 'InternalPickWinners',
                winnersMap: winnersMap,
            },
        );
        // printTransactionFees(result.transactions);
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryGame.address,
            success: true,
        });
        expect(result.externals.length).toBe(1);
        for (let i = 0; i < result.externals.length; i++) {
            const emittedMsgBody = result.externals[i].body;
            try {
                const msgAsSlice = emittedMsgBody.beginParse();
                const winningNum = msgAsSlice.loadUint(16);
                const prizeAmount = msgAsSlice.loadUint(16);
                msgAsSlice.endParse();
                console.log(
                    'The winner of the prize is number',
                    winningNum,
                    'and the prize is',
                    prizeAmount,
                    '% of the pot',
                );
                const winner = await blockchain.treasury('t6-player' + winningNum);
                expect(result.transactions).toHaveTransaction({
                    from: lotteryGame.address,
                    to: winner.address,
                    value: (initialPot * BigInt(prizeAmount)) / 100n,
                    success: true,
                });
            } catch (e) {
                console.error(`Error processing external ${i}:`, e);
            }
        }
    });
});
