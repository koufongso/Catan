import { DEV_CARD_TYPES } from './DevCardTypes.js';
import { RESOURCE_TYPES } from './ResourceTypes.js';
import { TERRAIN_TYPES } from './TerrainTypes.js';

// maximum number of players allowed in the game
export const MAX_PLAYERS = 4;
export const PLAYER_COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple'];
export const PLAYER_NAMES = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank'];

// number token in alphabetical order on the standard Catan board
export const NUMBER_TOKENS_ORDER = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];


// cost to build each structure
export const COSTS = {
    road: { [RESOURCE_TYPES.BRICK]: -1, [RESOURCE_TYPES.LUMBER]: -1 },
    settlement: { [RESOURCE_TYPES.BRICK]: -1, [RESOURCE_TYPES.LUMBER]: -1, [RESOURCE_TYPES.WOOL]: -1, [RESOURCE_TYPES.WHEAT]: -1 },
    city: { [RESOURCE_TYPES.ORE]: -3, [RESOURCE_TYPES.WHEAT]: -2 },
    devCard: { [RESOURCE_TYPES.ORE]: -1, [RESOURCE_TYPES.WOOL]: -1, [RESOURCE_TYPES.WHEAT]: -1 }
};

// initial resources in the bank
export const INITIAL_BANK_RESOURCES = {
    [RESOURCE_TYPES.ORE]: 19,
    [RESOURCE_TYPES.WOOL]: 19,
    [RESOURCE_TYPES.WHEAT]: 19,
    [RESOURCE_TYPES.BRICK]: 19,
    [RESOURCE_TYPES.LUMBER]: 19,
};

// player maximum roads, settlements, and cities
export const PLAYER_ASSET_LIMITS = {
    roads: 15,
    settlements: 5,
    cities: 4
};

export const TERRAIN_TYPES_DISTRIBUTION = {
    [TERRAIN_TYPES.FOREST]: 4,    
    [TERRAIN_TYPES.HILL]: 3,      
    [TERRAIN_TYPES.PASTURE]: 4,  
    [TERRAIN_TYPES.FIELD]: 4,     
    [TERRAIN_TYPES.MOUNTAIN]: 3,  
    [TERRAIN_TYPES.DESERT]: 1
};