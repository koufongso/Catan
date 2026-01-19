import { HexUtils } from "../utils/hex-utils.js";
import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";
import { TERRAIN_TYPES } from "../constants/TerrainTypes.js";

export class Tile {
    constructor(coord, terrainType, numberToken) {
        // hex coordinate check
        if (!HexUtils.isValidHex(coord)) {
            throw new Error("Invalid hex coordinate");
        }

        // terrain type check
        const normalizedType = terrainType.toLowerCase();
        if (!this.isValidTerrainType(normalizedType)) {
            throw new Error(`Invalid terrain type ${normalizedType}`);
        }

        // number token check
        if (typeof numberToken !== 'number' && numberToken !== null) {
            throw new Error("Invalid number token");
        }
        
        this.coord = coord;                     //  hex coordinate
        this.id = HexUtils.coordToId(coord);    // Unique ID based on coordinate
        this.terrainType = normalizedType;                // e.g., "forest", "hill", etc.
        this.resource = null;                   // Resource type produced by this terrain
        this.numberToken = numberToken;         // Number token on the terrain (if applicable)

        this.assignResource();
    }

    isValidTerrainType(type) {
        const validTypes = Object.values(TERRAIN_TYPES);
        return validTypes.includes(type);
    }

    // safe way to update terrain type
    updateTerrainType(newType) {
        // convert to lowercase
        const normalizedNewType = newType.toLowerCase();

        if (!this.isValidTerrainType(normalizedNewType)) {
            throw new Error(`Invalid terrain type ${normalizedNewType}`);
        }
        this.terrainType = normalizedNewType;
        this.assignResource();
    }

    // safe way to update number token
    updateNumberToken(newToken) {
        if (typeof newToken !== 'number' && newToken !== null) {
            throw new Error("Invalid number token");
        }
        this.numberToken = newToken;
    }

    assignResource() {
        // A simple mapping within the class
        const map = {
            [TERRAIN_TYPES.MOUNTAIN]: RESOURCE_TYPES.ORE,
            [TERRAIN_TYPES.PASTURE]: RESOURCE_TYPES.WOOL,
            [TERRAIN_TYPES.FOREST]: RESOURCE_TYPES.LUMBER,
            [TERRAIN_TYPES.FIELD]: RESOURCE_TYPES.WHEAT,
            [TERRAIN_TYPES.HILL]: RESOURCE_TYPES.BRICK,
            [TERRAIN_TYPES.DESERT]: null
        };
        this.resource = map[this.type];
    }
}