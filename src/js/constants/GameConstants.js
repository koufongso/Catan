import { DEV_CARD_TYPES } from './DevCardTypes.js';
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

export const TEXTURE_PATHS = {
    TERRAIN: {
        FOREST: '/src/assets/terrain/forest.png',       // Wood
        HILLS: '/src/assets/terrain/hills.png',         // Brick
        PASTURE: '/src/assets/terrain/pasture.png',     // Wool
        FIELDS: '/src/assets/terrain/fields.png',       // Wheat
        MOUNTAINS: '/src/assets/terrain/mountains.png', // Ore
        DESERT: '/src/assets/terrain/desert.png'
    },
    CARD:{
        [DEV_CARD_TYPES.KNIGHT]: '/src/assets/images/cards/knight.png',
        [DEV_CARD_TYPES.VICTORY_POINT]: '/src/assets/images/cards/victory_point.png',
        [DEV_CARD_TYPES.ROAD_BUILDING]: '/src/assets/images/cards/road_building.png',
        [DEV_CARD_TYPES.MONOPOLY]: '/src/assets/images/cards/monopoly.png',
        [DEV_CARD_TYPES.YEAR_OF_PLENTY]: '/src/assets/images/cards/year_of_plenty.png',
        [RESOURCE_TYPES.LUMBER]: '/src/assets/images/cards/lumber.png',
        [RESOURCE_TYPES.BRICK]: '/src/assets/images/cards/brick.png',
        [RESOURCE_TYPES.WHEAT]: '/src/assets/images/cards/wheat.png',
        [RESOURCE_TYPES.ORE]: '/src/assets/images/cards/ore.png',
        [RESOURCE_TYPES.WOOL]: '/src/assets/images/cards/wool.png',
    },
    UI: {
        ROBBER: '/src/assets/images/ui/robber_token.png',
        PORT_ICON: '/src/assets/images/ui/port_icon.png'
    }
}