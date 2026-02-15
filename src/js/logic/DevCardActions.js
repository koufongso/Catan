// logic/DevCardActions.js
import { DEV_CARD_TYPES } from "../constants/DevCardTypes.js";
import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";
import { StatusCodes } from "../constants/StatusCodes.js";
import { PlayerUtils } from "../utils/PlayerUtils.js";

import { GameState } from "../core/GameControllerV2.js";

export const DevCardEffects = {

  [DEV_CARD_TYPES.KNIGHT]: (gameController, payload) => {
    // create a "virtual" evnet to reuse the existing robber placement logic in the game controller
    const event = {
      type: 'ACTIVATE_DEV_CARD_KNIGHT',
      payload: payload // to mark the card as played, nedd to pass the original object 
    };

    gameController.returnStateAfterRob = gameController.gameContext.currentState; // return the current state after completion of robber placement
    gameController.handleStateMoveRobber(event); // let the game controller handle the rest of the logic for moving the robber and stealing resources
  },

  [DEV_CARD_TYPES.YEAR_OF_PLENTY]: (gameController, payload) => {
    console.log("Year of Plenty played:", payload.selectedResources);
    
    const currentPlayer = gameController._getCurrentPlayer();
    
    // Check for errors first
    for (const resource of payload.selectedResources) {
       if (!Object.values(RESOURCE_TYPES).includes(resource)) {
        return {
          status: StatusCodes.ERROR,
          error_message: `Invalid resource type: ${resource}`
        };
      }
    }

    // Apply effects
    payload.selectedResources.forEach(resource => {
      console.log(`Year of Plenty: Giving ${resource}`);
      
      PlayerUtils.addResources(currentPlayer, { [resource]: 1 });
    });

    return {
      status: StatusCodes.SUCCESS,
      gameContext: gameController.gameContext
    };
  },
};