import { HexEdge } from "./hex_grid_system/hex_edge.js";

export class Road {
    constructor(coord, owner) {
        this.edge = new HexEdge(coord);
        this.owner = owner;
    }

    hasOwner() {
        return this.owner !== null;
    }
}