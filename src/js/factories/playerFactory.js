// factories/playerFactory.js
import { RESOURCE_TYPES } from '../constants/ResourceTypes.js';
import { PLAYER_ASSET_LIMITS } from '../constants/GameRuleConstants.js';

export const createPlayer = ({ id, name, color }) => ({
    id,
    name,
    color,
    
    // Limits
    roadsLeft: PLAYER_ASSET_LIMITS.roads,
    settlementsLeft: PLAYER_ASSET_LIMITS.settlements,
    citiesLeft: PLAYER_ASSET_LIMITS.cities,

    // Resource Inventory
    resources: {
        [RESOURCE_TYPES.ORE]: 0,
        [RESOURCE_TYPES.WOOL]: 0,
        [RESOURCE_TYPES.LUMBER]: 0,
        [RESOURCE_TYPES.WHEAT]: 0,
        [RESOURCE_TYPES.BRICK]: 0,
    },
    totalResourceCount: null, // Cache total resource count for quick access

    // Assets: Using Objects as Sets (Key = ID, Value = true)
    // This is JSON-safe and allows instant lookup.
    settlements: {}, 
    cities: {},      
    roads: {},       
    
    // DevCards must remain an Array because order matters (FIFO for playing)
    // and they don't have unique board IDs.
    devCards: [],    

    // Status
    achievements: {
        hasLongestRoad: false,
        hasLargestArmy: false,
        knightsPlayed: 0,
        cheatVP: 0
    }
});