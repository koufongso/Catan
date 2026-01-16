import { DEV_CARD_TYPES, DEV_CARD_DISTRIBUTION } from "../constants/DevCardTypes.js";
import { RNG } from "../utils/rng.js";


export class DevCard {
    constructor(type, turnBought) {
        // type check
        if (!Object.values(DEV_CARD_TYPES).includes(type)) {
            throw new Error(`Invalid development card type: ${type}`);
        }

        this.type = type;
        this.turnBought = turnBought; // turn number when the card was bought (sleeping card rule)
        this.played = false;
        this.vp = (type === DEV_CARD_TYPES.VICTORY_POINT) ? 1 : 0;
    }

    getVP() {
        return this.vp;
    }

    markAsPlayed() {
        this.played = true;
    }

    isPlayable(currentTurnNumber) {
        // sleeping card rule: can only play if bought in a previous turn
        return !this.isPlayed() && !this.isLocked(currentTurnNumber);
    }

    isLocked(currentTurnNumber) {
        // locked if bought this turn
        return currentTurnNumber <= this.turnBought;
    }

    isPlayed() {
        return this.played;
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