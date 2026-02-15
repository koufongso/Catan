// logic/DevCardActions.js
import { DEV_CARD_TYPES } from "../constants/DevCardTypes.js";
import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";
import { StatusCodes } from "../constants/StatusCodes.js";
import { PlayerUtils } from "../utils/PlayerUtils.js";

import { GameState } from "../core/GameControllerV2.js";

export const DevCardEffects = {

  [DEV_CARD_TYPES.KNIGHT]: (gameController, payload = null) => { // note: no payload needed for Knight, but we keep the signature consistent for all cards
    console.log("Knight played: Switching to Robber State");
    
    // 1. Get player data
    const currentPlayer = gameController._getCurrentPlayer();
    
    // 2. update largest army
    currentPlayer.achievements.knightsPlayed++;
    gameController.updateLargestArmy(); 

    // 3. enter the move robber routine
    gameController.returnStateAfterRob = gameController.gameContext.currentState; // save current state to return to after moving robber
    gameController.gameContext.currentState = GameState.MOVE_ROBBER;

    // mark the card as played
    const devCard = payload.devCard; // avoid searching again for the card, we already have it in the payload
    devCard.played = true;

    gameController._broadcast({
        type: 'WAITING_FOR_ACTION',
        payload: {
            phase: 'MOVE_ROBBER',
            activePlayerId: gameController.gameContext.currentPlayerId
        }
    });
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