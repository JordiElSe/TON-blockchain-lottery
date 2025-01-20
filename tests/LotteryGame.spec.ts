import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, toNano, fromNano, Cell, Dictionary, Builder, beginCell, Transaction } from '@ton/core';
import { LotteryGame } from '../wrappers/LotteryGame';
import '@ton/test-utils';
// import { promises as fsPromises } from 'fs';

// const buyNumberFeesPath = './tests/fees/buyNumberFees4.txt';

// Fisher-Yates shuffle algorithm
function shuffleArray(array: number[]): number[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateWinningNumbers(max: number, total: number): number[] {
    const numbers = shuffleArray([...Array(max)].map((_, i) => i));
    return numbers.slice(0, total);
}

describe('LotteryGame', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lotteryGame: SandboxContract<LotteryGame>;
    const prizeAmounts = [10, 15, 30];
    const winnerCounts = [3, 2, 1];
    // const prizeAmounts = [90];
    // const winnerCounts = [1];

    let prizes = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Uint(16));
    prizeAmounts.forEach((amount, i) => {
        prizes.set(amount, winnerCounts[i]);
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        lotteryGame = blockchain.openContract(
            await LotteryGame.fromInit(100n, toNano('1'), deployer.address, 10n, prizes),
        );

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
        // console.log('lottery data', await lotteryGame.getData());
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

    it('should not award prizes if the lottery is not full', async () => {
        const numPrice = await lotteryGame.getNumPrice();
        for (let i = 0; i < 99; i++) {
            const player = await blockchain.treasury('t6-player' + i);
            await lotteryGame.send(
                player.getSender(),
                {
                    value: numPrice,
                },
                {
                    $$type: 'BuyNumber',
                    num: BigInt(i),
                },
            );
        }

        const winningNums = [1, 2, 3, 53, 54, 57];
        const cell = winningNums.reduce((cell, num) => cell.storeUint(num, 16), beginCell()).endCell();

        const result = await lotteryGame.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'AwardPrizes',
                winners: cell,
                numPrice: null,
                maxPlayers: null,
                prizes: prizes,
                devFee: null,
            },
        );
        console.log('result', result.transactions[1]);
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryGame.address,
            success: false,
            exitCode: 31280, // Lottery is not full requirement failed
        });
    });

    it('should award prizes properly when lottery is full', async () => {
        // Run three times the lottery to test multiple draws
        for (let j = 0; j < 3; j++) {
            // Buy all lottery numbers
            const numPrice = await lotteryGame.getNumPrice();
            for (let i = 0; i < 100; i++) {
                const player = await blockchain.treasury('t6-player' + i);
                await lotteryGame.send(
                    player.getSender(),
                    {
                        value: numPrice,
                    },
                    {
                        $$type: 'BuyNumber',
                        num: BigInt(i),
                    },
                );
            }

            let totalPlayers = await lotteryGame.getCurrentNumOfPlayers();
            expect(totalPlayers).toBe(100n);

            const contractBalance = await lotteryGame.getBalance();
            console.log('balance after numbers are bought: ', contractBalance);
            const devFee = await lotteryGame.getDevFee();
            const storageFee = 0n; // In a real scenario this would be the storage fee for the time passed
            const initialPot = contractBalance - storageFee;
            // console.log('initialPot', initialPot);
            const fwdActionFees = toNano('0.0004'); // fwd_fee and action_fee deducted from value in the prize awarding transaction

            // Generate winning numbers and send them to the contract
            const totalNumberOfWinners = prizes.values().reduce((a, b) => a + b, 0);
            const winningNums = generateWinningNumbers(
                Number(await lotteryGame.getCurrentNumOfPlayers()),
                totalNumberOfWinners,
            );
            const winnersAddresses = winningNums.map(
                async (num) => (await blockchain.treasury('t6-player' + num)).address,
            );
            const winnersCell = winningNums.reduce((cell, num) => cell.storeUint(num, 16), beginCell()).endCell();
            const result = await lotteryGame.send(
                deployer.getSender(),
                {
                    value: toNano('0.05'),
                },
                {
                    $$type: 'AwardPrizes',
                    winners: winnersCell,
                    numPrice: null,
                    maxPlayers: null,
                    prizes: prizes,
                    devFee: null,
                },
            );
            printTransactionFees(result.transactions);
            expect(result.transactions).toHaveTransaction({
                from: deployer.address,
                to: lotteryGame.address,
                success: true,
            });

            // Should have deducted dev fees
            expect(result.transactions).toHaveTransaction({
                from: lotteryGame.address,
                to: deployer.address,
                value: (amount) => {
                    return amount != undefined && amount >= (initialPot * devFee) / 100n - fwdActionFees; // At least the dev fee amount plus any remaining value from the tx
                },
                success: true,
            });

            let winningNumsIndex = 0;

            for (let i = 0; i < prizeAmounts.length; i++) {
                const prizeAmount = prizeAmounts[i];
                const numWinners = winnerCounts[i];

                for (let j = 0; j < numWinners; j++) {
                    const playerAddress = await winnersAddresses[winningNumsIndex];

                    expect(result.transactions).toHaveTransaction({
                        from: lotteryGame.address,
                        to: playerAddress!!,
                        value: (initialPot * BigInt(prizeAmount)) / 100n - fwdActionFees,
                        success: true,
                    });

                    winningNumsIndex++;
                }
            }

            //Expect the contract's remaining balance to be 1 nano
            // console.log('contractBalance', await lotteryGame.getBalance());
            expect(Number(await lotteryGame.getBalance())).toBeLessThanOrEqual(BigInt(totalNumberOfWinners));
        }
    });

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
        const playersBefore = await lotteryGame.getCurrentNumOfPlayers();
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
        const playersAfter = await lotteryGame.getCurrentNumOfPlayers();
        expect(result2.transactions).toHaveTransaction({
            from: player2.address,
            to: lotteryGame.address,
            success: false,
            exitCode: 49589, // Number already taken
        });
        expect(playersAfter).toEqual(playersBefore);
    });

    it('should not buy invalid number', async () => {
        const playersBefore = await lotteryGame.getCurrentNumOfPlayers();
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
        const playersAfter = await lotteryGame.getCurrentNumOfPlayers();
        expect(playersAfter).toEqual(playersBefore);
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryGame.address,
            success: false,
            exitCode: 41644, // Invalid number
        });
    });

    it('should not buy number for less than it costs', async () => {
        const playersBefore = await lotteryGame.getCurrentNumOfPlayers();
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
        const playersAfter = await lotteryGame.getCurrentNumOfPlayers();
        expect(playersAfter).toEqual(playersBefore);
        expect(results.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryGame.address,
            success: false,
            exitCode: 15352, // Insufficient funds
        });
    });

    it('should buy number when available and the payed price is correct', async () => {
        const playersBefore = await lotteryGame.getCurrentNumOfPlayers();
        const numPrice = await lotteryGame.getNumPrice();
        const results = await lotteryGame.send(
            deployer.getSender(),
            {
                value: numPrice,
            },
            {
                $$type: 'BuyNumber',
                num: 1n,
            },
        );
        // console.log('balance after buying number: ', await lotteryGame.getBalance());
        // printTransactionFees(results.transactions);
        // console.log(results.transactions[1].totalFees.coins);
        const playersAfter = await lotteryGame.getCurrentNumOfPlayers();
        expect(playersAfter).toBe(playersBefore + 1n);
        const addedPlayer = await lotteryGame.getPlayerAddress(1n);
        expect(addedPlayer?.toString()).toEqual(deployer.address.toString());
        expect(results.transactions).toHaveTransaction({
            from: deployer.address,
            to: lotteryGame.address,
            success: true,
        });
        // We'll need only the body of the observed message:
        // const emittedMsgBody = results.externals[0].body;
        // Now, let's parse it, knowing that it's a text message.
        // NOTE: In a real-world scenario,
        //       you'd want to check that first or wrap this in a try...catch
        // try {
        //     const firstMsgText = emittedMsgBody.asSlice().loadStringTail();
        //     // console.log(firstMsgText);
        //     expect(firstMsgText).toBe('You bought the number 1');
        // } catch (e) {
        //     console.error(e);
        // }
    });

    it('once the lottery is full the prize pool should be the sum of numPrices minus fees', async () => {
        console.log('initial balance: ', await lotteryGame.getBalance());
        const numPrice = await lotteryGame.getNumPrice();
        let totalFees = 0n;

        for (let i = 0; i < 100; i++) {
            const player = await blockchain.treasury('t6-player' + i);
            const result = await lotteryGame.send(
                player.getSender(),
                {
                    value: numPrice,
                },
                {
                    $$type: 'BuyNumber',
                    num: BigInt(i),
                },
            );
            const fee = result.transactions[1].totalFees.coins;
            totalFees += fee;
            // await fsPromises.appendFile(buyNumberFeesPath, `${fee}\n`);

            // printTransactionFees(result.transactions);
        }
        // await fsPromises.appendFile(buyNumberFeesPath, `Total fees: ${totalFees}\n`);
        console.log('balance after numbers are bought: ', await lotteryGame.getBalance());
        expect((await lotteryGame.getBalance()).toString()).toBe((numPrice * 100n - totalFees).toString());
    });

    it('should return money if player cancels after 2 months have passed and lottery is not yet full', async () => {
        const numPrice = await lotteryGame.getNumPrice();
        const totalPlayers = 37;
        const playerToCancel = (await blockchain.treasury('t6-player' + 1)).getSender();
        const storageFee = 7648093n; // 2 months of storage fee
        for (let i = 0; i < totalPlayers; i++) {
            const player = await blockchain.treasury('t6-player' + i);
            await lotteryGame.send(
                player.getSender(),
                {
                    value: numPrice,
                },
                {
                    $$type: 'BuyNumber',
                    num: BigInt(i),
                },
            );
        }
        console.log('balance after numbers are bought: ', await lotteryGame.getBalance());
        expect(await lotteryGame.getCurrentNumOfPlayers()).toBe(37n);
        expect((await lotteryGame.getPlayerAddress(1n))?.toString()).toBe(playerToCancel.address.toString());
        blockchain.now!! += 60 * 24 * 60 * 60; // 2 months
        const balanceBefore = await lotteryGame.getBalance();
        const refundAmount = (balanceBefore - storageFee) / BigInt(totalPlayers);

        const result2 = await lotteryGame.send(
            playerToCancel,
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CancelNumber',
                num: 1n,
            },
        );

        expect(result2.transactions).toHaveTransaction({
            from: playerToCancel.address,
            to: lotteryGame.address,
            success: true,
        });
        expect(result2.transactions).toHaveTransaction({
            from: lotteryGame.address,
            to: playerToCancel.address,
            success: true,
            value: (amount) => {
                return amount != undefined && amount >= refundAmount && amount <= refundAmount + toNano('0.05'); // At least the amount minus the fee
            },
        });
        const balanceAfter = await lotteryGame.getBalance();
        expect(balanceAfter.toString()).toBe((balanceBefore - refundAmount - storageFee).toString());
        expect((await lotteryGame.getCurrentNumOfPlayers()).toString()).toBe('36');
        console.log(await lotteryGame.getPlayerAddress(1n));
        expect(await lotteryGame.getPlayerAddress(1n)).toBeNull();
    });

    it('should not return money if 2 months have passed but lottery is full', async () => {
        const numPrice = await lotteryGame.getNumPrice();
        const storageFee = 13981755n; // 2 months of storage fee
        for (let i = 0; i < 100; i++) {
            const player = await blockchain.treasury('t6-player' + i);
            await lotteryGame.send(
                player.getSender(),
                {
                    value: numPrice,
                },
                {
                    $$type: 'BuyNumber',
                    num: BigInt(i),
                },
            );
        }
        console.log('balance after numbers are bought: ', await lotteryGame.getBalance());
        expect(await lotteryGame.getCurrentNumOfPlayers()).toBe(100n);
        blockchain.now!! += 60 * 24 * 60 * 60; // 2 months
        const balanceBefore = await lotteryGame.getBalance();

        const playerToCancel = (await blockchain.treasury('t6-player' + 1)).getSender();
        const result = await lotteryGame.send(
            playerToCancel,
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CancelNumber',
                num: 1n,
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: playerToCancel.address,
            to: lotteryGame.address,
            success: false,
            exitCode: 23638, // Lottery is full
        });
        const balanceAfter = await lotteryGame.getBalance();
        expect(balanceAfter.toString()).toBe((balanceBefore - storageFee).toString());
        expect((await lotteryGame.getCurrentNumOfPlayers()).toString()).toBe('100');
    });

    it('should be at 0 balance if all players cancel after 2 months have passed', async () => {
        const numPrice = await lotteryGame.getNumPrice();

        const totalPlayers = 99;
        const storageFee = 7648093n; // 2 months of storage fee
        for (let i = 0; i < totalPlayers; i++) {
            const player = await blockchain.treasury('t6-player' + i);
            await lotteryGame.send(
                player.getSender(),
                {
                    value: numPrice,
                },
                {
                    $$type: 'BuyNumber',
                    num: BigInt(i),
                },
            );
        }
        console.log('balance after numbers are bought: ', await lotteryGame.getBalance());
        expect(await lotteryGame.getCurrentNumOfPlayers()).toBe(BigInt(totalPlayers));
        blockchain.now!! += 60 * 24 * 60 * 60; // 2 months
        const balanceBefore = await lotteryGame.getBalance();
        const refundAmount = (balanceBefore - storageFee) / BigInt(totalPlayers);

        for (let i = 0; i < totalPlayers; i++) {
            const player = await blockchain.treasury('t6-player' + i);
            const result = await lotteryGame.send(
                player.getSender(),
                {
                    value: toNano('0.05'),
                },
                {
                    $$type: 'CancelNumber',
                    num: BigInt(i),
                },
            );
            // printTransactionFees(result.transactions);

            expect(result.transactions).toHaveTransaction({
                from: player.address,
                to: lotteryGame.address,
                success: true,
            });
            expect(result.transactions).toHaveTransaction({
                from: lotteryGame.address,
                to: player.address,
                success: true,
                value: (amount) => {
                    return amount != undefined && amount >= refundAmount && amount <= refundAmount + toNano('0.05'); // At least the amount minus the fee
                },
            });
        }
        const balanceAfter = await lotteryGame.getBalance();
        expect(balanceAfter.toString()).toBe('0');
        expect((await lotteryGame.getCurrentNumOfPlayers()).toString()).toBe('0');
    });
});
