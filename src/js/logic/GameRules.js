/**
 * Utility functions for game-related operations.
 */
import { HexUtils } from "../utils/HexUtils.js";
import { MapUtils } from "../utils/MapUtils.js";
import { COSTS } from "../constants/GameRuleConstants.js";
import { PRODUCTION_TABLE } from "../constants/GameRuleConstants.js";
import { YEAR_OF_PLENTY_CONFIG } from "../constants/GameRuleConstants.js";

import { BuildingPredictor } from "../utils/BuildingPredictor.js";


export const GameRules = Object.freeze({
    /**
     * Get a valid coordinate for placing a settlement. Following rules must be observed:
     * - The coordinate must not be adjacent to any existing settlements.
     * - The coordinate must not be occupied by another settlement.
     * - If a player is provided, the settlement must be connected to that player's existing roads. (This is ignored during initial placement)
     * @param {GameMap} gameMap - The game map object containing current settlements and roads.
     * @param {numbers} [playerId] - The player id for whom the settlement is being placed.
     * @returns {Set} - A set of valid id for settlement placements
     */
    getValidSettlementSpots(gameMap, playerId = null) {
        const allVertexSet = MapUtils.getAllVertexIdSet(gameMap);
        const occupiedSet = MapUtils.getAllSettlementIdSet(gameMap);
        const adjacentToOccupiedSet = MapUtils.getAllSettlementNeighborIdSet(gameMap);

        // remove occupied vertices
        const nonOccupiedSet = allVertexSet.difference(occupiedSet);

        // remove vertices adjacent to existing settlements
        const validSet = nonOccupiedSet.difference(adjacentToOccupiedSet);

        if (playerId === null) {
            // No player specified, return any valid settlement spot
            return validSet;
        } else {
            // Player specified, filter further based on connectivity to player's roads
            const playerRoadCoords = MapUtils.getPlayerRoadVerticesIdSet(gameMap, playerId);
            const connectedValidSet = validSet.intersection(playerRoadCoords);
            return connectedValidSet
        }
    },

    /**
     * Get the valid road coordinates for placing a road from a vertex:
     *  - The road must start from the input vertex. This vertex must be connected to one of the player's existing roads or settlements
     *  - The road must not already be occupied.
     * @param {GameMap} gameMap 
     * @param {number} playerId 
     * @param {Set} playerSettlementIdSet (optional), usefull for initial placement (road must connect to settlement just placed)
     * if not provided, will compute all from all settlements owned by the player
     * @returns {Set} a set of valid road coordinates
     */
    getValidRoadFromSettlementIds(gameMap, playerId, playerSettlementIdSet = null) {
        // first get all settlments
        if (playerSettlementIdSet === null) {
            playerSettlementIdSet = MapUtils.getPlayerSettlementVerticesIdSet(gameMap, playerId);
        }
        console.log("Player settlement ids for road building:", playerSettlementIdSet);
        const visitedVertexIds = new Set();
        const validRoadIds = new Set();

        for (let settlementId of playerSettlementIdSet) {
            // skip settlement if already visited to avoid redundant BFS
            if (visitedVertexIds.has(settlementId)) continue;
            // BFS from this settlement
            const vertexQueue = [settlementId];
            visitedVertexIds.add(settlementId);
            while (vertexQueue.length > 0) {
                const vId0 = vertexQueue.shift();
                const vCoord0 = HexUtils.idToCoord(vId0);

                // check if this vertex is blocked by another player's settlement
                const settlementOwner = MapUtils.getSettlementOwner(gameMap, vId0);
                if (settlementOwner !== null && settlementOwner !== playerId) {
                    // blocked by another player's settlement, cannot extend roads from here
                    continue;
                }

                // get neighbor vertex (roads) from this vertex
                const neighborVertices = HexUtils.getAdjVerticesFromVertex(vCoord0);
                // check each neighbor vertex
                for (let vCoord1 of neighborVertices) {
                    const edgeCoord = HexUtils.getEdgeFromVertices(vCoord0, vCoord1);
                    const vId1 = HexUtils.coordToId(vCoord1);

                    if (!MapUtils.hasEdge(gameMap, edgeCoord)) continue; // skip if edge not in map (out of bounds)

                    // check the ownership of this road
                    const edgeOwner = MapUtils.getRoadOwner(gameMap, edgeCoord);
                    console.log(`Checking edge ${HexUtils.coordToId(edgeCoord)} between ${vId0} and ${vId1}, owned by ${edgeOwner}`);
                    if (edgeOwner === null) {
                        // unoccupied road, valid placement, stop BFS in this direction
                        validRoadIds.add(HexUtils.coordToId(edgeCoord));
                    } else if (edgeOwner === playerId) {
                        // road owned by player, can continue BFS
                        if (!visitedVertexIds.has(vId1)) {
                            // not visited yet, add to queue
                            visitedVertexIds.add(vId1);
                            vertexQueue.push(vId1);
                        }
                    } // else: road occupied by another player or vertex blocked by settlement, stop BFS in this direction
                }
            }
        }

        return validRoadIds;
    },

    /**
     * Get valid city coordinates for a player. Valid city spots are simply existing settlements owned by the player.
     * @param {*} gameMap 
     * @param {*} playerId 
     * @returns {Set} a set of valid vertex id for placing a city
     */
    getValidCitySpots(gameMap, playerId) {
        const citySpots = MapUtils.filter(gameMap, 'settlements', (settlement) => (settlement.ownerId === playerId && settlement.level === 1));
        return new Set(citySpots.map(settlement => settlement.id));
    },



    /* -----------------------------------------------------Discard Helpers----------------------------------------------------- */

    isDiscardValid(playerResource, discardResources) {
        console.log("Validating discard:", playerResource, discardResources);
        // check if player has enough resources to discard
        for (let [type, amount] of Object.entries(discardResources)) {
            const playerAmount = playerResource[type] || 0;
            if (amount > playerAmount) {
                console.error(`Player does not have enough ${type} to discard. Has: ${playerAmount}, Trying to discard: ${amount}`);
                return false; // trying to discard more than owned
            }
        }

        // check total discard amount
        const totalOwned = Object.values(playerResource).reduce((a, b) => a + b, 0);
        const totalToDiscard = Object.values(discardResources).reduce((a, b) => a + b, 0);
        if (totalToDiscard > Math.floor(totalOwned / 2)) {
            console.error(`Player does not have enough resources to discard. Has: ${totalOwned}, Trying to discard: ${totalToDiscard}`);
            return false; // trying to discard more than half of owned resources
        }

        return true;
    },

    /**
     * Get a list of players who need to discard and the amount they need to discard
     * @param {*} gameContext 
     * @returns 
     */
    getDiscardInfo(gameContext) {
        const playersNeedToDiscard = [];
        for (let player of gameContext.players) {
            const totalResources = Object.values(player.resources).reduce((a, b) => a + b, 0);
            if (totalResources > 7) {
                playersNeedToDiscard.push({
                    playerId: player.id,
                    numberToDiscard: Math.floor(totalResources / 2)
                });
            }
        }
        return playersNeedToDiscard;
    },

    getRobbableTiles(gameMap) {
        return MapUtils.filter(gameMap, 'tiles', (tile) => !HexUtils.areCoordsEqual(tile.coord, gameMap.robberCoord));
    },

    /**
     * Get the settlement that can be robbed on a tile. Following rules must be observed:
     * - The settlement must be adjacent to the tile where the robber is moved to.
     * - The settlement must not be owned by the player moving the robber.
     * @param {*} playerId - the player id of the player moving the robber
     * @param {*} tileLocation - the location where the robber is moved to
     * @param {*} gameMap 
     */
    getRobbableSettlementIds(playerId, tileLocation, gameMap) {
        // convert tile location to tile id
        const tileId = typeof tileLocation === 'string' ? tileLocation : HexUtils.coordToId(tileLocation);
        const tileCoord = HexUtils.idToCoord(tileId);

        // get adjacent vertices to this tile
        const adjacentVertexIds = HexUtils.getVerticesFromHex(tileCoord).map(vCoord => HexUtils.coordToId(vCoord));

        // filter for settlements owned by other players
        const robbableSettlementIds = adjacentVertexIds.filter(vId => {
            const settlementOwner = MapUtils.getSettlementOwner(gameMap, vId);
            return settlementOwner !== null && settlementOwner !== playerId;
        });

        return robbableSettlementIds;
    },



    /* -----------------------------------------------------Cost of Building ----------------------------------------------------- */
    // note: all cost are positive numbers

    getRoadCost() {
        return COSTS.road;
    },

    getSettlementCost() {
        return COSTS.settlement;
    },

    getCityCost() {
        return COSTS.city;
    },

    getDevCardCost() {
        return COSTS.devCard;
    },


    /*------------------------------------------------------Tile Production Helpers-----------------------------------------------------*/
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
    isProductiveTile(tile, gameMap = null) {
        const resource = this.getTileProduction(tile, gameMap, true);
        return resource !== null && tile.numberToken !== null;
    },


    /* ----------------------------------------------------- Player VP Helpers ----------------------------------------------------- */

    /**
     * Get IDs as an array (useful for iteration)
     */
    getSettlementIds: (player) => Object.keys(player.settlements),
    getRoadIds: (player) => Object.keys(player.roads),
    getCityIds: (player) => Object.keys(player.cities),

    getVictoryPoints: (player) => {
        let vp = 0;
        // Count keys
        vp += Object.keys(player.settlements).length;
        vp += Object.keys(player.cities).length * 2;
        vp += player.devCards.filter(card => card.type === 'VICTORY_POINT').length;

        if (player.achievements.hasLongestRoad) vp += 2;
        if (player.achievements.hasLargestArmy) vp += 2;
        vp += player.achievements.cheatVP;

        return vp;
    },

    /* ----------------------------------------------------- Dev Card Effects ----------------------------------------------------- */

    getYearOfPlentyConfig() {
        // for year of plenty, player can select any 2 resources, so return all resource types with quantity of 2
        return YEAR_OF_PLENTY_CONFIG;
    },

    /**
     * Check if the selected resources for Year of Plenty are valid
     * @param {Object} selectedResources - an array of selected resource types (e.g., ['BRICK', 'WHEAT'])
     * @returns {boolean} - True if the selection is valid, false otherwise.
     */
    isValidYOPSelection(selectedResources) {
        const yopConfig = this.getYearOfPlentyConfig();
        const validResourceTypes = Object.keys(yopConfig.RESOURCE_OPTIONS);
        const maxSelectable = yopConfig.NUMER_OF_RESOURCES_TO_SELECT;
        // check if selected resources are valid

        let resourceCount = 0;
        for (let [resource, count] of Object.entries(selectedResources)) {
            if (!validResourceTypes.includes(resource)) {
                console.error(`Invalid resource type selected for Year of Plenty: ${resource}. Valid options are: ${validResourceTypes.join(', ')}`);
                return false;
            }
            resourceCount += count;
        }

        if (resourceCount !== maxSelectable) {
            console.error(`Invalid number of resources selected for Year of Plenty. Expected: ${maxSelectable}, Got: ${resourceCount}`);
            return false;
        }
        return true;
    },

    /**
     * Verify if the build stack for building is valid. Rules to follow:
     * @param {*} gameMap 
     * @param {*} playerId 
     * @param {*} buildStack 
     * @param {*} mode 'INITIAL_PLACEMENT', 'ROAD_ONLY', 'SETTLEMENT_ONLY', 'CITY_ONLY'
     */
    isValidBuild(gameMap, playerId, buildStack, mode) {
        console.log(`Checking build stack validity for player ${playerId} with BuildingPredictor in mode ${mode}...`);
        const buildingPredictor = new BuildingPredictor();
        buildingPredictor.init(gameMap, playerId, mode);
        buildingPredictor.getNextValidSpots(); // prepare valid spots for the player
        buildStack.forEach((building) => {
            console.log(`Verifying building: ${building.type} at ${building.coord}`);
            if (!buildingPredictor.build(building.type, building.coord)) {
                return false;
            }
        });
        return true;
    }






});