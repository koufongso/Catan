import { DEV_CARD_TYPES } from './DevCardTypes.js';
import { RESOURCE_TYPES } from './ResourceTypes.js';
import { TERRAIN_TYPES } from './TerrainTypes.js';

// maximum number of players allowed in the game
export const MAX_PLAYERS = 4;
export const PLAYER_COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple'];
export const PLAYER_NAMES = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank'];

export const NUMBER_TOKENS_DISTRIBUTION = {
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

// player maximum roads, settlements, and cities
export const PLAYER_ASSET_LIMITS = {
    roads: 15,
    settlements: 5,
    cities: 4
};

export const TEXTURE_PATHS = {
    TERRAINS: {
        [TERRAIN_TYPES.FOREST]: '/src/assets/images/terrains/forest.png',       // Wood
        [TERRAIN_TYPES.HILL]: '/src/assets/images/terrains/hill.png',         // Brick
        [TERRAIN_TYPES.PASTURE]: '/src/assets/images/terrains/pasture.png',     // Wool
        [TERRAIN_TYPES.FIELD]: '/src/assets/images/terrains/field.png',       // Wheat
        [TERRAIN_TYPES.MOUNTAIN]: '/src/assets/images/terrains/mountain.png', // Ore
        [TERRAIN_TYPES.DESERT]: '/src/assets/images/terrains/desert.png'
    },
    CARDS: {
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
    TOKENS: {
        NUMBERS: {
            2: '/src/assets/images/tokens/2_token.png',
            3: '/src/assets/images/tokens/3_token.png',
            4: '/src/assets/images/tokens/4_token.png',
            5: '/src/assets/images/tokens/5_token.png',
            6: '/src/assets/images/tokens/6_token.png',
            8: '/src/assets/images/tokens/8_token.png',
            9: '/src/assets/images/tokens/9_token.png',
            10: '/src/assets/images/tokens/10_token.png',
            11: '/src/assets/images/tokens/11_token.png',
            12: '/src/assets/images/tokens/12_token.png',
        },
        ROBBER: '/src/assets/images/tokens/robber_token.png'
    },
    UI: {
        PORT_ICON: '/src/assets/images/ui/port_icon.png'
    }
}