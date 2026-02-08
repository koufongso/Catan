import { HexUtils } from "./hex-utils.js";

export const MapUtils = Object.freeze({
    getPlayerSettlementVerticesIdSet(gameMap, playerId) {
        const settlementIds = new Set();
        for (const settlement of Object.values(gameMap.settlements)) {
            if (settlement.ownerId === playerId) {
                settlementIds.add(HexUtils.coordToId(settlement.coord));
            }
        }
        return settlementIds;
    },

    getAllVertexIdSet(gameMap) {
        if (gameMap.allVertexIdSet !== null) {
            // result cached, return it
            return gameMap.allVertexIdSet;
        }

        // compute the set, this should only be done once unless the map changes
        let results = new Set();
        for (let [tileId, tile] of Object.entries(gameMap.tiles)) {
            let vCoordList = HexUtils.getVerticesFromHex(tile.coord);
            for (let vCoord of vCoordList) {
                results.add(HexUtils.coordToId(vCoord));
            }
        }
        gameMap.allVertexIdSet = results;
        return results;
    },

    getAllSettlementIdSet(gameMap) {
        const settlementIds = new Set();
        for (const id of Object.keys(gameMap.settlements)) {
            settlementIds.add(id);
        }
        return settlementIds;
    },

    getAllSettlementNeighborIdSet(gameMap) {
        const neighborIds = new Set();
        for (const settlement of Object.values(gameMap.settlements)) {
            const vCoord = settlement.coord;
            const neighborCoords = HexUtils.getAdjVerticesFromVertex(vCoord);
            for (const neighborCoord of neighborCoords) {
                neighborIds.add(HexUtils.coordToId(neighborCoord));
            }
        }
        return neighborIds;
    },

    getPlayerRoadVerticesIdSet(gameMap, playerId) {
        const roadVertexIds = new Set();
        for (const road of Object.values(gameMap.roads)) {
            if (road.ownerId === playerId) {
                const vCoord1 = road.edge.vertex1.coord;
                const vCoord2 = road.edge.vertex2.coord;
                roadVertexIds.add(HexUtils.coordToId(vCoord1));
                roadVertexIds.add(HexUtils.coordToId(vCoord2));
            }
        }
        return roadVertexIds;
    }



});