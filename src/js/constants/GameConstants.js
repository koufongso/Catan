import { RESOURCE_TYPES } from './ResourceTypes.js';

// maximum number of players allowed in the game
export const MAX_PLAYERS = 4;

export const NUMBER_TOKENS = {
    2: 1,
    3: 2,
    4: 2,
    5: 2,
    6: 2,
    8: 2,
    9: 2,
    10: 2,
    11: 2,
    12: 1
};


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