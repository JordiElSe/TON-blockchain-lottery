import "@stdlib/deploy";
import "@stdlib/ownable";

message BuyNumber {
    num: Int as uint16;
}

message AwardPrizes {
    winners: Cell;
    maxPlayers: Int? as uint16;
    numPrice: Int? as coins;
    devFee: Int? as uint8;
    prizes: map<Int as uint8, Int as uint16>;
    // winners: map<Int as uint16, Int as uint64>; // winning num -> quantity
    // seed: Int as uint32;
}

message CancelLottery {
    num: Int as uint16;
}

struct LotteryData {
    startTime: Int as uint32;
    currentNumOfPlayers: Int as uint16;
    currentPlayers: map<Int as uint16, Address>;
    maxPlayers: Int as uint16;
    numPrice: Int as coins;
    devFee: Int as uint8;
    prizes: map<Int as uint8, Int as uint16>;
    prizePool: Int as coins;
}

struct PlayersData {
    currentPlayers: map<Int as uint16, Address>;
    currentNumOfPlayers: Int as uint16;
}

contract LotteryGame with Deployable, OwnableTransferable {
    // const MIN_TONS_FOR_STORAGE: Int = ton("0.2");
    owner: Address;
    currentPlayers: map<Int as uint16, Address>;
    currentNumOfPlayers: Int as uint16;
    maxPlayers: Int as uint16;
    numPrice: Int as coins;
    startTime: Int as uint32;
    devFee: Int as uint8;
    prizes: map<Int as uint8, Int as uint16>; // quantity -> num of winners

    init(maxPlayers: Int, numPrice: Int, owner: Address, devFee: Int, prizes: map<Int as uint8, Int as uint16>) {
        self.owner = owner;
        self.startTime = now();
        self.currentNumOfPlayers = 0;
        self.maxPlayers = maxPlayers;
        self.numPrice = numPrice;
        self.devFee = devFee;
        self.prizes = prizes;
    }

    receive() {
        // Accept incoming TON transfers
    }

    receive(msg: BuyNumber) {
        require(msg.num >= 0 && msg.num < self.maxPlayers, "Invalid number");
        // require(self.currentNumOfPlayers < self.maxPlayers, "Lottery is full");
        require(context().value >= self.numPrice, "Not enough funds to buy a ticket");
        require(self.currentPlayers.get(msg.num) == null, "Number already taken");
        // Add the player to the list of players
        self.currentPlayers.set(msg.num, sender());
        self.currentNumOfPlayers += 1;
    }

    receive(msg: AwardPrizes) {
        dump(myBalance());
        // dump(context().value);
        self.requireOwner();
        require(self.currentNumOfPlayers == self.maxPlayers, "Lottery is not full");
        let winnerNums: Slice = msg.winners.beginParse();
        let initialBalance: Int = myBalance()-context().value;
        // dump(initialBalance);
        foreach(quantity, winners in self.prizes) {
            // dump(initialBalance*quantity);
            let amountToAward: Int = initialBalance*quantity/100;
            // dump(amountToAward);
            repeat(winners) {
                let winnerNum: Int = winnerNums.loadUint(16);
                if (self.currentPlayers.exists(winnerNum)) {
                    let winner: Address? = self.currentPlayers.get(winnerNum);
                    // if (winner != null) {
                    send(SendParameters{
                        to: winner!!,
                        value: amountToAward,
                    });
                }
                
            }
        }
        let devAmount: Int = initialBalance*self.devFee/100;
        dump(devAmount);
        send(SendParameters{
            to: self.owner,
            value: devAmount,
            mode: SendRemainingValue
        });
        

        // Reset the lottery
        self.currentPlayers = emptyMap();
        self.currentNumOfPlayers = 0;
        self.startTime = now();
        self.maxPlayers = msg.maxPlayers != null ? msg.maxPlayers!! : self.maxPlayers;
        self.numPrice = msg.numPrice != null ? msg.numPrice!! : self.numPrice;
        self.devFee = msg.devFee != null ? msg.devFee!! : self.devFee;
        self.prizes = msg.prizes;
        // nativeRandomize(msg.seed);
        // let i = 0;
        // while (i < 5) {
        //     let randomNum: Int = nativeRandomInterval(self.maxPlayers);
        //     dump(randomNum);
        //     i += 1;
        // }
        
    }

    receive(msg: CancelLottery) {
        require(self.startTime + 60 * 24 * 60 * 60 < now(), "Lottery is not old enough to be cancelled");
        require(self.currentNumOfPlayers < self.maxPlayers, "Lottery is full");
        require(self.currentPlayers.get(msg.num) == sender(), "You are not a participant");
        send(SendParameters{
            to: sender(),
            value: (myBalance() - context().value)/self.currentNumOfPlayers,
            mode: SendRemainingValue
        });
        self.currentPlayers.del(msg.num);
        self.currentNumOfPlayers -= 1;
    }

    get fun balance(): Int {
        return myBalance();
    }

    get fun currentNumOfPlayers(): Int {
        return self.currentNumOfPlayers;
    }

    get fun currentPlayers(): map<Int as uint16, Address> {
        return self.currentPlayers;
    }

    get fun maxPlayers(): String {
        return self.maxPlayers.toString();
    }

    get fun numPrice(): Int {
        return self.numPrice;
    }

    get fun playerAddress(ticketNum: Int): Address? {
        return self.currentPlayers.get(ticketNum);
    }

    get fun playerNum(address: Address): Int? {
        foreach (key, value in self.currentPlayers) {
            if (value == address) {
                return key;
            }
        }
        return null;
    }

    get fun devFee(): Int {
        return self.devFee;
    }

    get fun data(): LotteryData {
        return LotteryData {
            startTime: self.startTime, 
            currentNumOfPlayers: self.currentNumOfPlayers,
            currentPlayers: self.currentPlayers,
            maxPlayers: self.maxPlayers,
            numPrice: self.numPrice,
            devFee: self.devFee,
            prizes: self.prizes,
            prizePool: myBalance(),
        };
    }

    get fun playersInfo(): PlayersData {
        return PlayersData {
            currentPlayers: self.currentPlayers,
            currentNumOfPlayers: self.currentNumOfPlayers
        };
    }

    get fun prizes(): map<Int as uint8, Int as uint16> {
        return self.prizes;
    }

}
