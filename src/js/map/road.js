import { HexEdge } from "./hex-grid-system/HexEdge.js";

export class Road {
    constructor(coord, owner) {
        this.edge = new HexEdge(coord);
        this.owner = owner;
    }

    hasOwner() {
        return this.owner !== null;
    }
}