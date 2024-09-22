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
            numOfTickets: 100n,
            ticketPrice: toNano('0.01'),
        },
    );
    // run methods on `lotteryMaster`
}
