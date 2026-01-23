/**
 * Utility functions for game-related operations.
 */
import { GameMap } from "../models/GameMap.js";
import { Player } from "../models/Player.js";
import { HexUtils } from "./hex-utils.js";

export const GameUtils = Object.freeze({
    /**
     * Get a valid coordinate for placing a settlement. Following rules must be observed:
     * - The coordinate must not be adjacent to any existing settlements.
     * - The coordinate must not be occupied by another settlement.
     * - If a player is provided, the settlement must be connected to that player's existing roads. (This is ignored during initial placement)
     * @param {GameMap} gameMap - The game map object containing current settlements and roads.
     * @param {Player} [player=null] - The player object for whom the settlement is being placed.
     * @returns {Array} - An array of valid coordinates for settlement placements
     */
    getValidSettlementCoords(gameMap, player = null) {
        const allVertexSet = gameMap.getAllVertexIdSet();
        const occupiedSet = gameMap.getAllSettlementIdSet();
        const adjacentToOccupiedSet = gameMap.getAllSettlementNeighborIdSet();

        // remove occupied vertices
        const nonOccupiedSet = allVertexSet.difference(occupiedSet);

        // remove vertices adjacent to existing settlements
        const validSet = nonOccupiedSet.difference(adjacentToOccupiedSet);

        if (player === null) {
            // No player specified, return any valid settlement spot
            return HexUtils.idSetToCoordsArray(validSet)
        }else{
            // Player specified, filter further based on connectivity to player's roads
            const playerRoadCoords = player.getRoadVerticesIdSet();
            const connectedValidSet = validSet.intersection(playerRoadCoords);
            return HexUtils.idSetToCoordsArray(connectedValidSet);
        }
    },

    /**
     * Get the valid road coordinates for placing a road from a vertex:
     *  - The road must start from the input vertex. This vertex must be connected to one of the player's existing roads or settlements
     *  - The road must not already be occupied.
     * @param {*} gameMap 
     * @param {*} vertexCoords 
     * @param {*} player 
     * @returns 
     */
    getValidRoadFromVertex(gameMap, vertexCoords, player) {
        const allEdgeSet = gameMap.getAllEdgeIdSet();
        const occupiedSet = gameMap.getAllRoadIdSet();

        // remove occupied edges from all edges
        const nonOccupiedSet = allEdgeSet.difference(occupiedSet);

        // get the edge coordinates that are adjacent to the vertex
        const adjacentEdgeIdSet = gameMap.getVertexNeighborEdgeIdSet(vertexCoords);

        // filter valid edges to only those adjacent to the input vertex
        const validAdjacentEdgeIdSet = nonOccupiedSet.intersection(adjacentEdgeIdSet);


        // further filter to only those connected to player's existing roads or settlements
        const validIdSet = new Set();
        const playerRoadVerticesSet = player.getRoadVerticesIdSet();
        const playerSettlementVerticesSet = player.getSettlementVerticesIdSet();

        // Find edges connected to player's roads or settlements
        for (let edgeId of validAdjacentEdgeIdSet) {
            const edgeVertices = HexUtils.getVerticesFromEdge(HexUtils.idToCoord(edgeId));
            const e0 = HexUtils.coordToId(edgeVertices[0]);
            const e1 = HexUtils.coordToId(edgeVertices[1]);
            if (playerRoadVerticesSet.has(e0) || playerRoadVerticesSet.has(e1) ||
                playerSettlementVerticesSet.has(e0) || playerSettlementVerticesSet.has(e1)) {
                validIdSet.add(edgeId);
            }
        }
        return HexUtils.idSetToCoordsArray(validIdSet);
    },

    getValidCityCoords(player) {
        // valid city spots are simply existing settlements owned by the player
        return player.getSettlements(1).map(settlement => settlement.coord);;
    }
});