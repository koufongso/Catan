import { Hex } from "./hex_grid_system.js/hex";

export const TileType = Object.freeze({
    WOOD: 'WOOD',
    ROCK: 'ROCK',
    BRICK: 'BRICK',
    SHEEP: 'SHEEP',
    WHEAT: 'WHEAT',
    DESERT: 'DESERT'
});


export class Tile {
    constructor(q, r, s, type, tokenNumber) {
        // type check
        if (!Object.values(TileType).includes(type)) {
            throw new Error(`Invalid tile type: ${type}`);
        }

        this.type = type; // e.g., "wood", "hill", etc.
        this.hex = new Hex(q, r, s); // Hexagon instance representing the tile's position
        this.tokenNumber = tokenNumber; // Number token on the tile (if applicable)
    }
}