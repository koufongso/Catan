// utils/DevCardUtils.js
import { DEV_CARD_TYPES } from "../constants/DevCardTypes.js";
import { DevCardEffects } from "../logic/DevCardActions.js"; // Be careful with circular imports here!
import { StatusCodes } from "../constants/StatusCodes.js";

export const DevCardUtils = {
    // Replaces getVP()
    getVP: (card) => card.vp,

    // Replaces isPlayed()
    isPlayed: (card) => card.played,

    // Replaces isLocked()
    isLocked: (card, currentTurnNumber) => {
        if (currentTurnNumber === undefined) {
            throw new Error("Current turn number is required");
        }
        // VP cards are never "locked" in the sense that they reveal instantly at end game, 
        // but regular cards are locked if bought this turn.
        return (card.type !== DEV_CARD_TYPES.VICTORY_POINT && currentTurnNumber <= card.turnBought);
    },

    // Replaces isPlayable()
    isPlayable: (card, currentTurnNumber) => {
        return !card.played && !DevCardUtils.isLocked(card, currentTurnNumber);
    },

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