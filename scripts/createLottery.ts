import { toNano } from '@ton/core';
import { LotteryMaster } from '../wrappers/LotteryMaster';
import { NetworkProvider } from '@ton/blueprint';
import { Dictionary } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const lotteryMaster = provider.open(await LotteryMaster.fromInit(99n));

    // fund lottery Master
    await lotteryMaster.send(
        provider.sender(),
        {
            value: toNano('0.25'),
        },
        null,
    );

    let winnersMap = Dictionary.empty(Dictionary.Keys.BigInt(64), Dictionary.Values.Uint(16));
    winnersMap.set(toNano('10'), 1); // one winner gets 10 TONS
    winnersMap.set(toNano('5'), 2); // two winners get 5 TONS each
    winnersMap.set(toNano('2.5'), 3); // three winners get 2.5 TONS each

    await lotteryMaster.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'CreateLottery',
            maxPlayers: 100n,
            numPrice: toNano('0.005'),
            lotteryDuration: 10000000n,
            devFee: 0n,
            winnersMap: winnersMap,
        },
    );
}
