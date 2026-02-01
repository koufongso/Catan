// class to help predict and manage building placements
import { GameUtils } from "./game-utils.js";
import { HexUtils } from "./hex-utils.js";
import { GameMap } from "../models/GameMap.js";
import { StatusCodes } from "../constants/StatusCodes.js";


export class BuildingPredictor {
    constructor() {
        this.gameMap = null;
        this.selectedSettlementStack = [];
        this.mode = null;  // three mode: "INITAL_PLACEMENT", "ROAD_ONLY", "SETTLEMENT_ONLY"
        this.buildStack = []; // (type, coord) pairs
        this.playerId = null; // only valid for one player at a time
        this.gameMap = null;

        // current valid spot caches for quick lookup
        // will be updated after each build
        // must be initialized in getNextValidSpots()
        this.validRoadSpots = new Set(); // list of valid road coordinates for next selection
        this.validSettlementSpots = new Set(); // valid settlement coords for initial placement

        this.initialized = false;
    }

    init(gameMap, playerId, mode) {
        this.gameMap = new GameMap(gameMap); // construct a new instance to avoid mutating original
        this.playerId = playerId;
        this.buildStack = []; // reset build stack
        this.validRoadSpots = new Set();
        this.validSettlementSpots = new Set();
        this.mode = mode;

        // save last build type and coord for tracking (useful for initial placement)
        this.lastBuildType = null;
        this.lastBuildId = null;
        this.counter = 0;
        this.lastValidSpots = null; // cache last valid spots returned (useful for rendering)

        this.initialized = true;
    }

    clear(){
        this.gameMap = null;
        this.selectedSettlementStack = [];
        this.mode = null;
        this.buildStack = [];
        this.playerId = null;
        this.validRoadSpots = new Set();
        this.validSettlementSpots = new Set();
        this.lastBuildType = null;
        this.lastBuildId = null;
        this.counter = 0;
        this.initialized = false;
    }

    /**
     * Compute the current valid spots for next building action
     * @returns 
     */
    getNextValidSpots() {
        if (!this.initialized) {
            throw new Error("BuildingPredictor not initialized. Call init() before getNextValidSpots().");
        }

        switch (this.mode) {
            case "INITIAL_PLACEMENT": // note: we enforce 2 roads and settlements
                // check which building to place next
                if (this.buildStack.length === 2) {
                    // all buildings placed
                    return {
                        status: StatusCodes.SUCCESS,
                        result: null
                    };                }

                if (this.lastBuildType === null || this.lastBuildType === 'ROAD') {
                    // need to place settlement next
                    this.validSettlementSpots = GameUtils.getValidSettlementSpots(this.gameMap, null);
                    this.lastResult = {
                        status: StatusCodes.SUCCESS,
                        type: 'SETTLEMENT',
                        result: this.validSettlementSpots // return a clone to avoid mutation
                    }
                    return structuredClone(this.lastResult);
                }else if (this.lastBuildType === 'SETTLEMENT') {
                    // need to place road next
                    this.validRoadSpots = GameUtils.getValidRoadFromSettlementIds(this.gameMap, this.playerId, new Set([this.lastBuildId]));
                    this.lastResult = {
                        status: StatusCodes.SUCCESS,
                        type: 'ROAD',
                        result: this.validRoadSpots // return a clone to avoid mutation
                    };
                    return structuredClone(this.lastResult);
                }else{
                    throw new Error(`Invalid lastBuildType in BuildingPredictor INITIAL_PLACEMENT mode: ${this.lastBuildType}`);
                }

            case "ROAD_ONLY":
                {
                    this.validRoadSpots = GameUtils.getValidRoadFromSettlementIds(this.gameMap, this.playerId);
                    this.lastResult = {
                        status: StatusCodes.SUCCESS,
                        type: 'ROAD',
                        result: this.validRoadSpots // return a clone to avoid mutation
                    };
                    return structuredClone(this.lastResult);
                }
            case "SETTLEMENT_ONLY":
                {
                    this.validSettlementSpots = GameUtils.getValidSettlementSpots(this.gameMap, this.playerId);
                    this.lastResult = {
                        status: StatusCodes.SUCCESS,
                        type: 'SETTLEMENT',
                        result: this.validSettlementSpots // return a clone to avoid mutation
                    };
                    return structuredClone(this.lastResult);
                }
            default:
                throw new Error(`Invalid mode for BuildingPredictor: ${this.mode}`);
        }  
    }

    /**
     * Build a building at the specified location, updating the game map and build stack
     * @param {String} type 'ROAD' or 'SETTLEMENT'
     * @param {Array|String} location coordinate or coordinate id
     * @returns 
     */
    build(type, location) {
        if (!this.initialized) {
            throw new Error("BuildingPredictor not initialized. Call init() before build().");
        }

        if (this.validRoadSpots.size === 0 && this.validSettlementSpots.size === 0) {
            throw new Error("No valid spots computed. Call getNextValidSpots() before build().");
        }
        const coord = typeof location === 'string' ? HexUtils.idToCoord(location) : location;
        const coordId = HexUtils.coordToId(coord);

        // check if valid
        if (type === 'SETTLEMENT') {
            if (!this.validSettlementSpots.has(coordId)) {
                return false
            }
        } else if (type === 'ROAD') {
            if (!this.validRoadSpots.has(coordId)) {
                return false
            }
        } else {
            throw new Error(`Invalid building type for BuildingPredictor: ${type}, must be 'SETTLEMENT' or 'ROAD'`);
        }


        // add building to game map
        if (type === 'SETTLEMENT') {
            this.gameMap.updateSettlement(coord, this.playerId, 1);
        } else if (type === 'ROAD') {
            this.gameMap.updateRoad(coord, this.playerId);
        } else {
            throw new Error(`Invalid building type for BuildingPredictor: ${type}, must be 'SETTLEMENT' or 'ROAD'`);
        }

        // add to stack
        this.buildStack.push({ type: type, coord: coord });
        this.lastBuildType = type;
        this.lastBuildId = coordId;
        return true;
    }

    peek() {
        if (!this.initialized) {
            throw new Error("BuildingPredictor not initialized. Call init() before peek().");
        }

        if (this.buildStack.length === 0) {
            return null;
        }
        return this.buildStack[this.buildStack.length - 1];
    }

    /**
     * Rollback the last building action (road or settlement) and update the game map accordingly
     * @return {void}
     */
    rollback() {
        if (!this.initialized) {
            throw new Error("BuildingPredictor not initialized. Call init() before rollback().");
        }

        if (this.buildStack.length === 0) {
            // nothing to rollback
            return false;
        }

        // get last build action
        const lastBuild = this.buildStack.pop();
        const buildType = lastBuild.type;
        const buildCoord = lastBuild.coord;
        const buildId = HexUtils.coordToId(buildCoord);

        // remove from game map
        if (buildType === 'SETTLEMENT') {
            this.gameMap.removeSettlement(buildId);
        } else if (buildType === 'ROAD') {
            this.gameMap.removeRoad(buildId);
        }

        // update last build type/id
        if (this.buildStack.length === 0) {
            this.lastBuildType = null;
            this.lastBuildId = null;
        } else {
            const newLastBuild = this.peek();
            this.lastBuildType = newLastBuild.type;
            this.lastBuildId = HexUtils.coordToId(newLastBuild.coord);
        }

        return true;
    }



}

