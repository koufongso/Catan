import { Tile } from "./tile.js";
import { Road } from "./road.js";
import { Settlement } from "./settlement.js";
import { ResourceType } from "./resource_type.js";


export class GameMap {
    // a map has three elements: tiles, roads, settlements
    // we compute the connected components coordinates on run-time when needed
    // and query the interactable elements from these three maps
    constructor() {
        this.tiles = new Map(); // regiester all (interactable) tiles/hex, others will be conceptual "empty" tiles
        this.roads = new Map(); // register all (interacterable) roads/edges elements, others will be conceptual "empty" roads
        this.settlements = new Map(); // register all (interactable) settlements/vertices, others will be conceptual "empty" settlements
    }

    // load the map from json file to initializes the interactable elements
    async loadMapLayout(path) {
        // load the json file
        try {
            const response = await fetch(path); // Path to your file
            const data = await response.json();
            console.log(data);

            // parse tiles
            // first check if range is defined, and generate tiles with default
            if (data.tiles.range.q!==undefined && data.tiles.range.r!==undefined && data.tiles.range.s!==undefined) {
                let qRange = data.tiles.range.q;
                let rRange = data.tiles.range.r;
                let sRange = data.tiles.range.s;
                let default_resource = ResourceType.from(data.tiles.defaults.resource);
                let default_tokenNumber = data.tiles.defaults.tokenNumber;

                // check validity of default resource and tokenNumber
                if (typeof default_tokenNumber !== 'number') {
                    throw new Error(`Invalid default token number: ${default_tokenNumber}`);
                }
                
                for (let q = qRange[0]; q <= qRange[1]; q++) {
                    for (let r = rRange[0]; r <= rRange[1]; r++) {
                        for (let s = sRange[0]; s <= sRange[1]; s++) {
                            if (q + r + s === 0) { // valid hex coordinate
                                this.updateTileByCoord([q, r, s], default_resource, default_tokenNumber);
                            }
                        }
                    }
                }
            }

            // then override with specific tiles
            for (let tileData of data.tiles.overrides) {
                let coord = tileData.coord;
                let resource = ResourceType.from(tileData.resource);
                let tokenNumber = tileData.tokenNumber;
                this.updateTileByCoord(coord, resource, tokenNumber);
            }

            // debug print all tiles
            console.log("Loaded Tiles:");
            for (let [id, tile] of this.tiles) {
                console.log(`Tile ID: ${id}, Type: ${tile.resource}, Token Number: ${tile.tokenNumber}`);
            }
            

        } catch (error) {
            console.error('Error loading JSON:', error);
        }
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
                tile.tokenNumber = numberToken;
            }
            this.tiles.set(id, tile);
        }
        else {
            // add new tile
            let coords = id.split(",").map(Number);
            let tile = new Tile(coords[0], coords[1], coords[2], resource, numberToken);
            this.tiles.set(id, tile);
        }
    }

    removeTileByCoord(coord) {
        let id = `${coord[0]},${coord[1]},${coord[2]}`;
        this.tiles.delete(id);
    }

    // edit the road at 
    // coord: hex_edge [q,r,s]
    // owner: player id
    updateRoadByCoord(coord, owner) {
        let id = `${coord[0]},${coord[1]},${coord[2]}`;
        if (this.roads.has(id)) {
            // edit existing road
            let road = this.roads.get(id);
            road.owner = owner;
            this.roads.set(id, road);
        }
        else {
            // add new road
            let road = new Road(coord[0], coord[1], coord[2], owner);
            this.roads.set(id, road);
        }
    }

    removeRoadByCoord(coord) {
        let id = `${coord[0]},${coord[1]},${coord[2]}`;
        this.roads.delete(id);
    }

    // coord: hex_vertex [q,r,s]
    // owner: player id
    // level: 0 for empty, 1 for settlement, 2 for city
    updateSettlementByCoord(coord, owner = null, level = null) {
        let id = `${coord[0]},${coord[1]},${coord[2]}`;
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
            let settlement = new Settlement(coord[0], coord[1], coord[2], owner, level);
            this.settlements.set(id, settlement);
        }
    }

    removeSettlementByCoord(coord) {
        let id = `${coord[0]},${coord[1]},${coord[2]}`;
        this.settlements.delete(id);
    }



}

let map = new GameMap();
map.loadMapLayout('src/assets/map_layout/standard_map.json');