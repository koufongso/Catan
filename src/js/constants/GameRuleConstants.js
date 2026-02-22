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
export const COSTS = Object.freeze({
    road: { [RESOURCE_TYPES.BRICK]: 1, [RESOURCE_TYPES.LUMBER]: 1 },
    settlement: { [RESOURCE_TYPES.BRICK]: 1, [RESOURCE_TYPES.LUMBER]: 1, [RESOURCE_TYPES.WOOL]: 1, [RESOURCE_TYPES.WHEAT]: 1 },
    city: { [RESOURCE_TYPES.ORE]: 3, [RESOURCE_TYPES.WHEAT]: 2 },
    devCard: { [RESOURCE_TYPES.ORE]: 1, [RESOURCE_TYPES.WOOL]: 1, [RESOURCE_TYPES.WHEAT]: 1 }
});

// initial resources in the bank
export const INITIAL_BANK_RESOURCES = Object.freeze({
    [RESOURCE_TYPES.ORE]: 19,
    [RESOURCE_TYPES.WOOL]: 19,
    [RESOURCE_TYPES.WHEAT]: 19,
    [RESOURCE_TYPES.BRICK]: 19,
    [RESOURCE_TYPES.LUMBER]: 19,
});

// player maximum roads, settlements, and cities
export const PLAYER_ASSET_LIMITS = Object.freeze({
    roads: 15,
    settlements: 5,
    cities: 4
});

export const TERRAIN_TYPES_DISTRIBUTION = Object.freeze({
    [TERRAIN_TYPES.FOREST]: 4,    
    [TERRAIN_TYPES.HILL]: 3,      
    [TERRAIN_TYPES.PASTURE]: 4,  
    [TERRAIN_TYPES.FIELD]: 4,     
    [TERRAIN_TYPES.MOUNTAIN]: 3,  
    [TERRAIN_TYPES.DESERT]: 1
});

export const PRODUCTION_TABLE = Object.freeze({
    [TERRAIN_TYPES.FOREST]:   RESOURCE_TYPES.LUMBER,
    [TERRAIN_TYPES.HILL]:     RESOURCE_TYPES.BRICK,
    [TERRAIN_TYPES.PASTURE]:  RESOURCE_TYPES.WOOL,
    [TERRAIN_TYPES.FIELD]:    RESOURCE_TYPES.WHEAT,
    [TERRAIN_TYPES.MOUNTAIN]: RESOURCE_TYPES.ORE,
    [TERRAIN_TYPES.DESERT]:   null
});

const yopNumResources = 2;
export const YEAR_OF_PLENTY_CONFIG = Object.freeze({
    NUMER_OF_RESOURCES_TO_SELECT: yopNumResources,
    RESOURCE_OPTIONS:{
        [RESOURCE_TYPES.BRICK]: yopNumResources,
        [RESOURCE_TYPES.LUMBER]: yopNumResources,
        [RESOURCE_TYPES.ORE]: yopNumResources,
        [RESOURCE_TYPES.WOOL]: yopNumResources,
        [RESOURCE_TYPES.WHEAT]: yopNumResources
    }
});

const monolopyNumResources = 1;
export const MONOPOLY_CONFIG = Object.freeze({
    NUMER_OF_RESOURCES_TO_SELECT: monolopyNumResources,
    RESOURCE_OPTIONS:{
        [RESOURCE_TYPES.BRICK]: monolopyNumResources,
        [RESOURCE_TYPES.LUMBER]: monolopyNumResources,
        [RESOURCE_TYPES.ORE]: monolopyNumResources,
        [RESOURCE_TYPES.WOOL]: monolopyNumResources,
        [RESOURCE_TYPES.WHEAT]: monolopyNumResources
    }
});