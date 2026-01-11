import { Hex } from "./hex-grid-system/Hex.js";
import { ResourceType } from "./ResourceType.js";

export class Tile {
    constructor(coord, resource, numberToken) {
        // type check       
        if (!ResourceType.isValid(resource)) {
            throw new Error(`Invalid tile type: ${resource}`);
        }

        this.resource = resource; // e.g., "wood", "hill", etc.
        this.hex = new Hex(coord); // Hexagon instance representing the tile's position
        this.numberToken = numberToken; // Number token on the tile (if applicable)
    }
}