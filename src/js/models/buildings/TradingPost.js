import { HexUtils } from "../../utils/hex-utils.js";

export class TradingPost{
    constructor(coord, indexList, tradeList = {}) {
        this.coord = coord;      
        this.id = HexUtils.coordToId(coord);   
        this.indexList = indexList; // list of verteics index that is connect to this trading post(0-5, counter-clockwise, staring at 60 deg position)
        this.tradeList = tradeList; // object of resource:ratio pairs, e.g., {brick:2, wood:3}
    }
}