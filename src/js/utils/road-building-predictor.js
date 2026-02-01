import { StatusCodes } from "../constants/StatusCodes.js";
import { GameUtils } from "./game-utils.js";
import { HexUtils } from "./hex-utils.js";

// utility class to predict valid road placements for N roads in order
// valid for one atomical action (regular road building or dev card road building)
// this keep track of the building order and can only rollback in order
export class RoadBuildingPredictor {
    constructor() {
        this.gameMap = null;
        this.selectedRoadStack = []; // list of selected road coordinates (must be in order for controller/server to verify)
        this.playerId = null;
    }

    init(gameMap) {
        this.gameMap = gameMap.clone(); // avoid mutating original map
        this.selectedRoadStack = [];
        this.playerId = null;
    }

    clear(){
        this.gameMap = null;
        this.selectedRoadStack = [];
        this.playerId = null;
    }

    peek() {
        if (this.selectedRoadStack.length === 0) {
            return null;
        }
        return this.selectedRoadStack[this.selectedRoadStack.length - 1];
    }

    getNextValidRoadSpots(playerId) {
        // rest all states
        this.playerId = playerId;
        // start with player's existing settlementss
        this.validRoadCoords = GameUtils.getValidRoadFromSettlementIds(this.gameMap, playerId);
        this.validRoadIds = HexUtils.coordsArrayToIdSet(this.validRoadCoords);
        return {
            status: StatusCodes.SUCCESS,
            result: this.validRoadCoords
        }
    }

    selectRoad(playerId, roadCoord) {
        // validate roadCoord
        const roadId = HexUtils.coordToId(roadCoord);
        console.log("Selecting road coord:", roadCoord, "for player:", playerId);
        console.log("Current valid road coords:", this.validRoadCoords);
        if (!this.validRoadIds.has(roadId)) {
            return {
                status: StatusCodes.INVALID_ROAD_COORD
            };
        }
        this.selectedRoadStack.push(roadCoord);
        this.gameMap.updateRoadById(roadId, playerId);
        return {
            status: StatusCodes.SUCCESS
        };
    }


    rollbackLastRoad(roadToRollback = null) {
        if (this.selectedRoadStack.length === 0) {
            return {
                status: StatusCodes.ERROR,
                error_message: "No road to rollback"
            }
        }

        const lastRoad = this.peek(); // this is coord
        const lastRoadId = HexUtils.coordToId(lastRoad);    
        // check if specific road to rollback
        if (roadToRollback !== null) {
            if (!HexUtils.areCoordsEqual(roadToRollback, lastRoad)) {
                return {
                    status: StatusCodes.ERROR,
                    error_message: "Road to rollback is not the last selected road"
                }
            }
        }

        // valid rollback, rollback last road
        this.selectedRoadStack.pop();
        this.gameMap.removeRoadById(lastRoadId);
        this.validRoadCoords = GameUtils.getValidRoadFromSettlementIds(this.gameMap, this.playerId); // recompute valid roads
        this.validRoadIds = HexUtils.coordsArrayToIdSet(this.validRoadCoords);
        return {
            status: StatusCodes.SUCCESS,
            result: this.validRoadCoords
        }
    }
}