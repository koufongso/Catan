import { DevCardType, DEV_CARD_DISTRIBUTION } from "../../constants/DevCardType.js";
import { RNG } from "../../utils/rng.js";


export class DevCard {
    constructor(type, turnBought) {
        // type check
        if (!Object.values(DevCardType).includes(type)) {
            throw new Error(`Invalid development card type: ${type}`);
        }

        this.type = type;
        this.turnBought = turnBought; // turn number when the card was bought (sleeping card rule)
        this.isPlayed = false;
        this.vp = (type === DEV_CARD_TYPES.VICTORY_POINT) ? 1 : 0;
    }

    getVP() {
        return this.vp;
    }

    markAsPlayed() {
        this.isPlayed = true;
    }
}



export class DevCardDeck {
    constructor(rng) {
        // check rng
        if (!(rng instanceof RNG)) {
            throw new Error("Invalid RNG instance");
        }

        this.rng = rng;
        this.cards = [];
        this.initializeDeck();
    }

    initializeDeck() {
        DEV_CARD_DISTRIBUTION.forEach(({ type, count }) => {
            for (let i = 0; i < count; i++) {
                this.cards.push(type);
            }
        });
        this.shuffleDeck();
    }

    shuffleDeck() {
        this.rng.shuffle(this.cards);
    }

    cardsRemaining() {
        return this.cards.length;
    }

    drawCard(currentTurnNumber) {
        if (this.cards.length === 0) {
            throw new Error("No development cards left in the deck");
        }
        return new DevCard(this.cards.pop(), currentTurnNumber);
    }
}