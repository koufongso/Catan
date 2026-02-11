// utils/MapUtils.js
import { HexUtils } from "./HexUtils.js";
import { createTile } from "../factories/tileFactory.js";
import { createRoad } from "../factories/roadFactory.js";
import { createSettlement } from "../factories/settlementFactory.js";

export const MapUtils = {
    // --- Basic Operations ---

    /**
     * Deep clones the map.
     * Since it's a POJO, we can use the native structuredClone!
     */
    clone: (map) => structuredClone(map),

    /**
     * Generic ID/Coord normalizer helper (internal use)
     */
    _normalize: (location) => {
        return typeof location === 'string' ? location : HexUtils.coordToId(location);
    },

    // --- Geometry & Caching ---

    /**
     * Computes the set of all valid vertex IDs based on current tiles.
     * NOTE: We don't store this in the map object to keep the save-file small.
     * @param {Object} map
     * @returns {Set<string>}
     */
    computeVertexIdSet: (map) => {
        const results = new Set();
        for (const tile of Object.values(map.tiles)) {
            const vCoords = HexUtils.getVerticesFromHex(tile.coord);
            for (const v of vCoords) {
                results.add(HexUtils.coordToId(v));
            }
        }
        return results;
    },

    /**
     * Geometric Query: Get 3 tiles touching a vertex.
     */
    getTilesAtVertex: (map, location) => {
        const vertexCoord = typeof location === 'string' ? HexUtils.idToCoord(location) : location;
        const adjacentHexCoords = HexUtils.getAdjHexesFromVertex(vertexCoord);

        // We use .map() and .filter() for cleaner code
        return adjacentHexCoords
            .map(coord => map.tiles[HexUtils.coordToId(coord)])
            .filter(tile => tile !== undefined);
    },

    // --- Entity Management  ---

    getRoads(map) {
        return Object.values(map.roads);
    },

    getSettlements(map) {
        return Object.values(map.settlements);
     },

    getTiles(map) {
    return Object.values(map.tiles);
    },

    /**
     * Generic filter for map entities (roads, settlements, tiles).
     * @param {Object} map - The GameMap POJO
     * @param {string} collectionKey - 'roads', 'settlements', or 'tiles'
     * @param {Function} predicate - The condition function (item) => boolean
     * @returns {Array} An array of matching objects
     */
    filter: (map, collectionKey, predicate) => {
        const collection = map[collectionKey];
        
        // Safety check: prevent crashing if key is typo'd (e.g., 'raods')
        if (!collection) {
            console.error(`MapUtils.filter: Invalid collection key '${collectionKey}'`);
            return [];
        }

        // Object.values converts { id: Object } -> [Object]
        return Object.values(collection).filter(predicate);
    },

    updateTile: (map, location, terrainType = null, numberToken = null) => {
        const id = MapUtils._normalize(location);

        if (map.tiles[id]) {
            // Edit existing (Mutate)
            if (terrainType !== null) map.tiles[id].terrainType = terrainType;
            if (numberToken !== null) map.tiles[id].numberToken = numberToken;
        } else {
            // Create new
            const coord = HexUtils.idToCoord(id);
            map.tiles[id] = createTile(coord, terrainType, numberToken);
        }
    },

    updateRoad: (map, location, ownerId) => {
        const id = MapUtils._normalize(location);

        if (map.roads[id]) {
            map.roads[id].ownerId = ownerId;
        } else {
            const coord = HexUtils.idToCoord(id);
            map.roads[id] = createRoad(coord, ownerId);
        }
    },

    updateSettlement: (map, location, ownerId = null, level = null) => {
        const id = MapUtils._normalize(location);

        if (map.settlements[id]) {
            if (ownerId !== null) map.settlements[id].ownerId = ownerId;
            if (level !== null) map.settlements[id].level = level;
        } else {
            const coord = HexUtils.idToCoord(id);
            map.settlements[id] = createSettlement(coord, ownerId, level);
        }
    },

    removeRoad: (map, location) => {
        const id = MapUtils._normalize(location);
        delete map.roads[id];
    },

    removeSettlement: (map, location) => {
        const id = MapUtils._normalize(location);
        delete map.settlements[id];
    },

    // --- Ownership Queries ---

    getSettlementOwner: (map, location) => {
        const id = MapUtils._normalize(location);
        return map.settlements[id]?.ownerId || null;
    },

    getRoadOwner: (map, location) => {
        const id = MapUtils._normalize(location);
        return map.roads[id]?.ownerId || null;
    },


    // filtering helper: get all settlements/roads owned by a player
    applyFilter(map, key, func) {
        return Object.values(map[key]).filter(func);
    },


    // --- Bulk Queries ---

    getPlayerSettlementVerticesIdSet(map, playerId) {
        const settlementIds = new Set();
        for (const settlement of Object.values(map.settlements)) {
            if (settlement.ownerId === playerId) {
                settlementIds.add(HexUtils.coordToId(settlement.coord));
            }
        }
        return settlementIds;
    },

    getAllVertexIdSet(map) {
        if (map.allVertexIdSet !== null) {
            // result cached, return it
            return map.allVertexIdSet;
        }

        // compute the set, this should only be done once unless the map changes
        let results = new Set();
        for (let [tileId, tile] of Object.entries(map.tiles)) {
            let vCoordList = HexUtils.getVerticesFromHex(tile.coord);
            for (let vCoord of vCoordList) {
                results.add(HexUtils.coordToId(vCoord));
            }
        }
        map.allVertexIdSet = results;
        return results;
    },

    getAllSettlementIdSet(map) {
        const settlementIds = new Set();
        for (const id of Object.keys(map.settlements)) {
            settlementIds.add(id);
        }
        return settlementIds;
    },

    getAllSettlementNeighborIdSet(map) {
        const neighborIds = new Set();
        for (const settlement of Object.values(map.settlements)) {
            const vCoord = settlement.coord;
            const neighborCoords = HexUtils.getAdjVerticesFromVertex(vCoord);
            for (const neighborCoord of neighborCoords) {
                neighborIds.add(HexUtils.coordToId(neighborCoord));
            }
        }
        return neighborIds;
    },

    getPlayerRoadVerticesIdSet(map, playerId) {
        const roadVertexIds = new Set();
        for (const road of Object.values(map.roads)) {
            if (road.ownerId === playerId) {
                HexUtils.getVerticesFromEdge(road.coord).forEach(vCoord => {
                    roadVertexIds.add(HexUtils.coordToId(vCoord));
                });
            }
        }
        return roadVertexIds;
    },

    updateTerrainType(tile, newTerrainType) {
        tile.terrainType = newTerrainType;
    },

    updateNumberToken(tile, newNumberToken) {
        tile.numberToken = newNumberToken;
    }
};