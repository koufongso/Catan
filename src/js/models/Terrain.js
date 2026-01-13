import { HexUtils } from "../utils/hex-utils.js";
import { ResourceType } from "../constants/ResourceType.js";

export class Tile {
    constructor(coord, resource, numberToken) {
        // hex coordinate check
        if (!HexUtils.isValidHex(coord)) {
            throw new Error("Invalid hex coordinate");
        }
        // type check       
        if (!ResourceType.isValid(resource)) {
            throw new Error(`Invalid tile type: ${resource}`);
        }

        this.coord = coord; // Hexagon instance representing the tile's position
        this.id = HexUtils.coordToId(coord); // Unique ID based on coordinate
        this.resource = resource; // e.g., "wood", "hill", etc.
        this.numberToken = numberToken; // Number token on the tile (if applicable)
    }
}