import { DEV_CARD_TYPES } from "../constants/DevCardTypes.js";

/**
 * Creates a plain DevCard object.
 * @param {string} type - The card type (e.g., KNIGHT, YEAR_OF_PLENTY)
 * @param {number} turnBought - The turn number when it was bought
 * @returns {DevCard}
 */
export const createDevCard = (type, turnBought) => {
    // Validation
    if (!Object.values(DEV_CARD_TYPES).includes(type)) {
        throw new Error(`Invalid development card type: ${type}`);
    }

    return {
        type,
        turnBought,
        played: false,
        // Calculate constant data immediately
        vp: (type === DEV_CARD_TYPES.VICTORY_POINT) ? 1 : 0
    };
};