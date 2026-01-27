import { Tile } from "./Tile.js";
import { Road } from "./buildings/Road.js";
import { Settlement } from "./buildings/Settlement.js";
import { TradingPost } from "./buildings/TradingPost.js";
import { HexUtils } from "../utils/hex-utils.js";


export class GameMap {
    // a map has three elements: tiles, roads, settlements
    // we compute the connected components coordinates on run-time when needed
    // and query the interactable elements from these three maps
    constructor() {
        this.tiles = new Map();             // regiester all (interactable) tiles/hex, others will be conceptual "empty" tiles
        this.tradingPosts = new Map();      // register all trading posts on the map
        this.settlements = new Map();       // register all (interactable) settlements/vertices, others will be conceptual "empty" settlements
        this.roads = new Map();             // register all (interacterable) roads/edges elements, others will be conceptual "empty" roads
        this.robberCoord = [0, 0, 0];       // the tile coord where the robber is currently located

        // map "boundary" info, save for quick access, only computed once after map initialization
        this.allVertexIdSet = null;     // a set of all vertex coordinates on the map
        this.allEdgeIdSet = null;       // a set of all edge coordinates on the map
    }

    /**
     * Creates a deep clone of the current GameMap instance.
     * @returns {GameMap} A deep clone of the current GameMap instance.
     */
    clone() {
        let copy = new GameMap();
        copy.tiles = this.tiles.clone();
        copy.roads = structuredClone(this.roads);
        copy.settlements = structuredClone(this.settlements);
        copy.tradingPosts = structuredClone(this.tradingPosts);
        copy.robberCoord = structuredClone(this.robberCoord);
        copy.allVertexIdSet = structuredClone(this.allVertexIdSet);
        copy.allEdgeIdSet = structuredClone(this.allEdgeIdSet);
        return copy;
    }

    /* --------------------------------Geometry and Validity Checks ---------------------------------- */
    /**
     * Get all the vertex IDs on the map (based on existing tiles)
     * Note: this should be static after map initialization
     * @returns {Set} - A set of vertex IDs
     */
    getAllVertexIdSet() {
        if (this.allVertexIdSet !== null) {
            // result cached, return it
            return this.allVertexIdSet;
        }

        // compute the set, this should only be done once unless the map changes
        let results = new Set();
        for (let [tileId, tile] of this.tiles) {
            let vCoordList = HexUtils.getVerticesFromHex(tile.coord);
            for (let vCoord of vCoordList) {
                results.add(HexUtils.coordToId(vCoord));
            }
        }
        this.allVertexIdSet = results;
        return results;
    }

    /**
     * Check if the vertex exist on the map/board
     * @param {*} vCoord 
     * @returns {boolean} true if the vertex exists on the map
     */
    hasVertex(vCoord) {
        const id = HexUtils.coordToId(vCoord);
        return this.getAllVertexIdSet().has(id);
    }

    /**
     * Get all the edge IDs on the map (based on existing tiles)
     * Note: this should be static after map initialization
     * @returns {Set} - A set of edge IDs
     */
    getAllEdgeIdSet() {
        if (this.allEdgeIdSet !== null) {
            // result cached, return it
            return this.allEdgeIdSet;
        }

        // compute the set, this should only be done once unless the map changes
        let results = new Set();
        for (let [tileId, tile] of this.tiles) {
            let eCoordList = HexUtils.getEdgesFromHex(tile.coord);
            for (let eCoord of eCoordList) {
                results.add(HexUtils.coordToId(eCoord));
            }
        }
        this.allEdgeIdSet = results;
        return results;
    }

    /**
     * Check if the edge exist on the map/board
     * @param {*} eCoord coordinate of the edge
     * @returns {boolean} true if the edge exists on the map
     */
    hasEdge(eCoord) {
        const id = HexUtils.coordToId(eCoord);
        return this.getAllEdgeIdSet().has(id);
    }


    /**
     * Geometric Query: Get the 3 tiles touching a vertex.
     * Useful for resource distribution, UI tooltips, and port checks.
     * @param {string|Array} location - Vertex ID or Coord
     * @returns {Array<Tile>} Array of Tile objects touching the vertex
     */
    getTilesAtVertex(location) {
        const vertexCoord = typeof location === 'string' ? HexUtils.idToCoord(location) : location;
        const adjacentHexCoords = HexUtils.getAdjHexesFromVertex(vertexCoord);

        const tiles = [];
        for (const hexCoord of adjacentHexCoords) {
            const tile = this.getTile(hexCoord);
            if (tile) {
                tiles.push(tile);
            }
        }
        return tiles;
    }

    /**
     * A wrapper function to get neighboring vertices of a given vertex
     * @param {Array|string} location 
     * @returns {Array<string>} Array of neighboring vertex IDs
     */
    getNeighborsOfVertex(location) {
        const vertexCoord = typeof location === 'string' ? HexUtils.idToCoord(location) : location;
        return HexUtils.getAdjVerticesFromVertex(vertexCoord);
    }


    /* -------------------------------------------- Tiles -------------------------------------------- */

    /**
     * Get a tile by its hex coordinate or id
     * @param {Array | string} location  - hex coordinate [q,r,s] or hex id string
     * @returns {Tile} tile object
     */
    getTile(location) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);
        return this.tiles.get(id);
    }

    /**
     * Get all tiles objects on the map
     * @returns {Array<Tile>} an array of all tile objects
     */
    getAllTiles() {
        return Array.from(this.tiles.values());
    }


    /**
     * Add/update a tile by its hex coordinate coord or id
     * @param {Array | string} location  - hex coordinate [q,r,s] or hex id string
     * @param {*} terrainType 
     * @param {*} numberToken 
     */
    updateTile(location, terrainType = null, numberToken = null) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);

        if (this.tiles.has(id)) {
            // edit existing tile
            let tile = this.tiles.get(id);
            if (terrainType !== null) {
                tile.updateTerrainType(terrainType);
            }
            if (numberToken !== null) {
                tile.updateNumberToken(numberToken);
            }
            this.tiles.set(id, tile);
        }
        else {
            // add new tile
            let coords = HexUtils.idToCoord(id);
            let tile = new Tile(coords, terrainType, numberToken);
            this.tiles.set(id, tile);
        }
    }

    /**
     * Remove a tile by its hex coordinate or id
     * @param {Array | string} location  - hex coordinate [q,r,s] or hex id string
     */
    removeTile(location) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);
        this.tiles.delete(id);
    }


    /*-------------------------------------------- Roads -------------------------------------------- */

    /**
     * Get a road by its hex edge coordinate or id
     * @param {Array | string} location - hex edge coordinate [q,r,s] or edge id string 
     * @returns {Road} road object
     */
    getRoad(location) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);
        return this.roads.get(id);
    }

    /**
     * Get all roads objects on the map
     * @returns {Array<Road>} an array of all road objects
     */
    getAllRoads() {
        return Array.from(this.roads.values());
    }


    /**
     * Add/update a road by its hex edge coordinate id
     * @param {Array | string} location  - hex edge coordinate [q,r,s] or edge id string
     * @param {number} ownerId id of the player who owns the road 
     */
    updateRoad(location, ownerId) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);
        if (this.roads.has(id)) {
            // edit existing road
            let road = this.roads.get(id);
            road.ownerId = ownerId;
            this.roads.set(id, road);
        }
        else {
            // add new road
            let coord = HexUtils.idToCoord(id);
            let road = new Road(coord, ownerId);
            this.roads.set(id, road);
        }
    }


    /**
     * Remove a road by its hex edge coordinate id
     * @param {Array | string} location  - hex edge coordinate [q,r,s] or edge id string
     */
    removeRoad(location) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);
        this.roads.delete(id);
    }

    /*-------------------------------------------- Settlements -------------------------------------------- */

    /**
     * Get a settlement by its hex vertex coordinate or id
     * @param {Array | string} location  - hex vertex coordinate [q,r,s] or vertex id string
     * @returns {Settlement} settlement object
     */
    getSettlement(location) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);
        return this.settlements.get(id);
    }

    /**
     * Get all settlement objects on the map
     * @returns {Array<Settlement>} an array of all settlement objects
     */
    getAllSettlements() {
        return Array.from(this.settlements.values());
    }

    /**
     * Add/update a settlement by its hex vertex coordinate or id
     * @param {Array | string} location  - hex vertex coordinate [q,r,s] or vertex id string
     * @param {number} ownerId id of the player who owns the settlement
     * @param {number} level level of the settlement (0 for empty, 1 for settlement, 2 for city)
     */
    updateSettlement(location, ownerId = null, level = null) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);
        if (this.settlements.has(id)) {
            // edit existing settlement
            let settlement = this.settlements.get(id);
            if (ownerId !== null) {
                settlement.ownerId = ownerId;
            }
            if (level !== null) {
                settlement.level = level;
            }
            this.settlements.set(id, settlement);
        } else {
            // add new settlement
            let coord = HexUtils.idToCoord(id);
            let settlement = new Settlement(coord, ownerId, level);
            this.settlements.set(id, settlement);
        }
    }

    /**
     * Remove a settlement by its hex vertex coordinate or id
     * @param {Array | string} location  - hex vertex coordinate [q,r,s] or vertex id string
     */
    removeSettlement(location) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);
        this.settlements.delete(id);
    }

    /*-------------------------------------------- Trading Posts -------------------------------------------- */

    /**
     * Get a trading post by its hex coordinate or id
     * @param {Array | string} location  - hex coordinate [q,r,s] or hex id string
     * @returns {TradingPost} trading post object
     */
    getTradingPost(location) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);
        return this.tradingPosts.get(id);
    }

    /**
     * Add/update a trading post by its hex coordinate or id
     * @param {Array | string} location  - hex coordinate [q,r,s] or hex id string
     * @param {Array} indexList the list of tile index the trading post is associated with
     * @param {Object} tradeList the trade list of the trading post
     */
    updateTradingPost(location, indexList, tradeList = {}) {
        const id = typeof location === 'string' ? location : HexUtils.coordToId(location);
        if (this.tradingPosts.has(id)) {
            // edit existing trading post
            let tradingPost = this.tradingPosts.get(id);
            tradingPost.indexList = indexList;
            tradingPost.tradeList = tradeList;
            this.tradingPosts.set(id, tradingPost);
        } else {
            // add new trading post
            let coord = typeof location === 'string' ? HexUtils.idToCoord(location) : location;
            let tradingPost = new TradingPost(coord, indexList, tradeList);
            this.tradingPosts.set(id, tradingPost);
        }
    }



    /* -------------------------------------------- Robber -------------------------------------------- */
    getRobberCoord() {
        return this.robberCoord;
    }

    updateRobberCoord(newCoord) {
        this.robberCoord = newCoord;
    }


    /* -------------------------------------------- Filtering and Searching -------------------------------------------- */

    /**
     * Generic query method for any map entity.
     * @param {string} type - 'tiles', 'roads', or 'settlements'
     * @param {Function} predicate - Function returning true/false
     * @returns {Array} Array of matching objects
     */
    filter(type, predicate) {
        // 1. Safety Check: Does this map exist?
        const targetMap = this[type];
        if (!targetMap || !(targetMap instanceof Map)) {
            throw new Error(`GameMap.filter: Invalid entity type '${type}'`);
        }

        // 2. Run the Filter
        const results = [];
        for (const item of targetMap.values()) {
            if (predicate(item)) {
                results.push(item);
            }
        }
        return results;
    }


}