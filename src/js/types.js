/**
 * @typedef {Object} Tile
 * @property {Object} coord - {q, r, s}
 * @property {string} id - calculated ID (e.g. "q0_r0_s0")
 * @property {string} terrainType - e.g. "FOREST", "DESERT"
 * @property {number|null} numberToken - e.g. 6, 8, or null
 */

/**
 * @typedef {Object} Road
 * @property {Object} coord - {q, r, s}
 * @property {string} id - calculated ID (e.g. "q0_r0_s0")
 * @property {string} ownerId - the ID of the player who owns it
 */

/**
 * @typedef {Object} Settlement
 * @property {Object} coord - {q, r, s}
 * @property {string} id - calculated ID (e.g. "q0_r0_s0")
 * @property {string} ownerId - the ID of the player who owns it
 * @property {number} level - 0 for empty, 1 for settlement, 2 for city
 */

/**
 * @typedef {Object} TradingPost
 * @property {Object} coord - {q, r, s}
 * @property {string} id - calculated ID (e.g. "q0_r0_s0")
 * @property {Array<number>} indexList - list of vertex indices (0-5) that are connected to this trading post
 * @property {Object} tradeList - mapping of resource to ratio, e.g. {brick: 2 (2 bricks to 1 any resource), wood: 3}
 */

/**
 * @typedef {Object} GameMap
 * @property {Object} tiles - mapping of tileId to Tile objects
 * @property {Object} roads - mapping of roadId to Road objects
 * @property {Object} settlements - mapping of settlementId to Settlement objects
 * @property {Object} robber - { location: tileId }
 */

/**
 * @typedef {Object} DevCard
 * @property {string} id - unique ID for the card
 * @property {string} type - e.g. "knight", "victoryPoint", "roadBuilding", "yearOfPlenty", "monopoly"
 * @property {boolean} isUsed - whether the card has been used
 */

/**
 * @typedef {Object} DevCardDeck
 * @property {Object} cards - mapping of cardId to DevCard objects
 * @property {number} remaining - number of cards left in the deck
 * @property {number} knightCount - number of knight cards left (for Largest Army)
 * @property {number} victoryPointCount - number of victory point cards left
 * @property {number} roadBuildingCount - number of road building cards left
 * @property {number} yearOfPlentyCount - number of year of plenty cards left
 * @property {number} monopolyCount - number of monopoly cards left
 */

/**
 * @typedef {Object} Player
 * @property {string} id - unique player ID
 * @property {string} name - player's display name
 * @property {string} color - player's color (e.g. "red", "blue" or rgba value in string format)
 * @property {number} settlementsLeft - how many settlements the player can still build
 * @property {number} roadsLeft - how many roads the player can still build
 * @property {number} citiesLeft - how many cities the player can still build
 * @property {Object} resources - e.g. { wood: 2, brick: 3, sheep: 1, wheat: 0, ore: 4 }
 * @property {Object} settlements - mapping of settlementId to true (indicating ownership)
 * @property {Object} roads - mapping of roadId to true (indicating ownership)
 * @property {Object} cities - mapping of cityId to true (indicating ownership)
 * @property {Object} devCards - e.g. { knight: 1, victoryPoint: 0, roadBuilding: 2, yearOfPlenty: 0, monopoly: 1 }
 * @property {Object} achievements - e.g. { hasLongestRoad: false, hasLargestArmy: false, cheatVP: 0 }
 */