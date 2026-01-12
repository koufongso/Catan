import { Tile } from "./Tile.js";
import { Road } from "./Road.js";
import { Settlement } from "./Settlement.js";
import { ResourceType } from "./ResourceType.js";
import { TradingPost } from "./TradingPost.js";
import { HexUtils } from "../utils/hex-utils.js";


export class GameMap {
    // a map has three elements: tiles, roads, settlements
    // we compute the connected components coordinates on run-time when needed
    // and query the interactable elements from these three maps
    constructor() {
        this.tiles = new Map(); // regiester all (interactable) tiles/hex, others will be conceptual "empty" tiles
        this.roads = new Map(); // register all (interacterable) roads/edges elements, others will be conceptual "empty" roads
        this.settlements = new Map(); // register all (interactable) settlements/vertices, others will be conceptual "empty" settlements
        this.tradingPosts = new Map(); // register all trading posts on the map
        this.robberTileCoord = [0,0,0]; // the tile coord where the robber is currently located
    }

    // load the map from json file to initializes the interactable elements
    async loadMapFromJson(path) {
        // load the json file
        try {
            const response = await fetch(path); // Path to your file
            const data = await response.json();
            //console.log(data);

            // parse tiles
            // first check if range is defined, and generate tiles with default
            if (data.tiles.range.q!==undefined && data.tiles.range.r!==undefined && data.tiles.range.s!==undefined) {
                let qRange = data.tiles.range.q;
                let rRange = data.tiles.range.r;
                let sRange = data.tiles.range.s;
                let default_resource = ResourceType.from(data.tiles.defaults.resource);
                let default_numberToken = data.tiles.defaults.numberToken;

                // check validity of default resource and numberToken
                if (typeof default_numberToken !== 'number') {
                    throw new Error(`Invalid default token number: ${default_numberToken}`);
                }
                
                for (let q = qRange[0]; q <= qRange[1]; q++) {
                    for (let r = rRange[0]; r <= rRange[1]; r++) {
                        for (let s = sRange[0]; s <= sRange[1]; s++) {
                            if (q + r + s === 0) { // valid hex coordinate
                                this.updateTileByCoord([q, r, s], default_resource, default_numberToken);
                            }
                        }
                    }
                }
            }

            // then override with specific tiles
            for (let tileData of data.tiles.overrides) {
                let coord = tileData.coord;
                let resource = ResourceType.from(tileData.resource);
                let numberToken = tileData.numberToken;
                this.updateTileByCoord(coord, resource, numberToken);
            }

            // parse tradingposts
            for (let tpData of data.tradingposts.overrides) {
                let coord = tpData.coord;
                let indexList = tpData.indexList;
                let tradeList = tpData.tradeList;
                this.updateTradingPostByCoord(coord, indexList, tradeList);
            }

            // debug print all tiles
            // console.log("Loaded Tiles:");
            // for (let [id, tile] of this.tiles) {
            //     console.log(`Tile ID: ${id}, Type: ${tile.resource}, Token Number: ${tile.numberToken}`);
            // }

            // for (let [id, settlement] of this.settlements) {
            //     console.log(`Settlement ID: ${id}, Owner: ${settlement.owner}, Level: ${settlement.level}, TradeList: ${JSON.stringify(settlement.tradeList)}`);
            // }
            // for (let [id, tradingPost] of this.tradingPosts) {
            //     console.log(`Trading Post ID: ${id}, IndexList: ${tradingPost.indexList}, TradeList: ${JSON.stringify(tradingPost.tradeList)}`);
            // }

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
            data.tiles.overrides.push({"coord": tile.hex.coord, "resource": tile.resource, "numberToken": tile.numberToken});
        }
        // save roads
        for (let [id, road] of this.roads) {
            data.roads.overrides.push({"coord": road.coord, "owner": road.owner});
        }
        // save settlements
        for (let [id, settlement] of this.settlements) {
            data.settlements.overrides.push({"coord": settlement.vertex.coord, "owner": settlement.owner, "level": settlement.level});
        }
        // save trading posts
        for (let [id, tradingPost] of this.tradingPosts) {
            data.tradingposts.overrides.push({"coord": tradingPost.coord, "indexList": tradingPost.indexList, "tradeList": tradingPost.tradeList});
        }

        let json_str =  JSON.stringify(data, null, 2); // pretty print with 2 spaces indentation
    
        // console.log("Map saved to JSON:");
        // console.log(json_str);

        // download the json file
        return json_str;
    
    }

    // edit the tile at coord, if type or numberToken is null, keep the original value
    // coord: [q,r,s]
    // type: 
    updateTileByCoord(coord, resource = null, numberToken = null) {
        // validate type
        if (resource !== null && !ResourceType.isValid(resource)) {
            throw new Error(`Invalid tile type: ${resource}`);
        }

        if (typeof numberToken !== 'number' && numberToken !== null) {
            throw new Error(`Invalid number token: ${numberToken}`);
        }

        // convert coord to id
        let id = `${coord[0]},${coord[1]},${coord[2]}`;

        if (this.tiles.has(id)) {
            // edit existing tile
            let tile = this.tiles.get(id);
            if (resource !== null) {
                tile.resource = resource;
            }
            if (numberToken !== null) {
                tile.numberToken = numberToken;
            }
            this.tiles.set(id, tile);
        }
        else {
            // add new tile
            let coords = id.split(",").map(Number);
            let tile = new Tile(coords, resource, numberToken);
            this.tiles.set(id, tile);
        }
    }

    removeTileByCoord(coord) {
        let id = HexUtils.coordToId(coord);
        this.removeTileById(id);
    }

    removeTileById(id) {
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
        }else{
            // add new trading post
            let tradingPost = new TradingPost(coord, indexList, tradeList);
            this.tradingPosts.set(id, tradingPost);
        }
    }

    // assign resources to tiles randomly to current tiles on the map
    // resourceDistribution: the number of each resource type to be assigned
    // e.g., { ResourceType.WOOD: 4, ResourceType.BRICK: 3, ResourceType.SHEEP: 4, ResourceType.WHEAT: 4, ResourceType.ORE: 3, ResourceType.DESERT: 1 }
    // we will randomly pick resource to each tile in order until all tiles are assigned.
    assignResourceRandom(seed, resourceDistribution) {
        // check if total number of resources match the number of tiles
        let totalResources = Object.values(resourceDistribution).reduce((a, b) => a + b, 0);
        if (totalResources !== this.tiles.size) {
            throw new Error(`Total number of resources (${totalResources}) does not match number of tiles (${this.tiles.size})`);
        }

        // create a list of resources based on the distribution
        let resources = [];
        for (let [resource, count] of Object.entries(resourceDistribution)) {
            for (let i = 0; i < count; i++) {
                resources.push(resource);
            }
        }

        // shuffle the resources list using Fisher-Yates algorithm with seed
        this._seededShuffle(resources, seed);

        // assign resources to tiles
        let index = 0;
        for (let [id, tile] of this.tiles) {
            tile.resource = resources[index];
            index++;
        }
    }

    assignNumberTokenRandom(seed, numberTokens) {
        // check if total number of token numbers match the number of tiles
        if (numberTokens.length !== this.tiles.size) {
            throw new Error(`Total number of token numbers (${numberTokens.length}) does not match number of tiles (${this.tiles.size})`);
        }
        this._seededShuffle(numberTokens, seed);
        // assign token numbers to tiles
        let index = 0;
        for (let [id, tile] of this.tiles) {
            tile.numberToken = numberTokens[index];
            index++;
        }
    }

    _seededShuffle(array, seed) {
        let rand = this._mulberry32(seed);
        let currentIndex = array.length, randomIndex;

        while (currentIndex != 0) {
            randomIndex = Math.floor(rand() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    _mulberry32(a) {
        return function() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }

    swapTile(idA, idB, swapResources = true, swapTokens = true) {
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

    // return a list of tile ids that have the given resource type
    searchTileByResource(resourceType) {
        let results = [];
        for (let [id, tile] of this.tiles) {
            if (tile.resource === resourceType) {
                results.push(id);
            }
        }
        return results;
    }

    // return a list of tile ids that have the given token number
    searchTileByNumberToken(numberToken) {
        let results = [];
        for (let [id, tile] of this.tiles) {
            if (tile.numberToken === numberToken) {
                results.push(id);
            }
        }
        return results;
    }

    // get all settlement spot defined by current tiles on the map
    getAllSettlementCoords() {
        let results = new Map();
        for (let [id, tile] of this.tiles) {
            let vCoordList = HexUtils.getVerticesFromHex(tile.coord);
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
                if (this.tiles.has(hexId)) {
                    let tile = this.tiles.get(hexId);
                    resources.push(tile.resource);
                }
            }
        }
        return resources;
    }

    getValidSettlementSpots(){
        let results = [];
        let allSettlementCoords = this.getAllSettlementCoords();
        for (let [key, vCoord] of allSettlementCoords) {
            if (this.isSettlementSpotValid(vCoord)) {
                results.push(vCoord);
            }
        }
        return results;
    }

    isSettlementSpotValid(vCoord) {
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
                return false;
            }
        }
        return true;
    }

    getValidRoadSpotsFromVertex(vCoord) {
        const vCoordList = HexUtils.getAdjVerticesFromVertex(vCoord);
        let results = [];
        for (let vCoord1 of vCoordList) {
            const eCoord = HexUtils.add(vCoord,vCoord1);
            if (this.isEdgeValid(eCoord)) {
                results.push(eCoord);
            }
        }
        return results;
    }

    isEdgeValid(eCoord) {
        let edgeId = HexUtils.coordToId(eCoord);
        // Check if the edge is already occupied
        if (this.roads.has(edgeId)) {
            return false;
        }
        return true;
    }
}