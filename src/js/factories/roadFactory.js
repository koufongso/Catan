import { HexUtils } from '../utils/HexUtils.js';

/**
 * Creates a Road object.
 * @param {Object} coord - The edge coordinate (a triplet) [q, r, s]
 * @param {string} ownerId - The ID of the player who owns it
 * @returns {Road}
 */
export const createRoad = (coord, ownerId) => ({
    coord,
    id: HexUtils.coordToId(coord),
    ownerId
});