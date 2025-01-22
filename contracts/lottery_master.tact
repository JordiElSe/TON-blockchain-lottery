import "@stdlib/deploy";
import "@stdlib/ownable";
import "./lottery_game";

message CreateLottery {
    maxPlayers: Int as uint16;
    numPrice: Int as coins;
    devFee: Int as uint8;
    prizes: map<Int as uint8, Int as uint16>;
}

contract LotteryMaster with Deployable, OwnableTransferable {
    owner: Address;
    id: Int as uint8;

    init(id: Int) {
        self.owner = sender();
        self.id = id;
    }

    receive() {
    }

    receive(msg: CreateLottery) {
        self.requireOwner();
        let init: StateInit = initOf LotteryGame(msg.maxPlayers, msg.numPrice, self.owner, msg.devFee, msg.prizes);
        send(SendParameters{
            to: contractAddress(init),
            value: ton("0.02"),
            code: init.code,
            data: init.data,
        });
    }

    receive("Withdraw") {
        self.requireOwner();
        send(SendParameters{
            to: self.owner,
            value: SendRemainingBalance,
        });
    }

    get fun balance(): String {
        return myBalance().toCoinsString();
    }

    get fun lotteryGameAddress(maxPlayers: Int, numPrice: Int, devFee: Int, prizes: map<Int as uint8, Int as uint16>): Address {
        return contractAddress(initOf LotteryGame(maxPlayers, numPrice, self.owner, devFee, prizes));
    }
}
