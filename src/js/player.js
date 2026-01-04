import { ResourceType } from './map/resource_type.js';

export class Player {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;

        // resource inventory
        this.resources = new Map();
        // initialize all resource counts to zero
        Object.values(ResourceType).forEach(type => {
            if (type !== ResourceType.DESERT) {
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


    // update resource count
    updateResource(type, amount) {
        if (this.resources.has(type)) {
            const current = this.resources.get(type);
            // Prevents resources from dropping below zero
            this.resources.set(type, current + amount);
        }
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