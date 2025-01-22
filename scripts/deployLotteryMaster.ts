import { toNano, Dictionary } from '@ton/core';
import { LotteryMaster } from '../wrappers/LotteryMaster';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const lotteryMaster = provider.open(await LotteryMaster.fromInit(52n));

    await lotteryMaster.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        },
    );

    await provider.waitForDeploy(lotteryMaster.address);

    // run methods on `lotteryMaster`
    let prizes = Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Uint(16));
    prizes.set(30, 1); // one winner gets 10 TONS
    prizes.set(15, 2); // two winners get 5 TONS each
    prizes.set(10, 3); // three winners get 2.5 TONS each

    await lotteryMaster.send(
        provider.sender(),
        {
            value: toNano('0.022'),
        },
        null,
    );

    await lotteryMaster.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'CreateLottery',
            maxPlayers: 100n,
            numPrice: toNano('0.01'),
            devFee: 10n,
            prizes: prizes,
        },
    );
}
