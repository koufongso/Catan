import { RESOURCE_TYPES } from '../constants/ResourceTypes.js';
import { PLAYER_ASSET_LIMITS } from '../constants/GameRuleConstants.js';
import { HexUtils } from '../utils/hex-utils.js';

export class Player {
    constructor(data = {}) {
        const dataCopy = structuredClone(data); // create a deep copy to avoid mutating original
        this.id = dataCopy.id;
        this.name = dataCopy.name;
        this.color = dataCopy.color;
        this.roadsLeft = dataCopy.roadsLeft || PLAYER_ASSET_LIMITS.roads;
        this.settlementsLeft = dataCopy.settlementsLeft || PLAYER_ASSET_LIMITS.settlements;
        this.citiesLeft = dataCopy.citiesLeft || PLAYER_ASSET_LIMITS.cities;

        // resource inventory
        this.resources = dataCopy.resources || {
            [RESOURCE_TYPES.ORE]: 0,
            [RESOURCE_TYPES.WOOL]: 0,
            [RESOURCE_TYPES.LUMBER]: 0,
            [RESOURCE_TYPES.WHEAT]: 0,
            [RESOURCE_TYPES.BRICK]: 0,
        };


        // asset ownership (ids)
        this.settlements = dataCopy.settlements || new Set();   // set of settlement id
        this.roads = dataCopy.roads || new Set();               // set of road id
        this.cities = dataCopy.cities || new Set();                 // set of city id
        this.devCards = dataCopy.devCards || [];                // array of DevCard objects

        // Achievement/Special Status (Data only, logic handled by ScoreService)
        this.achievements = dataCopy.achievements || {
            hasLongestRoad: false,
            hasLargestArmy: false,
            knightsPlayed: 0,
            cheatVP: 0 // Victory points from cheats (for testing purposes)
        };
    }

    /**
     * Check if player can afford the cost
     * @param {Object} cost an object {resourceType: amount, ...}
     * @returns {boolean} true if player can afford, false otherwise
     */
    canAfford(cost) {
        for (let [type, amount] of Object.entries(cost)) {
            if (this.resources[type] - amount < 0) {
                return false;
            }
        }
        return true;
    }


    /**
     * Add resources to player's resource hand
     * @param {Object} resources an object {resourceType: amount, ...}
     * @param {boolean} allowNegative whether to allow negative resources (default: false)
     */
    addResources(resources, allowNegative = false) {
        for (let [type, amount] of Object.entries(resources)) {
            if (this.resources[type] !== undefined) {
                // Prevents resources from dropping below zero
                this.resources[type] = allowNegative ? this.resources[type] + amount : Math.max(0, this.resources[type] + amount);
            }
        }
    }


    /**
     * Deduct resources from player's resource hand according to the cost
     * @param {*} cost an object {resourceType: amount (positive), ...}
     * @param {boolean} allowNegative whether to allow negative resources (default: false)
     */
    deductResources(cost, allowNegative = false) {
        for (let [type, amount] of Object.entries(cost)) {
            if (this.resources[type] !== undefined) {
                // Prevents resources from dropping below zero
                this.resources[type] = allowNegative ? this.resources[type] - amount : Math.max(0, this.resources[type] - amount);  
            }
        }
    }

    /**
     * Check if player can build a building of given type
     * Note: this only checks the remaining building count, not resource cost or placement rules
     * @param {*} buildingType 
     * @returns 
     */
    canBuild(buildingType) {
        switch (buildingType) {
            case 'SETTLEMENT':
                return this.settlementsLeft > 0;
            case 'CITY':
                return this.citiesLeft > 0;
            case 'ROAD':
                return this.roadsLeft > 0;
            default:
                throw new Error(`Invalid building type in canBuild: ${buildingType}`);
        }
    }

    // add a settlement object to player's list
    addSettlement(settlementId) {
        this.settlementsLeft--;
        this.settlements.add(settlementId);
    }

    addCity(cityId) {
        this.citiesLeft--;
        // we assume the city replaces a settlement
        this.settlements.delete(cityId);
        this.settlements.add(cityId);
    }

    // add a road object to player's list
    addRoad(roadId) {
        this.roadsLeft--;
        this.roads.add(roadId);
    }

    // add a dev card object to player's list
    addDevCard(devCard) {
        this.devCards.push(devCard);
    }


    getSettlements(level = null) {
        switch (level) {
            case null: // all settlements
                return Array.from(this.settlements);
            case 0:
            case 1:
            case 2:
                return Array.from(this.settlements).filter(s => s.level === level);
            default:
                throw new Error("Invalid settlement level filter");
        }
    }

    getRoads() {
        return Array.from(this.roads);
    }

    getDevCards() {
        return this.devCards;
    }

    getResources() {
        return this.resources;
    }


    /**
     * Discard resources from player
     * @param {Object} resources the resources to discard {resourceType: amount, ...}
     * @param {boolean} allowNegative whether to allow negative resources (default: false)
     */
    discardResources(resources, allowNegative = false) {
        for (let [type, amount] of Object.entries(resources)) {
            if (this.resources[type] !== undefined) {
                this.resources[type] = allowNegative ? this.resources[type] - amount : Math.max(0, this.resources[type] - amount);
            }
        }
    }


    getHands() {
        return { 'resources': this.getResources(), 'devCards': this.getDevCards() };
    }

    // helper function to get all owned assets ids
    getOwnedAssets() {
        return {
            settlements: Array.from(this.settlements),
            roads: Array.from(this.roads),
            devCards: this.devCards
        };
    }

    getVictoryPoints() {
        let vp = 0;
        // settlements
        vp += this.settlements.size;
        vp += this.cities.size * 2;

        // cities - assuming cityIds is a Set similar to settlementIds
        // vp += this.cityIds.size * 2; // Uncomment if city logic is added
        // victory point cards
        vp += this.devCards.filter(card => card.type === 'VICTORY_POINT').length;
        // longest road
        if (this.achievements.hasLongestRoad) vp += 2;
        // largest army
        if (this.achievements.hasLargestArmy) vp += 2;
        // cheat VP
        vp += this.achievements.cheatVP;
        return vp;
    }

    /**
     * Remove resources by indicies from player's resource hand
     * @param {Array} indicies - array of resource indicies to remove
     * @return a object {resourceType: amount, ...} of removed resources
     */
    removeResourceByIndicies(indicies) {
        // determine resources to remove
        const resourceTypes = Object.keys(this.resources);

        // compute the bounary indicies for each resource type
        // e.g., [0, 3, 5, 8, 10, 12] means:
        // 0-2: type0, 3-4: type1, 5-7: type2, 8-9: type3, 10-11: type4
        let boundaries = [];
        let cumulative = 0;
        let toRemove = {};
        for (let type of resourceTypes) {
            boundaries.push(cumulative);
            cumulative += this.resources[type];
            toRemove[type] = 0;
        }
        boundaries.push(cumulative); // add the total count as the final boundary

        // remove resources by indicies

        for (let index of indicies) {
            if (index < 0 || index >= cumulative) {
                throw new Error(`Invalid resource index: ${index}`);
            }
            // find which resource type this index belongs to
            let typeIndex = 0; // the resource type index this index belongs 
            // e.g., if index=4 and boundaries=[0,3,5,8,10,12], typeIndex=1 (type1)
            while (typeIndex < boundaries.length - 1 && index >= boundaries[typeIndex + 1]) {
                typeIndex++;
            }
            const type = resourceTypes[typeIndex];
            toRemove[type]++;
        }

        // actually remove the resources
        for (let [type, amount] of Object.entries(toRemove)) {
            this.resources[type] -= amount;
        }

        return toRemove;
    }

    getSettlementVerticesIdSet() {
        const vertexSet = new Set();
        for (let settlement of this.settlements) {
            const vertexId = HexUtils.coordToId(settlement.coord);
            vertexSet.add(vertexId);
        }
        return vertexSet;
    }


    /**
     * Get a Set of vertex IDs connected to player's roads
     * @returns {Set} - A set of vertex IDs
     */
    getRoadVerticesIdSet() {
        const vertexSet = new Set();
        for (let road of this.roads) {
            const vertices = HexUtils.getVerticesFromEdge(road.coord);
            for (let vertex of vertices) {
                vertexSet.add(HexUtils.coordToId(vertex));
            }
        }
        return vertexSet;
    }

    getTotalResourceCount(type = null) {
        // if type is specified, return count of that resource
        if (type) {
            return this.resources[type] || 0;
        }

        // else return total count of all resources
        return Object.values(this.resources).reduce((a, b) => a + b, 0);
    }

    getTotalDevCardCount() {
        return this.devCards.length;
    }


    /**
     * Safe way to serialize player data
     * @param {*} isPrivate - If true, only include public information (e.g., for other players)
     * @returns {Object} - The serialized player data
     */
    serialize(isPrivate = true) {
        return {
            id: this.id,
            color: this.color,
            resourceCount: this.getTotalResourceCount(),
            devCardCount: this.getTotalDevCardCount(),
            resources: isPrivate ? null : this.resources,
            devCards: isPrivate ? null : this.devCards
        };
    }
}