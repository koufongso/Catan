import { Tile } from "./Tile.js";
import { Road } from "./buildings/Road.js";
import { Settlement } from "./buildings/Settlement.js";
import { TradingPost } from "./buildings/TradingPost.js";
import { HexUtils } from "../utils/hex-utils.js";
import { RNG } from "../utils/rng.js";


export class GameMap {
    // a map has three elements: tiles, roads, settlements
    // we compute the connected components coordinates on run-time when needed
    // and query the interactable elements from these three maps
    constructor(rng) {
        // check rng is an instance of RNG
        if (!(rng instanceof RNG)) {
            throw new Error("GameMap requires an instance of RNG");
        }
        this.rng = rng;                     // an instance of RNG

        // hex grid elements
        this.tiles = new Map();          // regiester all (interactable) tiles/hex, others will be conceptual "empty" tiles
        this.tradingPosts = new Map();      // register all trading posts on the map

        // vertex elements
        this.settlements = new Map();       // register all (interactable) settlements/vertices, others will be conceptual "empty" settlements

        // edge elements
        this.roads = new Map();             // register all (interacterable) roads/edges elements, others will be conceptual "empty" roads

        this.robberCoord = [0, 0, 0];       // the tile coord where the robber is currently located

        // map "boundary" info, save for quick access
        this.allVertexIdSet = null;     // a set of all vertex coordinates on the map
        this.allEdgeIdSet = null;       // a set of all edge coordinates on the map

        this.initialized = false;
    }

    // load the map from json file to initializes the interactable elements
    async loadMapFromJson(path) {
        // load the json file
        try {
            const response = await fetch(path); // Path to your file
            const data = await response.json();

            // parse tiles
            // first check if range is defined, and generate tiles with default
            if (data.tiles.range.q !== undefined && data.tiles.range.r !== undefined && data.tiles.range.s !== undefined) {
                let qRange = data.tiles.range.q;
                let rRange = data.tiles.range.r;
                let sRange = data.tiles.range.s;
                let default_terrain = data.tiles.defaults.terrainType;
                let default_numberToken = data.tiles.defaults.numberToken;

                // check validity of default resource and numberToken
                if (typeof default_numberToken !== 'number' && default_numberToken !== null) {
                    throw new Error(`Invalid default token number: ${default_numberToken}`);
                }

                for (let q = qRange[0]; q <= qRange[1]; q++) {
                    for (let r = rRange[0]; r <= rRange[1]; r++) {
                        for (let s = sRange[0]; s <= sRange[1]; s++) {
                            const hCoord = [q, r, s];
                            if (HexUtils.isValidHex(hCoord)) { // valid hex coordinate
                                this.updateTileByCoord(hCoord, default_terrain, default_numberToken);
                            }
                        }
                    }
                }
            }

            // then override with specific tiles
            for (let terrainData of data.tiles.overrides) {
                this.updateTileByCoord(terrainData.coord, terrainData.type, terrainData.numberToken);
            }

            // parse tradingposts
            for (let tpData of data.tradingposts.overrides) {
                this.updateTradingPostByCoord(tpData.coord, tpData.indexList, tpData.tradeList);
            }

            this.allVertexIdSet = this.getAllVertexIdSet();
            this.allEdgeIdSet = this.getAllEdgeIdSet();

            this.initialized = true;

        } catch (error) {
            console.error('Error loading JSON:', error);
        }
    }

    convertMapToJson() {
        // only need to save the overridden tiles, roads, and settlements
        let data = {
            tiles: {
                overrides: []
            },
            roads: {
                overrides: []
            },
            settlements: {
                overrides: []
            },
            tradingposts: {
                overrides: []
            }
        };

        // save tiles
        for (let [id, tile] of this.tiles) {
            data.tiles.overrides.push({ "coord": tile.coord, "type": tile.type, "numberToken": tile.numberToken });
        }
        // save roads
        for (let [id, road] of this.roads) {
            data.roads.overrides.push({ "coord": road.coord, "owner": road.owner });
        }
        // save settlements
        for (let [id, settlement] of this.settlements) {
            data.settlements.overrides.push({ "coord": settlement.vertex.coord, "owner": settlement.owner, "level": settlement.level });
        }
        // save trading posts
        for (let [id, tradingPost] of this.tradingPosts) {
            data.tradingposts.overrides.push({ "coord": tradingPost.coord, "indexList": tradingPost.indexList, "tradeList": tradingPost.tradeList });
        }

        let json_str = JSON.stringify(data, null, 2); // pretty print with 2 spaces indentation

        // download the json file
        return json_str;

    }

    // edit the tile at coord, if type or numberToken is null, keep the original value
    // coord: [q,r,s]
    // type: 
    updateTileByCoord(hCoord, terrainType = null, numberToken = null) {
        // convert coord to id
        let id = HexUtils.coordToId(hCoord);
        this.updateTileById(id, terrainType, numberToken);
    }

    updateTileById(id, terrainType = null, numberToken = null) {
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

    removeTerrainByCoord(coord) {
        let id = HexUtils.coordToId(coord);
        this.removeTerrainById(id);
    }

    removeTerrainById(id) {
        this.tiles.delete(id);
    }

    // edit the road at 
    // coord: hex_edge [q,r,s]
    // owner: player id
    updateRoadByCoord(coord, owner) {
        let id = HexUtils.coordToId(coord);
        this.updateRoadById(id, owner);
    }

    updateRoadById(id, owner) {
        if (this.roads.has(id)) {
            // edit existing road
            let road = this.roads.get(id);
            road.owner = owner;
            this.roads.set(id, road);
        }
        else {
            // add new road
            let coord = HexUtils.idToCoord(id);
            let road = new Road(coord, owner);
            this.roads.set(id, road);
        }
    }

    removeRoadByCoord(coord) {
        let id = HexUtils.coordToId(coord);
        this.removeRoadById(id);
    }

    removeRoadById(id) {
        this.roads.delete(id);
    }

    // coord: hex_vertex [q,r,s]
    // owner: player id
    // level: 0 for empty, 1 for settlement, 2 for city
    updateSettlementByCoord(coord, owner = null, level = null) {
        let id = HexUtils.coordToId(coord);
        this.updateSettlementById(id, owner, level);
    }

    updateSettlementById(id, owner = null, level = null) {
        if (this.settlements.has(id)) {
            // edit existing settlement
            let settlement = this.settlements.get(id);
            if (owner !== null) {
                settlement.owner = owner;
            }
            if (level !== null) {
                settlement.level = level;
            }
            this.settlements.set(id, settlement);
        } else {
            // add new settlement
            let coord = HexUtils.idToCoord(id);
            let settlement = new Settlement(coord, owner, level);
            this.settlements.set(id, settlement);
        }
    }

    removeSettlementByCoord(coord) {
        let id = HexUtils.coordToId(coord);
        this.removeSettlementById(id);
    }

    removeSettlementById(id) {
        this.settlements.delete(id);
    }

    updateTradingPostByCoord(coord, indexList, tradeList = {}) {
        let id = `${coord[0]},${coord[1]},${coord[2]}`;
        if (this.tradingPosts.has(id)) {
            // edit existing trading post
            let tradingPost = this.tradingPosts.get(id);
            tradingPost.indexList = indexList;
            tradingPost.tradeList = tradeList;
            this.tradingPosts.set(id, tradingPost);
        } else {
            // add new trading post
            let tradingPost = new TradingPost(coord, indexList, tradeList);
            this.tradingPosts.set(id, tradingPost);
        }
    }

    getTileById(id) {
        return this.tiles.get(id);
    }

    getTileByCoord(coord) {
        let id = HexUtils.coordToId(coord);
        return this.tiles.get(id);
    }

    /* -------------------------------------------- Service Functions-------------------------------------------- */

    /**
     * Shuffles a distribution and applies it to the map.
     * If a tile doesn't exist at the target coordinate, it can be created.
     * @param {Array} targetCoords - An array of hex coordinates where tiles should be assigned.
     * @param {Object} attributeDist - An object mapping tile attributes (terrainType, numberToken) to their counts.
     * @param {Object} attributeType - The type of attribute being assigned ('terrainType' or 'numberToken').
     */
    assignTerrainAttributeRandom(targetCoords, attributeDist, attributeType) {
        // Sanity check for attributeType
        if (attributeType !== 'terrainType' && attributeType !== 'numberToken') {
            throw new Error("attributeType must be either 'terrainType' or 'numberToken'");
        }

        // 1. Create the shuffled pool
        const attributePool = Object.entries(attributeDist).flatMap(([type, count]) =>
            Array(count).fill(type)
        );

        // check pool size matches
        if (attributePool.length !== targetCoords.length) {
            throw new Error(`Terrain ${attributeType} pool size (${attributePool.length}) does not match target coordinates size (${targetCoords.length}).`);
        }


        // shuffle the pool
        this.rng.shuffle(attributePool);
        const assignTerrain = attributeType === 'terrainType';
        // 2. Apply as overrides
        targetCoords.forEach((coord, i) => {
            const id = HexUtils.coordToId(coord); // Assuming you have a helper for [q,r,s] -> "q,r,s"
            const val = (assignTerrain ? attributePool[i] : Number(attributePool[i]));

            if (this.tiles.has(id)) {
                // Update existing
                const tile = this.tiles.get(id);
                if (assignTerrain) {
                    tile.updateTerrainType(val);
                } else {
                    // convert val to number
                    tile.updateNumberToken(val);
                }
            } else {
                // create new tile
                this.tiles.set(id, new Tile({
                    coord: coord,
                    terrainType: assignTerrain ? val : 'desert', // default to 'desert'
                    numberToken: !assignTerrain ? val : 0
                }));
            }
        });
    }

    assignTerrainTypesRandom(targetCoords, typeDist) {
        this.assignTerrainAttributeRandom(targetCoords, typeDist, 'terrainType');
    }

    assignNumberTokensRandom(targetCoords, numberTokenDist) {
        this.assignTerrainAttributeRandom(targetCoords, numberTokenDist, 'numberToken');
    }

    swapTerrainById(idA, idB, swapResources = true, swapTokens = true) {
        const tileA = this.tiles.get(idA);
        const tileB = this.tiles.get(idB);

        if (!tileA || !tileB) {
            console.warn(`Cannot swap: one or both tiles do not exist (${idA}, ${idB})`);
            return;
        }

        // Swap resources
        if (swapResources) {
            const tempResource = tileA.resource;
            tileA.resource = tileB.resource;
            tileB.resource = tempResource;
        }

        // Swap tokens (if you are using them)
        if (swapTokens) {
            const tempToken = tileA.numberToken;
            tileA.numberToken = tileB.numberToken;
            tileB.numberToken = tempToken;
        }
    }

    /**
     * Search for the tile id with the given resource type
     * @param {*} resourceType 
     * @returns an array of tile ids with the given resource type
     */
    searchTileIdsByResourceType(resourceType) {
        return this.searchTileIdsByFilter((tile) => tile.resource === resourceType);
    }

    /**
     * Search for the tile coordinates with the given resource type 
     * @param {*} resourceType 
     * @returns an array of tile coordinates with the given resource type
     */
    searchTileCoordsByResourceType(resourceType) {
        return this.searchTileCoordsByFilter((tile) => tile.resource === resourceType);
    }

    /**
     * Search for the tile id with the given terrain type 
     * @param {*} terrainType 
     * @returns an array of tile ids with the given terrain type
     */
    searchTileIdsByTerrainType(terrainType) {
        return this.searchTileIdsByFilter((tile) => tile.terrainType === terrainType);
    }

    /**
     * Search for the tile coordinates with the given terrain type 
     * @param {*} terrainType 
     * @returns an array of tile coordinates with the given terrain type
     */
    searchTileCoordsByTerrainType(terrainType) {
        return this.searchTileCoordsByFilter((tile) => tile.terrainType === terrainType);
    }


    /**
     * Search for the tile id with the given number token
     * @param {*} numberToken the number token to search for
     * @returns an array of tile ids with the given number token
     */
    searchTileIdsByNumberToken(numberToken) {
        return this.searchTileIdsByFilter((tile) => tile.numberToken === numberToken);
    }

    /**
     * Search for the tile coordinates with the given number token
     * @param {*} numberToken the number token to search for
     * @returns an array of tile coordinates with the given number token
     */
    searchTileCoordsByNumberToken(numberToken) {
        return this.searchTileCoordsByFilter((tile) => tile.numberToken === numberToken);
    }

    /**
     * Search for the tile id where the robber is not located
     * @returns an array of tile ids with the robber
     */
    searchTileIdsWithoutRobber() {
        return this.searchTileIdsByFilter((tile) => !HexUtils.areCoordsEqual(tile.coord, this.robberCoord));
    }

    /**
     * Search for the tile coordinates where the robber is not located
     * @returns an array of tile coordinates with the robber
     */
    searchTileCoordsWithoutRobber() {
        return this.searchTileCoordsByFilter((tile) => !HexUtils.areCoordsEqual(tile.coord, this.robberCoord));
    }

    /**
     * Generic tile search by filter function, returns coordinates
     * @param {*} filterFunc 
     * @returns an array of tile coordinates that match the filter function
     */
    searchTileCoordsByFilter(filterFunc) {
        let resultIds = this.searchTileIdsByFilter(filterFunc);
        // convert ids to coords
        let resultCoords = resultIds.map((id) => {
            return HexUtils.idToCoord(id);
        });
        return resultCoords;
    }

    /**
     * Generic tile search by filter function
     * @param {*} filterFunc 
     * @returns an array of tile ids that match the filter function
     */
    searchTileIdsByFilter(filterFunc) {
        let results = [];
        for (let [id, tile] of this.tiles) {
            if (filterFunc(tile)) {
                results.push(id);
            }
        }
        return results;
    }


    /**
     * Get all the vertex coordinates on the map (based on existing tiles)
     * Note: this should be static after map initialization
     * @returns {Set} - A set of vertex IDs
     */
    getAllVertexIdSet() {
        if (this.allVertexIdSet !== null) {
            return this.allVertexIdSet;
        }

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

    getAllSettlementIdSet() {
        let results = new Set();
        for (let [id, settlement] of this.settlements) {
            results.add(id);
        }
        return results;
    }

    getAllSettlementNeighborIdSet() {
        let results = new Set();
        for (let settlementId of this.getAllSettlementIdSet()) {
            let neighborSet = this.getSettlementNeighborIdSet(settlementId);
            for (let neighborId of neighborSet) {
                results.add(neighborId);
            }
        }
        return results;
    }


    /**
     * Get all the edge IDs on the map (based on existing tiles)
     * Note: this should be static after map initialization
     * @returns {Set} - A set of edge IDs
     */
    getAllEdgeIdSet() {
        if (this.allEdgeIdSet !== null) {
            return this.allEdgeIdSet;
        }

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


    getAllRoadIdSet() {
        let results = new Set();
        for (let [id, road] of this.roads) {
            results.add(id);
        }
        return results;
    }


    getVertexNeighborEdgeIdSet(vertexCoord) {
        return HexUtils.coordsArrayToIdSet(HexUtils.getAdjEdgesFromVertex(vertexCoord));
    }

    /**
     * Generic helper to get neighboring settlement ids within a certain distance
     * @param {*} vertexId 
     * @returns {Array} - An array of neighboring vertex IDs
     */
    getSettlementNeighborIdSet(vertexId) {
        let vertexCoord = HexUtils.idToCoord(vertexId);
        return HexUtils.coordsArrayToIdSet(HexUtils.getAdjVerticesFromVertex(vertexCoord));
    }

    getResourcesAdjacentToSettlement(vertexId) {
        let resources = [];
        // get the vertex object
        if (this.settlements.has(vertexId)) {
            let settlement = this.settlements.get(vertexId);
            let adjacentHexCoords = HexUtils.getAdjHexesFromVertex(settlement.coord); // get the three hexes that share this vertex
            // iterate through the hex coords and get their resources
            for (let hexCoord of adjacentHexCoords) {
                let hexId = HexUtils.coordToId(hexCoord);
                if (this.tiles.has(hexId)) {
                    let tile = this.tiles.get(hexId);
                    resources.push(tile.resource);
                }
            }
        }
        return resources;
    }



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

    getAllTileCoords() {
        let results = [];
        for (let [id, tile] of this.tiles) {
            results.push(tile.coord);
        }
        return results;
    }

    isRobableTile(tileId) {
        if (this.tiles.has(tileId)) {
            const tile = this.tiles.get(tileId);
            return !HexUtils.areCoordsEqual(tile.coord, this.robberCoord); // cannot rob the tile where the robber is located
        }
        return false; // tile does not exist
    }

    moveRobberToTile(tileCoord) {
        this.robberCoord = tileCoord;
    }


    /**
     * Generic settlement search by filter function
     * @param {*} filterFunc 
     * @returns 
     */
    searchSettlementsByFilter(filterFunc) {
        let results = [];
        for (let settlement of this.settlements.values()) {
            if (filterFunc(settlement)) {
                results.push(settlement);
            }
        }
        return results;
    }

    /**
     * Search for settlements adjacent to the given tile coordinate
     * @param {*} tileCoord 
     * @returns an array of settlements adjacent to the given tile coordinate
     */
    searchSettlementsByTileCoord(tileCoord) {
        const targetVertexCoords = HexUtils.getVerticesFromHex(tileCoord);
        return this.searchSettlementsByFilter((settlement) => {
            for (let vCoord of targetVertexCoords) {
                if (HexUtils.areCoordsEqual(vCoord, settlement.coord)) {
                    return true;
                }
            }
            return false;
        });
    }

    searchSettlementsByTileId(tileId) {
        const tileCoord = HexUtils.idToCoord(tileId);
        return this.searchSettlementsByTileCoord(tileCoord);
    }

    getRoads() {
        return Array.from(this.roads.values());
    }

    getRobberCoord() {
        return this.robberCoord;
    }

    getSettlements() {
        return Array.from(this.settlements.values());
    }



}