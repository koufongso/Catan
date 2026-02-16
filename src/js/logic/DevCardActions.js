// logic/DevCardActions.js
import { DEV_CARD_TYPES } from "../constants/DevCardTypes.js";
import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";
import { StatusCodes } from "../constants/StatusCodes.js";
import { PlayerUtils } from "../utils/PlayerUtils.js";

import { GameState } from "../core/GameControllerV2.js";
import { GameRules } from "./GameRules.js";

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

    // check if the selected resources are valid
    if (!GameRules.isValidYOPSelection(payload.selectedResources)) {
      return {
        status: StatusCodes.ERROR,
        message: 'Invalid resource selection for Year of Plenty. Please select 2 resources that you have the right to receive.'
      };
    }

    // add resources to player's inventory
    PlayerUtils.addResources(currentPlayer, payload.selectedResources);

    // mark the card as played
    payload.devCard.played = true;

    // boradcast the resource gain to all players (for UI update purposes)
    gameController._broadcast({
      type: 'WAITING_FOR_ACTION',
      payload: {
        phase: gameController.gameContext.currentState,
        activePlayerId: gameController.gameContext.currentPlayerId,
      }
    })
  },
};