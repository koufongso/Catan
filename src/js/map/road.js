import { HexEdge } from "../hex_grid_system.js/hex_edge.js";

export class Road {
    constructor(vertex1, vertex2, owner) {
        this.edge = new HexEdge(vertex1, vertex2);
        this.owner = owner;
    }

    hasOwner() {
        return this.owner !== null;
    }
}