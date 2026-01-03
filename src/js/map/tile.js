import { Hex } from "./hex_grid_system.js/hex";
import { ResourceType } from "./resource_type.js";

export class Tile {
    constructor(q, r, s, resource, tokenNumber) {
        // type check
        if (!Object.values(ResourceType).includes(resource)) {
            throw new Error(`Invalid tile type: ${resource}`);
        }

        this.resource = resource; // e.g., "wood", "hill", etc.
        this.hex = new Hex(q, r, s); // Hexagon instance representing the tile's position
        this.tokenNumber = tokenNumber; // Number token on the tile (if applicable)
    }
}