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
    
    
    
    
    
    
    
    
    
    
    isSettlementSpotValid(vCoord, owner = null) {
        let vertexId = HexUtils.coordToId(vCoord);
        // Check if the vertex is already occupied
        if (this.settlements.has(vertexId)) {
            return false;
        }

        // Check if any adjacent hexes are occupied (i.e., no adjacent settlements)
        let adjvCoordList = HexUtils.getAdjVerticesFromVertex(vCoord); // get the three hexes that share this vertex
        for (let adjvCoord of adjvCoordList) {
            let adjvertexId = HexUtils.coordToId(adjvCoord);
            if (this.settlements.has(adjvertexId)) {
                // has adjacent settlement
                return false;
            }
        }

        // If owner is specified, check if there's at least one connected road owned by the player
        if (owner !== null) {
            let vCoordList = HexUtils.getAdjVerticesFromVertex(vCoord); // get the three edges connected to this vertex
            for (let vCoord1 of vCoordList) {
                const roadCoord = HexUtils.add(vCoord, vCoord1); // the road coord
                const roadId = HexUtils.coordToId(roadCoord);
                if (this.roads.has(roadId)) {
                    const road = this.roads.get(roadId);
                    if (road.owner === owner) {
                        return true; // found a connected road owned by the player
                    }
                }
            }
            return false; // no connected road found
        }

        return true;
    }


    /**
     * Return true if the road spot (edge coordinate) is valid (unoccupied), if owner is given, check if connected to owner's road
     * @param {*} eCoord 
     * @returns 
     */
    isRoadSpotValid(eCoord, owner = null) {
        let edgeId = HexUtils.coordToId(eCoord);
        // Check if the edge is already occupied
        if (this.roads.has(edgeId)) {
            return false;
        }

        // If owner is specified, check if the road is connected to an existing road  owned by the player
        if (owner !== null) {
            let adjvCoordList = HexUtils.getVerticesFromEdge(eCoord); // check the two vertices of this edge
            for (let vCoord of adjvCoordList) {
                // check for connected roads owned by the player
                let adjEdgeCoords = HexUtils.getAdjEdgesFromVertex(vCoord); // for the vertex, get all adjacent edges
                for (let adjEdgeCoord of adjEdgeCoords) {
                    let adjEdgeId = HexUtils.coordToId(adjEdgeCoord);
                    if (this.roads.has(adjEdgeId)) {
                        const road = this.roads.get(adjEdgeId);
                        if (road.owner === owner) {
                            return true; // found connected road owned by the player
                        }
                    }
                }
            }
            return false;
        }
        return true;
    }

    isRoadConnectedToSettlement(eCoord, settlementCoord, owner) {
        let adjvCoordList = HexUtils.getVerticesFromEdge(eCoord);
        for (let vCoord of adjvCoordList) {
            if (HexUtils.areCoordsEqual(vCoord, settlementCoord)) {
                let vertexId = HexUtils.coordToId(vCoord);
                if (this.settlements.has(vertexId)) {
                    let settlement = this.settlements.get(vertexId);
                    if (settlement.owner === owner) {
                        return true; // connected to the settlement owned by the player
                    }
                }
            }
        }
        return false;
    }


        isRobableTile(tileId) {
        if (this.tiles.has(tileId)) {
            const tile = this.tiles.get(tileId);
            return !HexUtils.areCoordsEqual(tile.coord, this.robberCoord); // cannot rob the tile where the robber is located
        }
        return false; // tile does not exist
    }

    import { RESOURCE_TYPES } from '../constants/ResourceTypes.js';
import { TERRAIN_TYPES } from '../constants/TerrainTypes.js';

export const TERRAIN_PRODUCTION = {
    [TERRAIN_TYPES.FOREST]:   RESOURCE_TYPES.LUMBER,
    [TERRAIN_TYPES.HILL]:     RESOURCE_TYPES.BRICK,
    [TERRAIN_TYPES.PASTURE]:  RESOURCE_TYPES.WOOL,
    [TERRAIN_TYPES.FIELD]:    RESOURCE_TYPES.WHEAT,
    [TERRAIN_TYPES.MOUNTAIN]: RESOURCE_TYPES.ORE,
    [TERRAIN_TYPES.DESERT]:   null
};

export function getResourceFromTerrain(terrainType) {
    return TERRAIN_PRODUCTION[terrainType] || null;
}