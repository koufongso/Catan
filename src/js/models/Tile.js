import { HexUtils } from "../utils/hex-utils.js";

export class Tile {
    constructor(coord, terrainType, numberToken) {
        this.coord = coord;                     //  hex coordinate
        this.id = HexUtils.coordToId(coord);    // Unique ID based on coordinate
        this.terrainType = terrainType;                // e.g., "forest", "hill", etc.
        this.numberToken = numberToken;         // Number token on the terrain (if applicable)
    }
}