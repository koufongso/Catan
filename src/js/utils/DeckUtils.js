// utils/DeckUtils.js
import { createDevCard } from '../factories/devCardFactory.js'; 

export const DevCardDeckUtils = {
    /**
     * Draws a card from the deck.
     * WARNING: This MUTATES the deck.cards array (pops from it).
     * * @param {Object} deck - The deck POJO
     * @param {number} currentTurnNumber - Needed for the new DevCard's creation
     * @returns {Object|null} The new DevCard object, or null if empty
     */
    draw: (deck, currentTurnNumber) => {
        if (deck.cards.length === 0) {
            return null;
        }

        // Remove the top card
        const cardType = deck.cards.pop();

        // Create the card object using your DevCard factory
        return createDevCard(cardType, currentTurnNumber);
    },

    /**
     * Gets the number of cards remaining.
     * @param {Object} deck 
     * @param {string|null} type - Filter by type, or null for total
     */
    getCount: (deck, type = null) => {
        if (type === null) {
            return deck.cards.length;
        }
        // Count specific type
        return deck.cards.filter(c => c === type).length;
    }
};