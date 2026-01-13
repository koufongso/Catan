import { ResourceType } from '../constants/ResourceType.js';

export class Player {
    constructor(id, name, color, type) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.type = type;

        // resource inventory
        this.resources = {
            [ResourceType.ORE]: 0,
            [ResourceType.WOOL]: 0,
            [ResourceType.LUMBER]: 0,
            [ResourceType.WHEAT]: 0,
            [ResourceType.BRICK]: 0,
        };


        // asset ownership
        this.settlementIds = new Set();
        this.roadIds = new Set();

        // Achievement/Special Status (Data only, logic handled by ScoreService)
        this.achievements = {
            hasLongestRoad: false,
            hasLargestArmy: false,
            victoryPointCards: 0,
            knightsPlayed: 0
        };
    }

    // cost is an object {resourceType: amount, ...}
    canAfford(cost) {
        for (let [type, amount] of Object.entries(cost)) {
            if (this.resources[type] < amount) {
                return false;
            }
        }
        return true;
    }


    // add resource count (can be negative, which means removing resources)
    addResource(type, amount) {
        console.log(`Player ${this.name} (${this.id}) resource change: ${type} ${amount}`);
        console.log("Before:", this.resources);
        if (this.resources[type] !== undefined) {
            // Prevents resources from dropping below zero
            this.resources[type] = Math.max(0, this.resources[type] + amount);
        }
        console.log("After:", this.resources);
    }


    // add a settlement object to player's list
    addSettlement(vertexId) {
        this.settlementIds.add(vertexId);
    }

    // add a road object to player's list
    addRoad(edgeId) {
        this.roadIds.add(edgeId);
    }

    // helper function to get all owned assets ids
    getOwnedAssets() {
        return {
            settlements: Array.from(this.settlementIds),
            roads: Array.from(this.roadIds)
        };
    }

    getVictoryPoints(){
        let vp = 0;
        // settlements
        vp += this.settlementIds.size * 1;
        // cities - assuming cityIds is a Set similar to settlementIds
        // vp += this.cityIds.size * 2; // Uncomment if city logic is added
        // victory point cards
        vp += this.achievements.victoryPointCards;
        // longest road
        if (this.achievements.hasLongestRoad) vp += 2;
        // largest army
        if (this.achievements.hasLargestArmy) vp += 2;
        return vp;
    }
}