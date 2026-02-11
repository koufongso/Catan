import { DEV_CARD_DISTRIBUTION } from '../constants/DevCardTypes.js';

/**
 * Creates a shuffled deck of Dev Cards.
 * @param {Object} rng - The RNG instance (must have a shuffle() method)
 * @param {Array} devCardDistribution - Optional custom distribution of dev cards (array of {type, count})
 * @returns {Object} The deck state { cards: string[] }
 */
export const createDevCardDeck = (rng, devCardDistribution = DEV_CARD_DISTRIBUTION) => {
    // 1. Generate the flat list of cards
    const cards = [];
    devCardDistribution.forEach(({ type, count }) => {
        for (let i = 0; i < count; i++) {
            cards.push(type);
        }
    });

    // 2. Shuffle immediately
    rng.shuffle(cards);

    // 3. Return pure data
    return {
        cards
    };
};