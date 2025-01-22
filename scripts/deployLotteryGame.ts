import { LotteryGame } from '../wrappers/LotteryGame';
import { NetworkProvider } from '@ton/blueprint';
import { Address, toNano, fromNano, Cell, Dictionary, Builder, beginCell, Transaction } from '@ton/core';

export async function run(provider: NetworkProvider) {
    let prizes = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Uint(16));
    prizes.set(30, 1); // one winner gets 10 TONS
    prizes.set(15, 2); // two winners get 5 TONS each
    prizes.set(10, 3); // three winners get 2.5 TONS each

    const lotteryGame = provider.open(
        await LotteryGame.fromInit(8514n, toNano('0.01'), provider.sender().address!!, 10n, prizes),
    );

    await lotteryGame.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        },
    );

    await provider.waitForDeploy(lotteryGame.address);

    // run methods on `lotteryGame`

    await lotteryGame.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'BuyNumber',
            num: 1n,
        },
    );

    const winningNums = [52, 1, 53, 54, 57, 58];
    const winnersCell = winningNums.reduce((cell, num) => cell.storeUint(num, 16), beginCell()).endCell();

    await lotteryGame.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'AwardPrizes',
            winners: winnersCell,
            maxPlayers: 100n,
            numPrice: toNano('0.005'),
            devFee: 10n,
            prizes: prizes,
        },
    );
}
