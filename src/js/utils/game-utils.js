/**
 * Utility functions for game-related operations.
 */
import { GameMap } from "../models/GameMap.js";
import { Player } from "../models/Player.js";
import { HexUtils } from "./hex-utils.js";
import { MapUtils } from "./map-utils.js";

export const GameUtils = Object.freeze({
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
                const settlementOwner = gameMap.getSettlementOwner(vId0);
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

                    if (!gameMap.hasEdge(edgeCoord)) continue; // skip if edge not in map (out of bounds)

                    // check the ownership of this road
                    const edgeOwner = gameMap.getRoadOwner(edgeCoord);
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
     * @returns 
     */
    getValidCityCoords(gameMap, playerId) {
        // valid city spots are simply existing settlements owned by the player
        return MapUtils.getPlayerSettlementVerticesIdSet(gameMap, playerId);
    }
});