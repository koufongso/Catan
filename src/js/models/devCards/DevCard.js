import { DEV_CARD_TYPES } from "../../constants/DevCardTypes.js";
import { DevCardEffects } from "./DevCardActions.js";
import { StatusCodes } from "../../constants/StatusCodes.js";


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
        if (currentTurnNumber === undefined) {
            throw new Error("Current turn number is required to check if dev card is locked");
        }
        // locked if bought this turn, except for victory point cards
        return (this.type !== DEV_CARD_TYPES.VICTORY_POINT && currentTurnNumber <= this.turnBought);
    }

    isPlayed() {
        return this.played;
    }

    activate(gameController, ...args) {
        const res = DevCardEffects[this.type](gameController, ...args);
        if (res.status === StatusCodes.SUCCESS) { // only mark as played if activation was successful
            this.markAsPlayed();
        }
        return res;
    }
}