import { TERRAIN_TYPES } from "./TerrainTypes.js";
import { DEV_CARD_TYPES } from "./DevCardTypes.js";
import { RESOURCE_TYPES } from "./ResourceTypes.js";

export const HEX_SIZE = 50; // default hex size for pixel calculations
export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const PLAYER_COLORS = [
    'rgba(255,0,0,1)',    // Red
    'rgb(255, 136, 0)',   // Orange
    'rgb(0, 162, 255)',   // Blue
    'rgb(209, 209, 206)'  // Light Gray
];


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