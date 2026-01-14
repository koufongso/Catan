import { ResourceType } from './ResourceType.js';

// maximum number of players allowed in the game
export const MAX_PLAYERS = 4;

// cost to build each structure
export const COSTS = {
    road: { [ResourceType.BRICK]: -1, [ResourceType.LUMBER]: -1 },
    settlement: { [ResourceType.BRICK]: -1, [ResourceType.LUMBER]: -1, [ResourceType.WOOL]: -1, [ResourceType.WHEAT]: -1 },
    city: { [ResourceType.ORE]: -3, [ResourceType.WHEAT]: -2 },
    devCard: { [ResourceType.ORE]: -1, [ResourceType.WOOL]: -1, [ResourceType.WHEAT]: -1 }
};