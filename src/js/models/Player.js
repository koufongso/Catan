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
    addResource(resources) {
        for (let [type, amount] of Object.entries(resources)) {
            console.log(`Player ${this.name} (${this.id}) resource change: ${type} ${amount}`);
            console.log("Before:", this.resources);
            if (this.resources[type] !== undefined) {
                // Prevents resources from dropping below zero
                this.resources[type] = Math.max(0, this.resources[type] + amount);
            }
            console.log("After:", this.resources);
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

    getResource(){
        return this.resources;
    }

    getHands(){
        return {'resource':this.resources, 'devCard':this.getDevCards()};
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
}