// class to help predict and manage building placements
import { GameRules } from "../logic/GameRules.js";
import { HexUtils } from "./HexUtils.js";
import { MapUtils } from "../utils/MapUtils.js";
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
        this.validCitySpots = new Set(); // valid city coords for next selection

        this.initialized = false;
    }

    init(gameMap, playerId, mode) {
        this.gameMap = MapUtils.clone(gameMap); // construct a new instance from the deep copy data
        this.playerId = playerId;
        this.buildStack = []; // reset build stack
        this.validRoadSpots = new Set();
        this.validSettlementSpots = new Set();
        this.validCitySpots = new Set();
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
        this.validCitySpots = new Set();
        this.lastBuildType = null;
        this.lastBuildId = null;
        this.lastValidSpots = null;
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
                    this.validSettlementSpots = GameRules.getValidSettlementSpots(this.gameMap, null);
                    this.lastResult = {
                        status: StatusCodes.SUCCESS,
                        type: 'SETTLEMENT',
                        result: this.validSettlementSpots // return a clone to avoid mutation
                    }
                    return structuredClone(this.lastResult);
                }else if (this.lastBuildType === 'SETTLEMENT') {
                    // need to place road next
                    this.validRoadSpots = GameRules.getValidRoadFromSettlementIds(this.gameMap, this.playerId, new Set([this.lastBuildId]));
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
                    this.validRoadSpots = GameRules.getValidRoadFromSettlementIds(this.gameMap, this.playerId);
                    console.log(this.validRoadSpots);
                    this.lastResult = {
                        status: StatusCodes.SUCCESS,
                        type: 'ROAD',
                        result: this.validRoadSpots // return a clone to avoid mutation
                    };
                    return structuredClone(this.lastResult);
                }
            case "SETTLEMENT_ONLY":
                {
                    this.validSettlementSpots = GameRules.getValidSettlementSpots(this.gameMap, this.playerId);
                    this.lastResult = {
                        status: StatusCodes.SUCCESS,
                        type: 'SETTLEMENT',
                        result: this.validSettlementSpots // return a clone to avoid mutation
                    };
                    return structuredClone(this.lastResult);
                }
            case "CITY_ONLY":
                {
                    this.validCitySpots = GameRules.getValidCitySpots(this.gameMap, this.playerId);
                    this.lastResult = {
                        status: StatusCodes.SUCCESS,
                        type: 'CITY',
                        result: this.validCitySpots // return a clone to avoid mutation
                    };
                    return structuredClone(this.lastResult);
                }
            default:
                throw new Error(`Invalid mode for BuildingPredictor: ${this.mode}`);
        }  
    }

    /**
     * Build a building at the specified location, updating the game map and build stack
     * @param {String} type 'ROAD', 'SETTLEMENT', or 'CITY'
     * @param {Array|String} location coordinate or coordinate id
     * @returns 
     */
    build(type, location) {
        if (!this.initialized) {
            throw new Error("BuildingPredictor not initialized. Call init() before build().");
        }

        if (this.validRoadSpots.size === 0 && this.validSettlementSpots.size === 0 && this.validCitySpots.size === 0) {
            throw new Error("No valid spots computed. Call getNextValidSpots() before build().");
        }
        const coord = typeof location === 'string' ? HexUtils.idToCoord(location) : location;
        const coordId = HexUtils.coordToId(coord);

        // check if valid
        switch (type) {
            case 'SETTLEMENT':
                if (!this.validSettlementSpots.has(coordId)) {
                    return false
                }
                MapUtils.updateSettlement(this.gameMap, coord, this.playerId, 1);
                break;
            case 'ROAD':
                if (!this.validRoadSpots.has(coordId)) {
                    return false
                }
                MapUtils.updateRoad(this.gameMap, coord, this.playerId);
                break;
            case 'CITY':
                if (!this.validCitySpots.has(coordId)) {
                    return false
                }
                MapUtils.updateSettlement(this.gameMap, coord, this.playerId, 2);
                break;
            default:
                throw new Error(`Invalid building type for BuildingPredictor: ${type}, must be 'SETTLEMENT', 'ROAD', or 'CITY'`);
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
        switch (buildType) {
            case 'SETTLEMENT':
                MapUtils.removeSettlement(this.gameMap, buildId);
                break;
            case 'ROAD':
                MapUtils.removeRoad(this.gameMap, buildId);
                break;
            case 'CITY':
                MapUtils.updateSettlement(this.gameMap, buildId, this.playerId, 1); // downgrade city back to settlement
                break;
            default:
                throw new Error(`Invalid building type in BuildingPredictor rollback: ${buildType}, must be 'SETTLEMENT', 'ROAD', or 'CITY'`);
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

