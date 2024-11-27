import { toNano } from '@ton/core';
import { LotteryGame } from '../wrappers/LotteryGame';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const lotteryGame = provider.open(
        await LotteryGame.fromInit(101n, toNano('0.01'), provider.sender().address!!, null, 17n),
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
}
