import "@stdlib/deploy";
import "@stdlib/ownable";

message BuyNumber {
    num: Int as uint16;
}

message PickWinners {
}

message InternalPickWinners {
}

message TransferRemainingPotBalance {
    to: Address;
}

struct LotteryData {
    deployTime: Int as uint32;
    currentNumOfPlayers: Int as uint16;
    currentPlayers: map<Int as uint16, Address>;
    maxPlayers: Int as uint16;
    numPrice: Int as coins;
    lotteryDuration: Int as uint32;
    devFee: Int as uint8;
    winnersMap: map<Int as uint64, Int as uint16>;
}

struct PlayersData {
    currentPlayers: map<Int as uint16, Address>;
    currentNumOfPlayers: Int as uint16;
}

contract LotteryGame with Deployable, OwnableTransferable {
    // parent: Address;
    // id: Int as uint32;
    const MIN_TONS_FOR_STORAGE: Int = ton("0");
    owner: Address;
    currentPlayers: map<Int as uint16, Address>;
    currentNumOfPlayers: Int as uint16;
    maxPlayers: Int as uint16;
    numPrice: Int as coins;
    lotteryDuration: Int as uint32; // in seconds
    deployTime: Int as uint32;
    devFee: Int as uint8;
    winnersMap: map<Int as uint64, Int as uint16>;

    init(maxPlayers: Int, numPrice: Int, owner: Address, lotteryDuration: Int?, devFee: Int, winnersMap: map<Int as uint64, Int as uint16>) {
        self.owner = owner;
        self.deployTime = now();
        self.currentNumOfPlayers = 0;
        self.maxPlayers = maxPlayers;
        self.numPrice = numPrice;
        self.lotteryDuration = lotteryDuration != null ? lotteryDuration!! : 7 * 24 * 60 * 60; // 1 week by default
        self.devFee = devFee;
        self.winnersMap = winnersMap;
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
        // let emitMsg: StringBuilder = beginString();
        // emitMsg.append("You bought the number ");
        // emitMsg.append(msg.num.toString());
        // emit(emitMsg.toCell());
    }

    receive(msg: PickWinners) {
        require(now() - self.deployTime >= self.lotteryDuration, "Lottery is not over");
        send(SendParameters{
            to: myAddress(),
            value: 0,
            mode: SendRemainingValue | SendBounceIfActionFail,
            body: InternalPickWinners{}.toCell()
        });
    }

    receive(msg: InternalPickWinners) {
        require(sender() == myAddress(), "Only the contract itself can call this function");
        // Substract the dev fee
        // let devFeeAmount: Int = (myBalance()-self.MIN_TONS_FOR_STORAGE-context().value)*self.devFee/100;
        if (self.devFee > 0) {
            send(SendParameters{
                to: self.owner,
                value: self.devFee,
                mode: SendBounceIfActionFail
            });
        }
        let totalSum: Int = 0;
        // Pick the winners
        foreach (quantity, winners in self.winnersMap) {
            repeat(winners) {
                totalSum += quantity;
                nativeRandomizeLt();
                let winnerNum: Int = random(0, self.maxPlayers);
                let winner: Address? = self.currentPlayers.get(winnerNum);
                if (winner != null) {
                    // dump(myBalance());
                    // dump(myBalance()-context().value);
                    // let amountToAward: Int = (myBalance()-self.MIN_TONS_FOR_STORAGE-context().value-devFeeAmount)*key/100;
                    // dump(amountToAward);
                    // Send the prize to the winner
                    send(SendParameters{
                        to: winner!!,
                        value: quantity,
                        mode: SendBounceIfActionFail
                    });
                    // emit(beginCell().storeUint(winnerNum, 16).storeUint(key, 16).endCell());
                    // Remove the winner from the list of players
                    // and fill its place with the last player
                    self.currentPlayers.set(winnerNum, self.currentPlayers.get(self.maxPlayers-1));
                    self.currentPlayers.del(self.maxPlayers-1);
                    self.maxPlayers -= 1;
                }
            }
        }
    }

    receive(msg: TransferRemainingPotBalance) {
        require(sender() == self.owner, "Only the owner can call this function");
        send(SendParameters{
            to: msg.to,
            value: myBalance(),
            mode: SendBounceIfActionFail | SendDestroyIfZero
        });
    }

    get fun balance(): String {
        return myBalance().toCoinsString();
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

    get fun numPrice(): String {
        return self.numPrice.toCoinsString();
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

    get fun lotteryDuration(): Int {
        return self.lotteryDuration;
    }

    get fun minTonsForStorage(): String {
        return self.MIN_TONS_FOR_STORAGE.toCoinsString();
    }

    get fun devFee(): Int {
        return self.devFee;
    }

    get fun data(): LotteryData {
        return LotteryData {
            deployTime: self.deployTime, 
            currentNumOfPlayers: self.currentNumOfPlayers,
            currentPlayers: self.currentPlayers,
            maxPlayers: self.maxPlayers,
            numPrice: self.numPrice,
            lotteryDuration: self.lotteryDuration,
            devFee: self.devFee,
            winnersMap: self.winnersMap
        };
    }

    get fun playersInfo(): PlayersData {
        return PlayersData {
            currentPlayers: self.currentPlayers,
            currentNumOfPlayers: self.currentNumOfPlayers
        };
    }

    get fun winnersMap(): map<Int as uint64, Int as uint16> {
        return self.winnersMap;
    }

}
