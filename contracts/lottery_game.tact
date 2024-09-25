import "@stdlib/deploy";
import "@stdlib/ownable";

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

    receive("buyTicket") {
        require(self.currentPlayers < self.maxPlayers, "Lottery is full");
        require(context().value >= self.ticketPrice, "Not enough funds to buy a ticket");
        // Add the player to the list of players
        self.players.set(self.currentPlayers, sender());
        self.currentPlayers += 1;
        send(SendParameters{
            // bounce = true by default
            to: sender(), // send the message back to the original sender
            value: 0,
            mode: SendRemainingValue | SendIgnoreErrors,
            body: "Congratulations your own a ticket!".asComment(),
        });
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
