import { HexUtils } from "../utils/hex-utils.js";

export class Road {
    constructor(coord, owner) {
        // check if coord is valid
        if (!HexUtils.isValidEdge(coord)) {
            throw new Error("Invalid hex edge coordinate");
        }

        if (owner === undefined || owner === null) {
            throw new Error("Road must have an owner");
        }

        this.coord = coord;
        this.id = HexUtils.coordToId(coord);
        this.owner = owner;
    }
}