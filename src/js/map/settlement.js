import { HexVertex } from "./hex_grid_system/hex_vetex.js";

export class Settlement {
    constructor(q, r, s, owner = null) {
        this.vertex = new HexVertex(q, r, s);
        this.owner = owner;
        this.level = 0; //0 for empty, 1 for settlement, 2 for city
    }

    upgrade() {
        if (this.level < 2) {
            this.level += 1;
        } else {
            throw new Error("Settlement is already at maximum level");
        }
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