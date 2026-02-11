// logic/DevCardActions.js
import { DEV_CARD_TYPES } from "../constants/DevCardTypes.js";
import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";
import { StatusCodes } from "../constants/StatusCodes.js";
import { PlayerUtils } from "../utils/PlayerUtils.js"; // Import the Utils!

export const DevCardEffects = {

  [DEV_CARD_TYPES.KNIGHT]: (gameController) => {
    console.log("Knight played: Switching to Robber State");
    
    // 1. Get POJO
    const currentPlayer = gameController.getCurrentPlayer();
    
    // 2. Modify POJO directly
    currentPlayer.achievements.knightsPlayed++;
    
    // 3. Call Controller method (The Controller is still a Class, so this is fine)
    gameController.updateLargestArmy(); 
    
    return gameController.activateRobber(gameController.gameContext.currentState);
  },

  [DEV_CARD_TYPES.YEAR_OF_PLENTY]: (gameController, selectedResources) => {
    console.log("Year of Plenty played:", selectedResources);
    
    const currentPlayer = gameController.getCurrentPlayer();
    
    // Check for errors first
    for (const resource of selectedResources) {
       if (!Object.values(RESOURCE_TYPES).includes(resource)) {
        return {
          status: StatusCodes.ERROR,
          error_message: `Invalid resource type: ${resource}`
        };
      }
    }

    // Apply effects
    selectedResources.forEach(resource => {
      console.log(`Year of Plenty: Giving ${resource}`);
      
      // ✅ USE UTILS, NOT METHODS
      PlayerUtils.addResources(currentPlayer, { [resource]: 1 });
    });

    return {
      status: StatusCodes.SUCCESS,
      gameContext: gameController.gameContext
    };
  },
};