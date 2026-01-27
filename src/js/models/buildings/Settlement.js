import { HexUtils } from "../../utils/hex-utils.js";

export class Settlement {
    constructor(coord, ownerId = null, level = 1) {
        this.coord = coord;
        this.id = HexUtils.coordToId(coord);
        this.ownerId = ownerId;
        this.level = level; //0 for empty (dummy), 1 for settlement, 2 for city
    }
}