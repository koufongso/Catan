import { HexUtils } from "../utils/hex-utils.js";

export class Tile {
    constructor(data) {
        this.coord = data.coord;                     //  hex coordinate
        this.id = HexUtils.coordToId(data.coord);    // Unique ID based on coordinate
        this.terrainType = data.terrainType;                // e.g., "forest", "hill", etc.
        this.numberToken = data.numberToken;         // Number token on the terrain (if applicable)
    }

    updateTerrainType(terrainType) {
        this.terrainType = terrainType;
    }

    updateNumberToken(numberToken) {
        this.numberToken = numberToken;
    }
}