import { DEV_CARD_TYPES } from "../../constants/DevCardTypes.js";
import { RESOURCE_TYPES } from "../../constants/ResourceTypes.js";

export const DevCardEffects = {

  [DEV_CARD_TYPES.KNIGHT]: (gameController) => {
    // Logic: Move Robber
    console.log("Knight played: Switching to Robber State");
    const currentPlayer = gameController.getCurrentPlayer();
    currentPlayer.achievements.knightsPlayed++;
    gameController.updateLargestArmy();  // check for largest army update
    gameController.activateRobber(gameController.gameContext.currentState);    // start robber move process, need to return to current state after completion
  },

  [DEV_CARD_TYPES.YEAR_OF_PLENTY]: (gameController, selectedResources) => {
    // Logic: Give player 2 resources of their choice
    console.log("Year of Plenty played: Activating Year of Plenty Resource Selection:", selectedResources);
    const currentPlayer = gameController.getCurrentPlayer();
    selectedResources.forEach(resource => {
      if (!Object.values(RESOURCE_TYPES).includes(resource)) {
        throw new Error(`Invalid resource type selected for Year of Plenty: ${resource}`);
      }
      console.log(`Year of Plenty: Giving player 1 ${resource}`);
      currentPlayer.addResources({ [resource]: 1 });
    });
  },
};