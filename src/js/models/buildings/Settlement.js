import { HexUtils } from "../../utils/hex-utils.js";

export class Settlement {
    constructor(coord, owner = null, level = 1) {
        // check if coord is valid
        if (!HexUtils.isValidVertex(coord)) {
            throw new Error("Invalid hex vertex coordinate");
        }
        this.coord = coord;
        this.id = HexUtils.coordToId(coord);
        this.owner = owner;
        this.level = level; //0 for empty (dummy), 1 for settlement, 2 for city
    }

    upgrade() {
        if (this.level < 2) {
            this.level += 1;
        } else {
            throw new Error("Settlement is already at maximum level");
        }
    }
}