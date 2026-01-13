import { HexUtils } from "../../utils/hex-utils.js";

export class TradingPost{
    constructor(coord, indexList, tradeList = {}) {
        // check if coord is valid
        if (!HexUtils.isValidHex(coord)) {
            throw new Error("Invalid hex coordinate");
        }

        this.coord = coord;      
        this.id = HexUtils.coordToId(coord);   
        this.indexList = indexList; // list of verteics index that is connect to this trading post(0-5, counter-clockwise, staring at 60 deg position)
        this.tradeList = tradeList; // object of resource:ratio pairs, e.g., {brick:2, wood:3}
    }
}