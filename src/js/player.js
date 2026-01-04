import { ResourceType } from './map/resource_type.js';

export class Player {
    constructor(name) {
        this.name = name;
        this.resources = {
            [ResourceType.WOOD]: 0,
            [ResourceType.BRICK]: 0,
            [ResourceType.SHEEP]: 0,
            [ResourceType.WHEAT]: 0,
            [ResourceType.ROCK]: 0
        };
        this.roads = new Map(); // list of road objects owned by the player
        this.settlements = new Map(); // list of settlement objects owned by the player
        this.publicSpeicalScore = {"ArmyCrop":0, "longestRoad":0,"Knight":0}; // additional score from special cards
        this.hiddenSpecialCards = {"Knight":0, "SpecialScore":0}; // list of special cards owned by the player
    }

    // method to update player's resource
    // type: resource type (from ResourceType)
    // amount can be positive (gain) or negative (spend)
    updateResource(type, amount) {
        if (this.resources.hasOwnProperty(type)) {
            this.resources[type] += amount;
        }
    }

    // compute the latest score based on settlements and cities
    getScore(){
        let score = 0;

        for (const settlement of this.settlements.values()) {
            console.log(settlement);
            score += settlement.getScoreValue();
        }

        for (const bonus of Object.values(this.bounusScore)) {
            score += bonus;
        }

        return score;
    }

    getSettlements(){
        return this.settlements;
    }

    getRoads(){
        return this.roads;
    }

    addSettlement(settlement){
        this.settlements.set(settlement.vertex.id, settlement);
    }

    upgradeSettlementByCoord(coord){
        let id = `${coord[0]},${coord[1]},${coord[2]}`;
        if (this.settlements.has(id)) {
            try{
                this.settlements.get(id).upgrade();
            }catch(error){
                console.error(error);
            }
        }else{
            throw new Error(`No settlement found with id: ${id}`);
        }
    }
}