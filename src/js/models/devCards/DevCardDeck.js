import { RNG } from '../../utils/rng.js';
import { DEV_CARD_DISTRIBUTION } from '../../constants/DevCardTypes.js';
import { DevCard } from './DevCard.js';

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
            return null;
        }
        return new DevCard({ type: this.cards.pop(), turnBought: currentTurnNumber });
    }

    getRemainingCardCount(type = null) {
        if (type === null) {
            return this.cards.length;
        }
        return this.cards.filter(cardType => cardType === type).length;
    }
}