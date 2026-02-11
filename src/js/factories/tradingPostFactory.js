import { HexUtils } from "../utils/HexUtils.js";

/**
 * Creates a TradingPost object.
 * @param {*} coord the edge coordinate (a triplet) [q, r, s]
 * @param {*} indexList the list of vertex indices that are connected to this trading post (0-5, counter-clockwise, starting at 60 deg position)
 * @param {*} tradeList the object of resource:ratio pairs, e.g., {brick:2, wood:3}
 * @returns {TradingPost}
 */
export const createTradingPost = (coord, indexList={}, tradeList={}) =>({
    coord,
    id: HexUtils.coordToId(coord),
    indexList,
    tradeList
})