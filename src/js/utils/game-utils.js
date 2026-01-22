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
     * - If a player is provided, the settlement must be connected to that player's existing roads.
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
    }
});