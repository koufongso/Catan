import { ResourceType } from './map/resource_type.js';

export class Player {
    constructor(id, name, color, type) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.type = type;

        // resource inventory
        this.resources = new Map();
        // initialize all resource counts to zero
        Object.values(ResourceType).forEach(type => {
            if (typeof type === 'string' && type !== ResourceType.DESERT) {
                this.resources.set(type, 0);
            }
        });

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
            if (this.resources.get(type) < amount) {
                return false;
            }
        }
        return true;
    }


    // add resource count (can be negative, which means removing resources)
    addResource(type, amount) {
        console.log(`Player ${this.name} (${this.id}) resource change: ${type} ${amount}`);
        console.log("Before:", this.resources);
        if (this.resources.has(type)) {
            const current = this.resources.get(type);
            // Prevents resources from dropping below zero
            this.resources.set(type, current + amount);
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
}