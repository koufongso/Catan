import { HexUtils } from '../utils/HexUtils.js';

/**
 * Creates a Settlement object.
 * @param {*} coord the vertex coordinate (a triplet) [q, r, s]
 * @param {*} ownerId the ID of the player who owns it
 * @param {*} level the level of the settlement (0 for empty, 1 for settlement, 2 for city)
 * @returns {Settlement}
 */
export const createSettlement = (coord, ownerId, level = 1) => ({
    coord,
    id: HexUtils.coordToId(coord),
    ownerId,
    level
});