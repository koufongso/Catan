import { HexUtils } from "../../utils/hex-utils.js";

export class Settlement {
    constructor(coord, owner = null, level = 0) {
        // check if coord is valid
        if (!HexUtils.isValidVertex(coord)) {
            throw new Error("Invalid hex vertex coordinate");
        }
        this.coord = coord;
        this.id = HexUtils.coordToId(coord);
        this.owner = owner;
        this.level = level; //0 for empty, 1 for settlement, 2 for city
    }
}