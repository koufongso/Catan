import { DEV_CARD_TYPES } from "../../constants/DevCardTypes.js";
import { DevCardEffects } from "./DevCardActions.js";
import { StatusCodes } from "../../constants/StatusCodes.js";


export class DevCard {
    constructor(data) {
        const dataCopy = structuredClone(data); // create a deep copy to avoid mutating original data

        // type check
        if (!Object.values(DEV_CARD_TYPES).includes(dataCopy.type)) {
            throw new Error(`Invalid development card type: ${data.type}`);
        }

        this.type = dataCopy.type;
        this.turnBought = dataCopy.turnBought; 
        this.played = dataCopy.played || false; 
        this.vp = (dataCopy.type === DEV_CARD_TYPES.VICTORY_POINT) ? 1 : 0;
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