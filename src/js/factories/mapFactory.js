// factories/mapFactory.js
import { HexUtils } from "../utils/HexUtils.js";

/**
 * Creates a plain GameMap object.
 * @returns {GameMap}
 */
export const initGameMap = () => ({
    tiles: {},        // Map<string (id), Tile>
    roads: {},        // Map<string (id), Road>
    settlements: {},  // Map<string (id), Settlement>
    tradingPosts: {}, // Map<string (id), TradingPost>
    robberCoord: [0, 0, 0]
});

/**
 * Creates a new GameMap instance from a plain object (e.g., from JSON).
 * @param {Object} mapData - The plain object containing map data.
 * @returns {GameMap} - deep-copied GameMap object
 */
export const copyGameMap = (mapData) => {
    // Deep copy the input data to ensure immutability
    const gameMap = initGameMap();
    gameMap.tiles = structuredClone(mapData.tiles);
    gameMap.roads = structuredClone(mapData.roads);
    gameMap.settlements = structuredClone(mapData.settlements);
    gameMap.tradingPosts = structuredClone(mapData.tradingPosts);
    gameMap.robberCoord = structuredClone(mapData.robberCoord);
    return gameMap;
};
