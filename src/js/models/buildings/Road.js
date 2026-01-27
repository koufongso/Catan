import { HexUtils } from "../../utils/hex-utils.js";

export class Road {
    constructor(coord, ownerId) {
        this.coord = coord;
        this.id = HexUtils.coordToId(coord);
        this.ownerId = ownerId;
    }
}