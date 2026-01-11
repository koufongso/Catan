import { Hex } from "./hex-grid-system/Hex.js";

export class TradingPost{
    constructor(coord, indexList, tradeList = {}) {
        // a unique hex axial coordinates (q,r,s),
        // defined by its three adjacent (q,r,s) values
        this.coord = coord;         // [q,r,s] the hex coord where this trading post is located
        this.indexList = indexList; // list of verteics index that is connect to this trading post(0-5, counter-clockwise, staring at 60 deg position)
        this.tradeList = tradeList; // object of resource:ratio pairs, e.g., {brick:2, wood:3}
    }
}