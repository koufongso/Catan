export const PlayerUtils = Object.freeze({
    getTotalResourceCount(player, type=null){
        // if type is specified, return count of that resource
        if(type){
            return player.resources[type] || 0;
        }

        // else return total count of all resources
        let total = 0;
        for (let amount of Object.values(player.resources)) {
            total += amount;
        }   
        return total;
    },

    getTotalDevCardCount(player){
        return player.devCards.length;
    },

    distributeResourceToPlayer(gameContext, playerId, resourceType, amount) {
        // first check if bank has enough resources
        const returnedResources = this.getResourceFromBank({ [resourceType]: amount });

        // find the player in the game context and give them the resource
        const player = gameContext.players[playerId];
        if (player) {
            player.addResources(returnedResources);
        }
    }
});