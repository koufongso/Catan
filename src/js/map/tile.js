import { Hex } from "./hex_grid_system/hex.js";
import { ResourceType } from "./resource_type.js";

export class Tile {
    constructor(coord, resource, numberToken) {
        // type check       
        if (!ResourceType.isValid(resource)) {
            throw new Error(`Invalid tile type: ${resource}`);
        }

        this.resource = resource; // e.g., "wood", "hill", etc.
        this.hex = new Hex(coord[0], coord[1], coord[2]); // Hexagon instance representing the tile's position
        this.numberToken = numberToken; // Number token on the tile (if applicable)
    }
}