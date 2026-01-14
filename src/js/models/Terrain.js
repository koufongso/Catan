import { HexUtils } from "../utils/hex-utils.js";
import { ResourceUtils } from "../utils/resource-utils.js";
import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";

export class Terrain {
    constructor(coord, type, numberToken) {
        // hex coordinate check
        if (!HexUtils.isValidHex(coord)) {
            throw new Error("Invalid hex coordinate");
        }

        // terrain type check
        const normalizedType = type.toLowerCase();
        if (!this.isValidTerrainType(normalizedType)) {
            throw new Error(`Invalid terrain type ${normalizedType}`);
        }

        // number token check
        if (typeof numberToken !== 'number' && numberToken !== null) {
            throw new Error("Invalid number token");
        }
        
        this.coord = coord;                     //  hex coordinate
        this.id = HexUtils.coordToId(coord);    // Unique ID based on coordinate
        this.type = normalizedType;                // e.g., "forest", "hill", etc.
        this.resource = null;                   // Resource type produced by this terrain
        this.numberToken = numberToken;         // Number token on the terrain (if applicable)

        this.assignResource();
    }

    isValidTerrainType(type) {
        const validTypes = ['mountain', 'pasture', 'forest', 'field', 'hill', 'desert'];
        return validTypes.includes(type);
    }

    // safe way to update terrain type
    updateType(newType) {
        // convert to lowercase
        const normalizedNewType = newType.toLowerCase();

        if (!this.isValidTerrainType(normalizedNewType)) {
            throw new Error(`Invalid terrain type ${normalizedNewType}`);
        }
        this.type = normalizedNewType;
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
            mountain: RESOURCE_TYPES.ORE,
            pasture: RESOURCE_TYPES.WOOL,
            forest: RESOURCE_TYPES.LUMBER,
            field: RESOURCE_TYPES.WHEAT,
            hill: RESOURCE_TYPES.BRICK,
            desert: null
        };
        this.resource = map[this.type];
    }
}