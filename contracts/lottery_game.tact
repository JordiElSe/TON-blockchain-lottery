import "@stdlib/deploy";
import "@stdlib/ownable";

message BuyNumber {
    num: Int as uint16;
}

contract LotteryGame with Deployable, OwnableTransferable {
    // parent: Address;
    // id: Int as uint32;
    owner: Address;
    players: map<Int as uint16, Address>;
    currentPlayers: Int as uint16;
    maxPlayers: Int as uint16;
    numPrice: Int as coins;
    lotteryDuration: Int as uint32; // in seconds


    init(maxPlayers: Int, numPrice: Int, owner: Address, lotteryDuration: Int?) {
        self.owner = owner;
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

    // get fun id(): Int {
    //     return self.id;
    // }

    fun pickWiners() {
        // Pick a winner
    }

    fun awardPrizes() {
        // Award the prize
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
