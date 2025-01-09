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
            await LotteryGame.fromInit(100n, toNano('1'), deployer.address, null, 10n, prizes),
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

    // it('should award winners', async () => {
    //     const numPrice = await lotteryGame.getNumPrice();
    //     for (let i = 0; i < 100; i++) {
    //         const player = await blockchain.treasury('t6-player' + i);
    //         await lotteryGame.send(
    //             player.getSender(),
    //             {
    //                 value: numPrice,
    //             },
    //             {
    //                 $$type: 'BuyNumber',
    //                 num: BigInt(i),
    //             },
    //         );
    //     }

    //     console.log('balance after numbers are bought: ', await lotteryGame.getBalance());
    //     blockchain.now!! += 7 * 24 * 60 * 60; // 7 days later
    //     // const winningNums = [43, 22, 12, 55, 87, 74];
    //     const winningNums = [43];
    //     const cell = winningNums.reduce((cell, num) => cell.storeUint(num, 16), beginCell()).endCell();

    //     console.log('balance after 7 days: ', await lotteryGame.getBalance());
    //     const result = await lotteryGame.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano('0.05'),
    //         },
    //         {
    //             $$type: 'AwardPrizes',
    //             winners: cell,
    //             numPrice: null,
    //             maxPlayers: null,
    //             prizes: prizes,
    //             lotteryDuration: null,
    //             devFee: null,
    //         },
    //     );
    //     printTransactionFees(result.transactions);
    //     console.log(
    //         'valueIn in awardPrizes',
    //         result.transactions[2].inMessage?.info.type === 'internal'
    //             ? result.transactions[2].inMessage.info.value.coins
    //             : undefined,
    //     );
    //     console.log(
    //         'valueIn dev fee',
    //         result.transactions[3].inMessage?.info.type === 'internal'
    //             ? result.transactions[3].inMessage.info.value.coins
    //             : undefined,
    //     );
    //     console.log(
    //         'in forward fee',
    //         result.transactions[2].inMessage?.info.type === 'internal'
    //             ? result.transactions[2].inMessage.info.forwardFee
    //             : undefined,
    //     );
    //     if (result.transactions[2].description.type === 'generic') {
    //         console.log(
    //             'compute fees',
    //             result.transactions[2].description.computePhase.type === 'vm'
    //                 ? result.transactions[2].description.computePhase.gasFees
    //                 : undefined,
    //         );
    //         console.log('action fee', result.transactions[2].description.actionPhase?.totalActionFees);
    //         console.log('total forward fee', result.transactions[2].description.actionPhase?.totalFwdFees);
    //     }
    //     console.log('totalFees in awardPrizes', result.transactions[2].totalFees.coins);
    //     console.log('balance after awarding prizes: ', await lotteryGame.getBalance());
    // });

    // it('should award prizes properly when lottery is full', async () => {
    //     // Run three times the lottery to test multiple draws
    //     for (let j = 0; j < 3; j++) {
    //         // Buy all lottery numbers
    //         const numPrice = await lotteryGame.getNumPrice();
    //         for (let i = 0; i < 100; i++) {
    //             const player = await blockchain.treasury('t6-player' + i);
    //             await lotteryGame.send(
    //                 player.getSender(),
    //                 {
    //                     value: numPrice,
    //                 },
    //                 {
    //                     $$type: 'BuyNumber',
    //                     num: BigInt(i),
    //                 },
    //             );
    //         }

    //         let totalPlayers = await lotteryGame.getCurrentNumOfPlayers();
    //         expect(totalPlayers).toBe(100n);

    //         // Simulate passage of time
    //         blockchain.now!! += 7 * 24 * 60 * 60; // 7 days later

    //         const contractBalance = await lotteryGame.getBalance();
    //         console.log('balance after numbers are bought: ', contractBalance);
    //         const devFee = await lotteryGame.getDevFee();
    //         const storageFee = 1675862n; // For 7 days
    //         const initialPot = contractBalance - storageFee;
    //         // console.log('initialPot', initialPot);
    //         const fwdActionFees = toNano('0.0004'); // fwd_fee and action_fee deducted from value in the prize awarding transaction

    //         // Generate winning numbers and send them to the contract
    //         const totalNumberOfWinners = prizes.values().reduce((a, b) => a + b, 0);
    //         const winningNums = generateWinningNumbers(
    //             Number(await lotteryGame.getCurrentNumOfPlayers()),
    //             totalNumberOfWinners,
    //         );
    //         console.log('winningNums', winningNums);
    //         const winnersAddresses = winningNums.map(
    //             async (num) => (await blockchain.treasury('t6-player' + num)).address,
    //         );
    //         const winnersCell = winningNums.reduce((cell, num) => cell.storeUint(num, 16), beginCell()).endCell();
    //         console.log(winnersCell);
    //         const result = await lotteryGame.send(
    //             deployer.getSender(),
    //             {
    //                 value: toNano('0.05'),
    //             },
    //             {
    //                 $$type: 'AwardPrizes',
    //                 winners: winnersCell,
    //                 numPrice: null,
    //                 maxPlayers: null,
    //                 prizes: prizes,
    //                 lotteryDuration: null,
    //                 devFee: null,
    //             },
    //         );
    //         printTransactionFees(result.transactions);
    //         expect(result.transactions).toHaveTransaction({
    //             from: deployer.address,
    //             to: lotteryGame.address,
    //             success: true,
    //         });

    //         // Should have deducted dev fees
    //         expect(result.transactions).toHaveTransaction({
    //             from: lotteryGame.address,
    //             to: deployer.address,
    //             value: (amount) => {
    //                 return amount != undefined && amount >= (initialPot * devFee) / 100n - fwdActionFees; // At least the dev fee amount plus any remaining value from the tx
    //             },
    //             success: true,
    //         });

    //         let winningNumsIndex = 0;

    //         for (let i = 0; i < prizeAmounts.length; i++) {
    //             const prizeAmount = prizeAmounts[i];
    //             const numWinners = winnerCounts[i];

    //             for (let j = 0; j < numWinners; j++) {
    //                 const playerAddress = await winnersAddresses[winningNumsIndex];

    //                 expect(result.transactions).toHaveTransaction({
    //                     from: lotteryGame.address,
    //                     to: playerAddress!!,
    //                     value: (initialPot * BigInt(prizeAmount)) / 100n - fwdActionFees,
    //                     success: true,
    //                 });

    //                 winningNumsIndex++;
    //             }
    //         }

    //         //Expect the contract's remaining balance to be 1 nano
    //         // console.log('contractBalance', await lotteryGame.getBalance());
    //         expect(Number(await lotteryGame.getBalance())).toBeLessThanOrEqual(BigInt(totalNumberOfWinners));
    //     }
    // });

    it('should only award prize if winning number has an owner', async () => {
        // Run three times the lottery to test multiple draws
        for (let j = 0; j < 3; j++) {
            // Buy only half of the lottery numbers
            const numPrice = await lotteryGame.getNumPrice();
            for (let i = 0; i < 50; i++) {
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
            expect(totalPlayers).toBe(50n);

            // Simulate passage of time
            blockchain.now!! += 7 * 24 * 60 * 60; // 7 days later

            const contractBalance = await lotteryGame.getBalance();
            console.log('balance after numbers are bought: ', contractBalance);
            const devFee = await lotteryGame.getDevFee();
            const storageFee = 1037378n; // For 7 days
            const initialPot = contractBalance - storageFee;
            const fwdActionFees = toNano('0.0004');

            const winningNums = [1, 2, 3, 53, 54, 57];
            const totalNumberOfWinners = prizes.values().reduce((a, b) => a + b, 0);

            const winnersAddresses = winningNums.map(async (num) =>
                num >= 50 ? null : (await blockchain.treasury('t6-player' + num)).address,
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
                    lotteryDuration: null,
                    devFee: null,
                },
            );
            // printTransactionFees(result.transactions);
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
            let expectedRemainingBalance = 0n;
            for (let i = 0; i < prizeAmounts.length; i++) {
                const prizeAmount = prizeAmounts[i];
                const numWinners = winnerCounts[i];

                for (let j = 0; j < numWinners; j++) {
                    if (winningNums[winningNumsIndex] < 50) {
                        // If number was bought
                        const playerAddress = await winnersAddresses[winningNumsIndex];

                        expect(result.transactions).toHaveTransaction({
                            from: lotteryGame.address,
                            to: playerAddress!!,
                            value: (initialPot * BigInt(prizeAmount)) / 100n - fwdActionFees,
                            success: true,
                        });
                    } else {
                        expectedRemainingBalance += (initialPot * BigInt(prizeAmount)) / 100n;
                    }
                    winningNumsIndex++;
                }
            }

            // Check that the not awarded prizes are kept in the contract balance
            const finalBalance = await lotteryGame.getBalance();
            expect(finalBalance).toBeLessThanOrEqual(expectedRemainingBalance + BigInt(totalNumberOfWinners));
        }
    });

    it('should use the accumulated prize pool to award winners in the following lottery', async () => {
        for (let j = 0; j < 3; j++) {
            // Buy only half of the lottery numbers
            const numPrice = await lotteryGame.getNumPrice();
            for (let i = 0; i < 50; i++) {
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
            expect(totalPlayers).toBe(50n);

            const contractBalance = await lotteryGame.getBalance();
            expect(contractBalance).toBeGreaterThan(toNano('49')); // At least 49 TON to account for the fees

            // Simulate passage of time
            blockchain.now!! += 7 * 24 * 60 * 60; // 7 days later

            const devFee = await lotteryGame.getDevFee();
            const storageFee = 1037378n; // For 7 days
            const initialPot = contractBalance - storageFee;
            const fwdActionFees = toNano('0.0004');

            // Only half the winning numbers were bought, so the other half should remain in the contract
            const winningNums = [1, 2, 3, 54, 55, 56];

            const winnersAddresses = winningNums.map(async (num) =>
                num >= 50 ? null : (await blockchain.treasury('t6-player' + num)).address,
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
                    lotteryDuration: null,
                    devFee: null,
                },
            );

            // printTransactionFees(result.transactions);
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
            let expectedRemainingBalance = 0n;
            for (let i = 0; i < prizeAmounts.length; i++) {
                const prizeAmount = prizeAmounts[i];
                const numWinners = winnerCounts[i];

                for (let j = 0; j < numWinners; j++) {
                    if (winningNums[winningNumsIndex] < 50) {
                        // If number was bought
                        const playerAddress = await winnersAddresses[winningNumsIndex];

                        expect(result.transactions).toHaveTransaction({
                            from: lotteryGame.address,
                            to: playerAddress!!,
                            value: (initialPot * BigInt(prizeAmount)) / 100n - fwdActionFees,
                            success: true,
                        });
                    } else {
                        expectedRemainingBalance += (initialPot * BigInt(prizeAmount)) / 100n;
                    }
                    winningNumsIndex++;
                }
            }

            // Check that the not awarded prizes are kept in the contract balance
            const finalBalance = await lotteryGame.getBalance();
            expect(finalBalance).toBeLessThanOrEqual(expectedRemainingBalance + 10n);

            // Buy all lottery numbers of the next lottery
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

            totalPlayers = await lotteryGame.getCurrentNumOfPlayers();
            expect(totalPlayers).toBe(100n);

            // Simulate passage of time
            blockchain.now!! += 7 * 24 * 60 * 60; // 7 days later

            const contractBalance2 = await lotteryGame.getBalance();
            console.log('balance after numbers are fully bought: ', contractBalance2);
            const storageFee2 = 1623850n; // For 7 days
            const initialPot2 = contractBalance2 - storageFee2; // Initial pot includes the remaining balance from the previous lottery

            const totalNumberOfWinners = prizes.values().reduce((a, b) => a + b, 0);

            const winningNums2 = generateWinningNumbers(Number(totalPlayers), totalNumberOfWinners);

            const winnersAddresses2 = winningNums2.map(
                async (num) => (await blockchain.treasury('t6-player' + num)).address,
            );

            const winnersCell2 = winningNums2.reduce((cell, num) => cell.storeUint(num, 16), beginCell()).endCell();

            const result2 = await lotteryGame.send(
                deployer.getSender(),
                {
                    value: toNano('0.05'),
                },
                {
                    $$type: 'AwardPrizes',
                    winners: winnersCell2,
                    numPrice: null,
                    maxPlayers: null,
                    prizes: prizes,
                    lotteryDuration: null,
                    devFee: null,
                },
            );
            printTransactionFees(result2.transactions);
            expect(result2.transactions).toHaveTransaction({
                from: deployer.address,
                to: lotteryGame.address,
                success: true,
            });

            // // Should have deducted dev fees
            expect(result2.transactions).toHaveTransaction({
                from: lotteryGame.address,
                to: deployer.address,
                value: (amount) => {
                    return amount != undefined && amount >= (initialPot2 * devFee) / 100n - fwdActionFees; // At least the dev fee amount plus any remaining value from the tx
                },
                success: true,
            });

            let winningNumsIndex2 = 0;

            for (let i = 0; i < prizeAmounts.length; i++) {
                const prizeAmount = prizeAmounts[i];
                const numWinners = winnerCounts[i];

                for (let j = 0; j < numWinners; j++) {
                    const playerAddress = await winnersAddresses2[winningNumsIndex2];
                    expect(result2.transactions).toHaveTransaction({
                        from: lotteryGame.address,
                        to: playerAddress!!,
                        value: (initialPot2 * BigInt(prizeAmount)) / 100n - fwdActionFees,
                        success: true,
                    });

                    winningNumsIndex2++;
                }
            }

            //Expect the contract's remaining balance to be less than 1 nano per winner
            // console.log('contractBalance', await lotteryGame.getBalance());
            expect(Number(await lotteryGame.getBalance())).toBeLessThanOrEqual(BigInt(totalNumberOfWinners));
        }
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

    // it('should not buy number if already taken', async () => {
    //     const player1 = await blockchain.treasury('player1');
    //     const player2 = await blockchain.treasury('player2');
    //     const result1 = await lotteryGame.send(
    //         player1.getSender(),
    //         {
    //             value: toNano('1'),
    //         },
    //         {
    //             $$type: 'BuyNumber',
    //             num: 1n,
    //         },
    //     );
    //     const playersBefore = await lotteryGame.getCurrentNumOfPlayers();
    //     expect(result1.transactions).toHaveTransaction({
    //         from: player1.address,
    //         to: lotteryGame.address,
    //         success: true,
    //     });
    //     const result2 = await lotteryGame.send(
    //         player2.getSender(),
    //         {
    //             value: toNano('1'),
    //         },
    //         {
    //             $$type: 'BuyNumber',
    //             num: 1n,
    //         },
    //     );
    //     const playersAfter = await lotteryGame.getCurrentNumOfPlayers();
    //     expect(result2.transactions).toHaveTransaction({
    //         from: player2.address,
    //         to: lotteryGame.address,
    //         success: false,
    //     });
    //     expect(playersAfter).toEqual(playersBefore);
    // });

    // it('should not buy invalid number', async () => {
    //     const playersBefore = await lotteryGame.getCurrentNumOfPlayers();
    //     const result = await lotteryGame.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano('1'),
    //         },
    //         {
    //             $$type: 'BuyNumber',
    //             num: 100n,
    //         },
    //     );
    //     const playersAfter = await lotteryGame.getCurrentNumOfPlayers();
    //     expect(playersAfter).toEqual(playersBefore);
    //     expect(result.transactions).toHaveTransaction({
    //         from: deployer.address,
    //         to: lotteryGame.address,
    //         success: false,
    //     });
    // });

    // it('should not buy number for less than it costs', async () => {
    //     const playersBefore = await lotteryGame.getCurrentNumOfPlayers();
    //     const results = await lotteryGame.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano('0.999'),
    //         },
    //         {
    //             $$type: 'BuyNumber',
    //             num: 0n,
    //         },
    //     );
    //     const playersAfter = await lotteryGame.getCurrentNumOfPlayers();
    //     expect(playersAfter).toEqual(playersBefore);
    //     expect(results.transactions).toHaveTransaction({
    //         from: deployer.address,
    //         to: lotteryGame.address,
    //         success: false,
    //     });
    // });

    // it('should buy number when available and the payed price is correct', async () => {
    //     const playersBefore = await lotteryGame.getCurrentNumOfPlayers();
    //     const numPrice = await lotteryGame.getNumPrice();
    //     console.log('initial balance: ', await lotteryGame.getBalance());
    //     const results = await lotteryGame.send(
    //         deployer.getSender(),
    //         {
    //             value: numPrice,
    //         },
    //         {
    //             $$type: 'BuyNumber',
    //             num: 1n,
    //         },
    //     );
    //     console.log('balance after buying number: ', await lotteryGame.getBalance());
    //     printTransactionFees(results.transactions);
    //     console.log(results.transactions[1].totalFees.coins);
    //     const playersAfter = await lotteryGame.getCurrentNumOfPlayers();
    //     expect(playersAfter).toBe(playersBefore + 1n);
    //     const addedPlayer = await lotteryGame.getPlayerAddress(1n);
    //     expect(addedPlayer?.toString()).toEqual(deployer.address.toString());
    //     expect(results.transactions).toHaveTransaction({
    //         from: deployer.address,
    //         to: lotteryGame.address,
    //         success: true,
    //     });
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
    // });

    // it('should properly fill the pot with the correct amount of TON', async () => {
    //     console.log('initial balance: ', await lotteryGame.getBalance());
    //     const buyNumberGasFee = 2502400n;
    //     const numPrice = await lotteryGame.getNumPrice();
    //     let totalFees = 0n;

    //     // Create array of numbers 0-99 and shuffle it
    //     const numbers = shuffleArray([...Array(100)].map((_, i) => i));

    //     for (const num of numbers) {
    //         const player = await blockchain.treasury('t6-player' + num);
    //         const result = await lotteryGame.send(
    //             player.getSender(),
    //             {
    //                 value: numPrice,
    //             },
    //             {
    //                 $$type: 'BuyNumber',
    //                 num: BigInt(num),
    //             },
    //         );
    //         const fee = result.transactions[1].totalFees.coins;
    //         totalFees += fee;
    //         // await fsPromises.appendFile(buyNumberFeesPath, `${fee}\n`);

    //         printTransactionFees(result.transactions);
    //     }
    //     // await fsPromises.appendFile(buyNumberFeesPath, `Total fees: ${totalFees}\n`);
    //     console.log('balance after numbers are bought: ', await lotteryGame.getBalance());
    //     expect(await lotteryGame.getBalance()).toBe(fromNano(numPrice * 100n - totalFees));
    // });

    // it('should pick the winners and distribute the prize once the time period to enter the lottery is finished', async () => {
    //     console.log('initial balance: ', await lotteryGame.getBalance());
    //     //Fund lottery contract with MIN_TONS_FOR_STORAGE
    //     await lotteryGame.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano('0.4'),
    //         },
    //         null,
    //     );
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

    //     console.log('balance after numbers are bought: ', await lotteryGame.getBalance());

    //     let totalPlayers = await lotteryGame.getCurrentNumOfPlayers();
    //     expect(totalPlayers).toBe(100n);

    //     const contractBalance = await lotteryGame.getBalance();
    //     console.log('contractBalance', contractBalance);
    //     // const minTonsForStorage = await lotteryGame.getMinTonsForStorage();
    //     // console.log('minTonsForStorage', minTonsForStorage);
    //     const devFee = await lotteryGame.getDevFee();
    //     // const initialPot = toNano(contractBalance) - toNano(minTonsForStorage) - devFee;
    //     // console.log('initialPot', fromNano(initialPot));
    //     // const marginForFees = toNano('0.005');

    //     blockchain.now!! += 7 * 24 * 60 * 60; // 7 days later
    //     console.log('balance after 7 days: ', await lotteryGame.getBalance());
    //     const result = await lotteryGame.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano('1'),
    //         },
    //         'PickWinners',
    //     );
    //     printTransactionFees(result.transactions);
    //     expect(result.transactions).toHaveTransaction({
    //         from: deployer.address,
    //         to: lotteryGame.address,
    //         success: true,
    //     });

    //     const totalFwdFees: bigint[] = result.transactions
    //         .map((tx) => {
    //             if (tx.description.type === 'generic') {
    //                 return tx.description.actionPhase?.totalFwdFees || 0n;
    //             }
    //         })
    //         .filter(Boolean) as bigint[];
    //     // Should have deducted dev fees
    //     expect(result.transactions).toHaveTransaction({
    //         from: lotteryGame.address,
    //         to: deployer.address,
    //         value: (amount) => {
    //             return amount != undefined && totalFwdFees.some((fee) => devFee - (fee || 0n) <= amount);
    //         },
    //         success: true,
    //     });
    //     expect(result.externals.length).toBe((await lotteryGame.getWinnersMap()).values().reduce((a, b) => a + b, 0));
    //     for (let i = 0; i < result.externals.length; i++) {
    //         const emittedMsgBody = result.externals[i].body;
    //         const msgAsSlice = emittedMsgBody.beginParse();
    //         const winningNum = msgAsSlice.loadUint(16);
    //         const prizeAmount = msgAsSlice.loadCoins();
    //         msgAsSlice.endParse();
    //         expect(winningNum).toBeGreaterThanOrEqual(0);
    //         expect(winningNum).toBeLessThanOrEqual(Number(await lotteryGame.getMaxPlayers()));
    //         expect((await lotteryGame.getWinnersMap()).keys()).toContain(prizeAmount);
    //         // console.log(
    //         //     'The winner of the prize is number',
    //         //     winningNum,
    //         //     'and the prize is',
    //         //     prizeAmount,
    //         //     '% of the pot',
    //         // );
    //         const winner = await blockchain.treasury('t6-player' + winningNum);
    //         expect(result.transactions).toHaveTransaction({
    //             from: lotteryGame.address,
    //             to: winner.address,
    //             value: (amount) => {
    //                 return totalFwdFees.some((fee) => prizeAmount - (fee || 0n) === amount);
    //             },
    //             success: true,
    //         });

    //         // The winner should be deleted from the list of players to prevent multiple payouts
    //         const deletedPlayer = await lotteryGame.getPlayerNum(winner.address);
    //         expect(deletedPlayer?.toString()).toBeUndefined();
    //         // The winners place should be replaced by the last player or should be null if the last player was the winner
    //         const substitutePlayer = await lotteryGame.getPlayerAddress(BigInt(winningNum));
    //         // Substract the winner before check as it is zero-based
    //         --totalPlayers;
    //         if (winningNum != Number(totalPlayers)) {
    //             const lastPlayer = await blockchain.treasury('t6-player' + totalPlayers);
    //             expect(substitutePlayer?.toString()).toEqual(lastPlayer.address.toString());
    //         } else {
    //             expect(substitutePlayer?.toString()).toBeUndefined();
    //         }
    //     }
    //     //Expect the contract's remaining balance to be the 1 TON send in the message minus the fees
    //     console.log('contractBalance', await lotteryGame.getBalance());
    //     expect(Number(await lotteryGame.getBalance())).toBeLessThan(1);
    // });

    // it('should not send any prize if the winning number is not owned by any player', async () => {
    //     // Send 100 TON to the contract to have enough balance for the prize
    //     await lotteryGame.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano('100'),
    //         },
    //         null,
    //     );
    //     const contractBalanceBefore = await lotteryGame.getBalance();
    //     let winnersMap = Dictionary.empty(Dictionary.Keys.Uint(16), Dictionary.Values.Uint(8));
    //     winnersMap.set(100, 1); // one winner takes 100% of the prize
    //     blockchain.now!! += 7 * 24 * 60 * 60; // 7 days later
    //     const result = await lotteryGame.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano('1'),
    //         },
    //         'PickWinners',
    //     );
    //     expect(result.transactions).toHaveTransaction({
    //         from: deployer.address,
    //         to: lotteryGame.address,
    //         success: true,
    //     });
    //     expect(result.externals.length).toBe(0);

    //     const devFee = await lotteryGame.getDevFee();
    //     const minTonsForStorage = await lotteryGame.getMinTonsForStorage();
    //     const amountForDevs = ((toNano(contractBalanceBefore) - toNano(minTonsForStorage)) * devFee) / 100n;
    //     const initialPot = toNano(contractBalanceBefore) - toNano(minTonsForStorage) - amountForDevs;
    //     const contractBalanceAfter = await lotteryGame.getBalance();

    //     // No prize money should have been sent
    //     expect(Number(contractBalanceAfter)).toBeGreaterThan(Number(fromNano(initialPot)));
    // });
});
