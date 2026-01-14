import { Terrain } from "./Terrain.js";
import { Road } from "./buildings/Road.js";
import { Settlement } from "./buildings/Settlement.js";
import { TradingPost } from "./buildings/TradingPost.js";
import { HexUtils } from "../utils/hex-utils.js";
import { RNG } from "../utils/rng.js";


export class GameMap {
    // a map has three elements: terrains, roads, settlements
    // we compute the connected components coordinates on run-time when needed
    // and query the interactable elements from these three maps
    constructor(rng) {
        // check rng is an instance of RNG
        if (!(rng instanceof RNG)) {
            throw new Error("GameMap requires an instance of RNG");
        }
        this.rng = rng;                     // an instance of RNG

        // hex grid elements
        this.terrains = new Map();          // regiester all (interactable) terrains/hex, others will be conceptual "empty" terrains
        this.tradingPosts = new Map();      // register all trading posts on the map

        // vertex elements
        this.settlements = new Map();       // register all (interactable) settlements/vertices, others will be conceptual "empty" settlements

        // edge elements
        this.roads = new Map();             // register all (interacterable) roads/edges elements, others will be conceptual "empty" roads

        this.robberCoord = [0, 0, 0];       // the terrain coord where the robber is currently located
    }

    // load the map from json file to initializes the interactable elements
    async loadMapFromJson(path) {
        // load the json file
        try {
            const response = await fetch(path); // Path to your file
            const data = await response.json();
            //console.log(data);

            // parse terrains
            // first check if range is defined, and generate terrains with default
            if (data.terrains.range.q !== undefined && data.terrains.range.r !== undefined && data.terrains.range.s !== undefined) {
                let qRange = data.terrains.range.q;
                let rRange = data.terrains.range.r;
                let sRange = data.terrains.range.s;
                let default_terrain = data.terrains.defaults.type;
                let default_numberToken = data.terrains.defaults.numberToken;

                // check validity of default resource and numberToken
                if (typeof default_numberToken !== 'number' && default_numberToken !== null) {
                    throw new Error(`Invalid default token number: ${default_numberToken}`);
                }

                for (let q = qRange[0]; q <= qRange[1]; q++) {
                    for (let r = rRange[0]; r <= rRange[1]; r++) {
                        for (let s = sRange[0]; s <= sRange[1]; s++) {
                            const hCoord = [q, r, s];
                            if (HexUtils.isValidHex(hCoord)) { // valid hex coordinate
                                this.updateTerrainByCoord(hCoord, default_terrain, default_numberToken);
                            }
                        }
                    }
                }
            }

            // then override with specific terrains
            for (let terrainData of data.terrains.overrides) {
                this.updateTerrainByCoord(terrainData.coord, terrainData.type, terrainData.numberToken);
            }

            // parse tradingposts
            for (let tpData of data.tradingposts.overrides) {
                this.updateTradingPostByCoord(tpData.coord, tpData.indexList, tpData.tradeList);
            }


        } catch (error) {
            console.error('Error loading JSON:', error);
        }
    }

    convertMapToJson() {
        // only need to save the overridden terrains, roads, and settlements
        let data = {
            terrains: {
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

        // save terrains
        for (let [id, terrain] of this.terrains) {
            data.terrains.overrides.push({ "coord": terrain.coord, "type": terrain.type, "numberToken": terrain.numberToken });
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

        // console.log("Map saved to JSON:");
        // console.log(json_str);

        // download the json file
        return json_str;

    }

    // edit the terrain at coord, if type or numberToken is null, keep the original value
    // coord: [q,r,s]
    // type: 
    updateTerrainByCoord(hCoord, type = null, numberToken = null) {
        // convert coord to id
        let id = HexUtils.coordToId(hCoord);
        this.updateTerrainById(id, type, numberToken);
    }

    updateTerrainById(id, type = null, numberToken = null) {
        if (this.terrains.has(id)) {
            // edit existing terrain
            let terrain = this.terrains.get(id);
            if (type !== null) {
                terrain.updateType(type);
            }
            if (numberToken !== null) {
                terrain.updateNumberToken(numberToken);
            }
            this.terrains.set(id, terrain);
        }
        else {
            // add new terrain
            let coords = HexUtils.idToCoord(id);
            let terrain = new Terrain(coords, type, numberToken);
            this.terrains.set(id, terrain);
        }
    }

    removeTerrainByCoord(coord) {
        let id = HexUtils.coordToId(coord);
        this.removeTerrainById(id);
    }

    removeTerrainById(id) {
        this.terrains.delete(id);
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

    /* -------------------------------------------- Service Functions-------------------------------------------- */

    /**
     * Shuffles a distribution and applies it to the map.
     * If a terrain doesn't exist at the target coordinate, it can be created.
     * @param {Array} targetCoords - An array of hex coordinates where terrains should be assigned.
     * @param {Object} attributeDist - An object mapping terrain attributes (type, numberToken) to their counts.
     * @param {Object} attributeType - The type of attribute being assigned ('type' or 'numberToken').
     */
    assignTerrainAttributeRandom(targetCoords, attributeDist, attributeType) {
        // Sanity check for attributeType
        if (attributeType !== 'type' && attributeType !== 'numberToken') {
            throw new Error("attributeType must be either 'type' or 'numberToken'");
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

        // 2. Apply as overrides
        targetCoords.forEach((coord, i) => {
            const id = HexUtils.coordToId(coord); // Assuming you have a helper for [q,r,s] -> "q,r,s"
            const val = (attributeType === 'type' ? attributePool[i] : Number(attributePool[i]));

            if (this.terrains.has(id)) {
                // Update existing
                const terrain = this.terrains.get(id);
                if (attributeType === 'type') {
                    terrain.updateType(val);
                } else {
                    // convert val to number
                    terrain.updateNumberToken(val);
                }
            } else {
                // create new terrain
                this.terrains.set(id, new Terrain({
                    coord: coord,
                    type: attributeType === 'type' ? val : 'desert', // default to 'desert'
                    numberToken: attributeType === 'numberToken' ? val : 0
                }));
            }
        });
    }

    assignTerrainTypesRandom(targetCoords, typeDist) {
        this.assignTerrainAttributeRandom(targetCoords, typeDist, 'type');
    }

    assignTerrainNumberTokensRandom(targetCoords, numberTokenDist) {
        this.assignTerrainAttributeRandom(targetCoords, numberTokenDist, 'numberToken');
    }

    swapTerrainById(idA, idB, swapResources = true, swapTokens = true) {
        const tileA = this.terrains.get(idA);
        const tileB = this.terrains.get(idB);

        if (!tileA || !tileB) {
            console.warn(`Cannot swap: one or both terrains do not exist (${idA}, ${idB})`);
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

    // return a list of terrain ids that have the given resource type
    searchTerrainIdByType(type) {
        let results = [];
        for (let [id, terrain] of this.terrains) {
            if (terrain.type === type) {
                results.push(id);
            }
        }
        return results;
    }

    // return a list of terrain ids that have the given token number
    searchTerrainIdByNumberToken(numberToken) {
        let results = [];
        for (let [id, terrain] of this.terrains) {
            if (terrain.numberToken === numberToken) {
                results.push(id);
            }
        }
        return results;
    }

    // get all settlement spot defined by current terrains on the map
    getAllSettlementCoords() {
        let results = new Map();
        for (let [id, terrain] of this.terrains) {
            let vCoordList = HexUtils.getVerticesFromHex(terrain.coord);
            for (let vCoord of vCoordList) {
                results.set(HexUtils.coordToId(vCoord), vCoord);
            }
        }
        return results;
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
                if (this.terrains.has(hexId)) {
                    let terrain = this.terrains.get(hexId);
                    resources.push(terrain.resource);
                }
            }
        }
        return resources;
    }

    /**
     * Get a list of unoccupied settlement spots (vertex coordinates) on the map, if owner is given, only return spots connected to owner's road
     * @param {*} owner 
     * @returns 
     */
    getValidSettlementSpots(owner = null) {
        let results = [];
        let allSettlementCoords = this.getAllSettlementCoords();
        for (let [key, vCoord] of allSettlementCoords) {
            if (this.isSettlementSpotValid(vCoord, owner)) {
                results.push(vCoord);
            }
        }
        return results;
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
     * Return a list of unoccupied road spots (edge coordinates), if owner is specified, only return roads that are connected to owner's settlement or road
     * @param {Array} vCoord 
     * @returns {Array} list of edge coordinates
     */
    getValidRoadSpotsFromVertex(vCoord, owner = null) {
        const vCoordList = HexUtils.getAdjVerticesFromVertex(vCoord);
        let results = [];
        for (let vCoord1 of vCoordList) {
            const eCoord = HexUtils.add(vCoord, vCoord1);
            if (this.isRoadSpotValid(eCoord, owner)) {
                results.push(eCoord);
            }
        }
        return results;
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

    getAllTerrainCoords() {
        let results = [];
        for (let [id, terrain] of this.terrains) {
            results.push(terrain.coord);
        }
        return results;
    }
}