import { toNano } from '@ton/core';
import { LotteryGame } from '../wrappers/LotteryGame';
import { NetworkProvider } from '@ton/blueprint';
import { Dictionary, Address, Contract } from '@ton/core';

export async function run(provider: NetworkProvider) {
    let winnersMap = Dictionary.empty(Dictionary.Keys.BigInt(64), Dictionary.Values.Uint(16));
    winnersMap.set(toNano('10'), 1); // one winner gets 10 TONS
    winnersMap.set(toNano('5'), 2); // two winners get 5 TONS each
    winnersMap.set(toNano('2.5'), 3); // three winners get 2.5 TONS each

    const lotteryGame = provider.open(
        await LotteryGame.fromInit(102n, toNano('0.01'), provider.sender().address!!, null, 17n, winnersMap),
    );

    await lotteryGame.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'TransferRemainingPotBalance',
            to: provider.sender().address!!,
        },
    );
}
