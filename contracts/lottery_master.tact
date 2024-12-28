import "@stdlib/deploy";
import "@stdlib/ownable";
import "./lottery_game";

message CreateLottery {
    maxPlayers: Int as uint16;
    numPrice: Int as coins;
    lotteryDuration: Int? as uint32;
    devFee: Int as coins;
    prizes: map<Int as uint64, Int as uint16>;
}

contract LotteryMaster with Deployable, OwnableTransferable {
    const MIN_TONS_FOR_STORAGE: Int = ton("0.01");
    owner: Address;
    id: Int as uint32;

    init(id: Int) {
        self.owner = sender();
        self.id = id;
    }

    receive() {
        // Accept incoming TON transfers
    }

    receive(msg: CreateLottery) {
        self.requireOwner();
        // require(myBalance() - ton("0.03") >= self.MIN_TONS_FOR_STORAGE, "Not enough balance to deploy a new Lottery Game contract");
        // Deploy a new Lottery contract with the given parameters
        let init: StateInit = initOf LotteryGame(msg.maxPlayers, msg.numPrice, self.owner, msg.lotteryDuration, msg.devFee, msg.prizes);
        send(SendParameters{
            to: contractAddress(init),
            value: ton("0.03"),
            mode: SendBounceIfActionFail,
            code: init.code,
            data: init.data
        });

        // self.reply("Lottery created".asComment());
        send(SendParameters{
            // bounce is set to true by default
            to: sender(), // sending message back to the sender
            value: 0, // don't add Toncoins to the message...
            mode: SendRemainingValue, // ...except for ones received from the sender due to SendRemainingValue
            // body: "Lottery created".asComment(), // asComment converts a String to a Cell with a comment
    });
    }

    get fun id(): Int {
        return self.id;
    }

    get fun balance(): String {
        return myBalance().toCoinsString();
    }

    get fun lotteryGameAddress(maxPlayers: Int, numPrice: Int, lotteryDuration: Int?, devFee: Int, prizes: map<Int as uint64, Int as uint16>): Address {
        return contractAddress(initOf LotteryGame(maxPlayers, numPrice, self.owner, lotteryDuration, devFee, prizes));
    }
}
