import { HexUtils } from "../utils/hex-utils.js";
import { RESOURCE_TYPES } from '../constants/ResourceTypes.js';
import { TERRAIN_TYPES } from '../constants/TerrainTypes.js';

// Define the production rules 
const PRODUCTION_TABLE = {
    [TERRAIN_TYPES.FOREST]:   RESOURCE_TYPES.LUMBER,
    [TERRAIN_TYPES.HILL]:     RESOURCE_TYPES.BRICK,
    [TERRAIN_TYPES.PASTURE]:  RESOURCE_TYPES.WOOL,
    [TERRAIN_TYPES.FIELD]:    RESOURCE_TYPES.WHEAT,
    [TERRAIN_TYPES.MOUNTAIN]: RESOURCE_TYPES.ORE,
    [TERRAIN_TYPES.DESERT]:   null
};
    
    
export const MapRules = {

    // ... your existing validation rules (isValidSettlementSpot, etc.) ...

    /**
     * Rule: Determines what resource a specific tile produces.
     * @param {Tile} tile - The tile to check.
     * @param {GameMap} gameMap - The current game map (for robber position). (optional)
     * @param {boolean} checkRobber - Whether to consider the robber's position. (optional, default: false)
     * @returns {RESOURCE_TYPES | null} - The resource type produced by the tile, or null if none.
     */
    getTileProduction(tile, gameMap = null, checkRobber = false) {
        if (checkRobber && HexUtils.areCoordsEqual(tile.coord, gameMap.robberCoord)) {
            return null; // tile is blocked by the robber
        }

        if (!tile || !tile.terrainType) return null;
        return PRODUCTION_TABLE[tile.terrainType] || null;
    },

    /**
     * Helper function to check if a tile is productive (i.e., has a number token, produces a resource and is not blocked by the robber).
     * @param {Tile} tile - The tile to check.
     * @param {GameMap} gameMap - The current game map (for robber position). (optional)
     * @returns {boolean} - True if the tile is productive, false otherwise.
     */
    isProductiveTile( tile, gameMap = null) {
        const resource = this.getTileProduction(tile, gameMap, true);
        return resource !== null && tile.numberToken !== null;
    }
};
    
    
    
    
