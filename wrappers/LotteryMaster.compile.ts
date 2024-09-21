import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/lottery_master.tact',
    options: {
        debug: true,
    },
};
