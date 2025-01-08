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

    let prizes = Dictionary.empty(Dictionary.Keys.Uint(16), Dictionary.Values.Uint(16));
    prizes.set(30, 1); // one winner gets 10 TONS
    prizes.set(15, 2); // two winners get 5 TONS each
    prizes.set(10, 3); // three winners get 2.5 TONS each

    await lotteryMaster.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'CreateLottery',
            maxPlayers: 100n,
            numPrice: toNano('0.005'),
            lotteryDuration: 1n,
            devFee: 10n,
            prizes: prizes,
        },
    );
}
