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
    }
});