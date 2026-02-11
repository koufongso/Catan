import { HexUtils } from '../utils/HexUtils.js';

/**
 * Creates a plain Tile object.
 * @param {Object} coord - Hex coordinate
 * @param {string} terrainType 
 * @param {number|null} numberToken 
 * @returns {Tile}
 */
export const createTile = (coord, terrainType, numberToken) => ({
    coord,
    id: HexUtils.coordToId(coord),
    terrainType,
    numberToken
});