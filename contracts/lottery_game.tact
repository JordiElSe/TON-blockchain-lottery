import "@stdlib/deploy";
import "@stdlib/ownable";

message BuyNumber {
    num: Int as uint16;
}

message PickWinners {
    winnersMap: map<Int as uint8, Int as uint16>;
}

message InternalPickWinners {
    winnersMap: map<Int as uint8, Int as uint16>;
}

contract LotteryGame with Deployable, OwnableTransferable {
    // parent: Address;
    // id: Int as uint32;
    const MIN_TONS_FOR_STORAGE: Int = ton("0.1");
    owner: Address;
    players: map<Int as uint16, Address>;
    currentPlayers: Int as uint16;
    maxPlayers: Int as uint16;
    numPrice: Int as coins;
    lotteryDuration: Int as uint32; // in seconds
    deployTime: Int as uint32;

    init(maxPlayers: Int, numPrice: Int, owner: Address, lotteryDuration: Int?) {
        self.owner = owner;
        self.deployTime = now();
        self.currentPlayers = 0;
        self.maxPlayers = maxPlayers;
        self.numPrice = numPrice;
        self.lotteryDuration = lotteryDuration != null ? lotteryDuration!! : 7 * 24 * 60 * 60; // 1 week by default
    }

    receive() {
        // Accept incoming TON transfers
    }

    receive(msg: BuyNumber) {
        require(msg.num >= 0 && msg.num < self.maxPlayers, "Invalid number");
        // require(self.currentPlayers < self.maxPlayers, "Lottery is full");
        require(context().value >= self.numPrice, "Not enough funds to buy a ticket");
        require(self.players.get(msg.num) == null, "Number already taken");
        // Add the player to the list of players
        self.players.set(msg.num, sender());
        self.currentPlayers += 1;
        let emitMsg: StringBuilder = beginString();
        emitMsg.append("You bought the number ");
        emitMsg.append(msg.num.toString());
        emit(emitMsg.toCell());
    }

    receive(msg: PickWinners) {
        require(now() - self.deployTime >= self.lotteryDuration, "Lottery is not over");
        send(SendParameters{
            to: myAddress(),
            value: 0,
            mode: SendRemainingValue | SendBounceIfActionFail,
            body: InternalPickWinners{winnersMap: msg.winnersMap}.toCell()
        });
    }

    receive(msg: InternalPickWinners) {
        // require(sender() == myAddress(), "Only the contract itself can call this function");
        let totalSum: Int = 0;
        // Pick the winners
        foreach (key, value in msg.winnersMap) {
            repeat(value) {
                dump("entering loop");
                totalSum += key;
                require(totalSum <= 100, "Invalid winners map");
                nativeRandomizeLt();
                let winnerNum: Int = random(0, self.maxPlayers);
                let winner: Address? = self.players.get(winnerNum);
                
                if (winner != null) {
                    // Send the prize to the winner
                    send(SendParameters{
                        to: winner!!,
                        value: (myBalance()-self.MIN_TONS_FOR_STORAGE)*key/100,
                        mode: SendBounceIfActionFail,
                    });
                    let emitMsg: StringBuilder = beginString();
                    emitMsg.append("The winner is ");
                    emitMsg.append(winner!!.toString());
                    emit(emitMsg.toCell());
                }
            }
        }
    }

    bounced(rawMsg: Slice) {
        dump("bounced");
    }

    get fun balance(): String {
        return myBalance().toCoinsString();
    }

    get fun currentPlayers(): Int {
        return self.currentPlayers;
    }

    get fun maxPlayers(): String {
        return self.maxPlayers.toString();
    }

    get fun numPrice(): String {
        return self.numPrice.toCoinsString();
    }

    get fun player(ticketNum: Int): Address? {
        return self.players.get(ticketNum);
    }

    get fun lotteryDuration(): Int {
        return self.lotteryDuration;
    }
}
