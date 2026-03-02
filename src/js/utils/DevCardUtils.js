// utils/DevCardUtils.js
import { DEV_CARD_TYPES } from "../constants/DevCardTypes.js";
import { DevCardEffects } from "../logic/DevCardActions.js"; // Be careful with circular imports here!
import { StatusCodes } from "../constants/StatusCodes.js";

export const DevCardUtils = {
    // Replaces getVP()
    getVP: (card) => card.vp,

    // Replaces isPlayed()
    isPlayed: (card) => card.played,

    /**
     * Replaces activate()
     * NOTE: This function MUTATES the card object (card.played = true).
     * Since 'card' is a reference, this change persists.
     */
    activate: (card, gameController, ...args) => {
        const effectFunction = DevCardEffects[card.type];
        
        if (!effectFunction) {
             throw new Error(`No effect defined for card type: ${card.type}`);
        }

        const res = effectFunction(gameController, ...args);

        if (res.status === StatusCodes.SUCCESS) {
            card.played = true; // Mutation happens here
        }
        return res;
    }
};