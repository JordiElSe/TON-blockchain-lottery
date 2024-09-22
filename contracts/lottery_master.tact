import "@stdlib/deploy";
import "@stdlib/ownable";

message CreateLottery {
    numOfTickets: Int as uint32;
    ticketPrice: Int as coins;
}

contract LotteryMaster with Deployable, Ownable {
    owner: Address;
    id: Int as uint32;

    init(id: Int) {
        self.owner = sender();
        self.id = id;
    }

    receive(msg: CreateLottery) {
        self.requireOwner();
        // Deploy a new Lottery contract with the given parameters
        /* deploy("Lottery", CreateLottery {
            numOfTickets: msg.numOfTickets,
            ticketPrice: msg.ticketPrice
        }); */
    }

    get fun id(): Int {
        return self.id;
    }
}
