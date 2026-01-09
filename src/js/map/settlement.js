import { HexVertex } from "./hex_grid_system/hex_vetex.js";

export class Settlement {
    constructor(coord, owner = null, level = 0, tradeList = null) {
        this.vertex = new HexVertex(coord[0], coord[1], coord[2]);
        this.owner = owner;
        this.level = level; //0 for empty, 1 for settlement, 2 for city
        this.tradeList = tradeList; // null or resource type string
    }

    upgrade() {
        if (this.level < 2) {
            this.level += 1;
        } else {
            throw new Error("Settlement is already at maximum level");
        }
    }

    getScoreValue() {
        if (this.level === 1) {
            return 1; // settlement
        } else if (this.level === 2) {
            return 2; // city
        }
        return 0; // empty or invalid level
    }

    getAdjacentSettlementCoord() {
        return this.vertex.getAdjacentVertexCoord();
    }

    getAdjacentRoadCoord() {
        adjacdnt_vert = this.vertex.getAdjacentVertexCoord();
        let results = [];
        for (let vert_coord of adjacdnt_vert) {
            let edge_coord = [this.vertex.coord[0] + vert_coord[0],
            this.vertex.coord[1] + vert_coord[1],
            this.vertex.coord[2] + vert_coord[2]]
            results.push(edge_coord);
        }
        return results;
    }
}