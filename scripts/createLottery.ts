import { toNano } from '@ton/core';
import { LotteryMaster } from '../wrappers/LotteryMaster';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const lotteryMaster = provider.open(await LotteryMaster.fromInit(561345n));

    await lotteryMaster.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'CreateLottery',
            maxPlayers: 100n,
            numPrice: toNano('0.01'),
            lotteryDuration: 100n,
        },
    );
    // run methods on `lotteryMaster`
}
