import { RESOURCE_TYPES } from '../constants/ResourceTypes.js';

export class Player {
    constructor(id, name, color, type) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.type = type;

        // resource inventory
        this.resources = {
            [RESOURCE_TYPES.ORE]: 0,
            [RESOURCE_TYPES.WOOL]: 0,
            [RESOURCE_TYPES.LUMBER]: 0,
            [RESOURCE_TYPES.WHEAT]: 0,
            [RESOURCE_TYPES.BRICK]: 0,
        };


        // asset ownership
        this.settlements = new Set();
        this.roads = new Set();
        this.devCards = []; // array of DevCard objects

        // Achievement/Special Status (Data only, logic handled by ScoreService)
        this.achievements = {
            hasLongestRoad: false,
            hasLargestArmy: false,
            victoryPointCards: 0,
            knightsPlayed: 0,
            cheatVP: 0 // Victory points from cheats (for testing purposes)
        };
    }

    // cost is an object {RESOURCE_TYPES: amount, ...}
    canAfford(cost) {
        for (let [type, amount] of Object.entries(cost)) {
            if (this.resources[type] + amount < 0) {
                return false;
            }
        }
        return true;
    }


    // add resource count (can be negative, which means removing resources)
    addResources(resources) {
        for (let [type, amount] of Object.entries(resources)) {
            if (this.resources[type] !== undefined) {
                // Prevents resources from dropping below zero
                this.resources[type] = Math.max(0, this.resources[type] + amount);
            }
        }
    }


    // add a settlement object to player's list
    addSettlement(settlement) {
        this.settlements.add(settlement);
    }

    // add a road object to player's list
    addRoad(road) {
        this.roads.add(road);
    }

    // add a dev card object to player's list
    addDevCard(devCard) {
        this.devCards.push(devCard);
    }


    getSettlements(level = null) {
        switch(level) {
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

    getResources(){
        return this.resources;
    }

    getTotalResourceCount(type=null){
        // if type is specified, return count of that resource
        if(type){
            return this.resources[type] || 0;
        }

        // else return total count of all resources
        let total = 0;
        for (let amount of Object.values(this.resources)) {
            total += amount;
        }   
        return total;
    }

    /**
     * Discard resources from player
     * @param {*} resources the resources to discard {resourceType: amount, ...}
     */
    discardResources(resources) {
        for (let [type, amount] of Object.entries(resources)) {
            if (this.resources[type] !== undefined) {
                this.resources[type] = Math.max(0, this.resources[type] - amount);
            }
        }
    }


    getHands(){
        return {'resources':this.getResources(), 'devCards':this.getDevCards()};
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
        for (let settlement of this.settlements) {
            vp += settlement.level; // 1 for settlement, 2 for city
        }
        // cities - assuming cityIds is a Set similar to settlementIds
        // vp += this.cityIds.size * 2; // Uncomment if city logic is added
        // victory point cards
        vp += this.achievements.victoryPointCards;
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
            toRemove[type] ++;
        }

        // actually remove the resources
        for (let [type, amount] of Object.entries(toRemove)) {
            this.resources[type] -= amount;
        }

        return toRemove;
    }
}