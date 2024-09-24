import "@stdlib/deploy";
import "@stdlib/ownable";

message BuyTicket {
    number: Int as uint16;
}

contract LotteryGame with Deployable, OwnableTransferable {
    // parent: Address;
    // id: Int as uint32;
    owner: Address;
    players: map<Int as uint16, Address>;
    currentPlayers: Int as uint16;
    maxPlayers: Int as uint16;
    ticketPrice: Int as coins;


    init(maxPlayers: Int, ticketPrice: Int, owner: Address) {
        self.owner = owner;
        self.currentPlayers = 0;
        self.maxPlayers = maxPlayers;
        self.ticketPrice = ticketPrice;
    }

    receive() {
        // Accept incoming TON transfers
    }

    receive(msg: BuyTicket) {
        self.requireOwner();
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

    get fun currentPlayers(): String {
        return self.currentPlayers.toString();
    }

    get fun maxPlayers(): String {
        return self.maxPlayers.toString();
    }

    get fun ticketPrice(): String {
        return self.ticketPrice.toCoinsString();
    }
}
