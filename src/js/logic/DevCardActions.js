// logic/DevCardActions.js
import { DEV_CARD_TYPES } from "../constants/DevCardTypes.js";
import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";
import { StatusCodes } from "../constants/StatusCodes.js";
import { PlayerUtils } from "../utils/PlayerUtils.js";
import { MapUtils } from "../utils/MapUtils.js";
import { HexUtils } from "../utils/HexUtils.js";

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

  [DEV_CARD_TYPES.ROAD_BUILDING]: (gameController, payload) => {
    const playerId = payload.playerId;
    console.log("Road Building card played with build stack:", payload.buildStack);
    // check if there are only 2 roads in the build stack
    let countRoads = 0;
    payload.buildStack.forEach(build => {
      if (build.type === 'ROAD') {
        countRoads++;
        if (countRoads > 2) {
          console.error("Too many roads in build stack for Road Building card. Only 2 roads are allowed.");
          return {
            status: StatusCodes.ERROR,
            message: 'Too many roads in build stack for Road Building. Only 2 roads are allowed.'
          };
        }
      } else {
        console.error("Invalid build type in build stack for Road Building. Only roads are allowed.");
        return {
          status: StatusCodes.ERROR,
          message: 'Invalid build type in build stack for Road Building. Only roads are allowed.'
        };
      }
    });

    if (countRoads !== 2) {
      console.error("Too many roads in build stack for Road Building card. Only 2 roads are allowed.");
      return {
        status: StatusCodes.ERROR,
        message: 'No roads in build stack for Road Building. Please add up to 2 roads to the build stack.'
      };
    }

    // check if the build stack is valid according to game rules
    const isValidBuild = GameRules.isValidBuild(gameController.gameContext.gameMap, gameController.gameContext.currentPlayerId, payload.buildStack, 'ROAD_ONLY');
    if (!isValidBuild) {
      return {
        status: StatusCodes.ERROR,
        message: 'Invalid build stack for Road Building. Please ensure the roads are placed in valid locations according to the game rules.'
      };
    }

    // pass check, add the roads to the player's inventory
    payload.buildStack.forEach(building => {
      MapUtils.updateRoad(gameController.gameContext.gameMap, building.coord, playerId);
      PlayerUtils.addRoad(gameController.gameContext.players.find(p => p.id === playerId), HexUtils.coordToId(building.coord));
    });
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

  [DEV_CARD_TYPES.MONOPOLY]: (gameController, payload) => {
    const playerId = payload.playerId;
    const selectedResource = payload.selectedResource;

    // check if the selected resource is valid
    if (!Object.values(RESOURCE_TYPES).includes(selectedResource)) {
      return {
        status: StatusCodes.ERROR,
        message: 'Invalid resource selection for Monopoly. Please select a valid resource type.'
      };
    }

    // iterate through all players and steal the target resource
    const playerInstance = gameController.gameContext.players.find(p => p.id === playerId);

    gameController.gameContext.players.forEach(player => {
      if (player.id !== playerId) {
        const amountToSteal = player.resources[selectedResource];
        if (amountToSteal > 0) {
          PlayerUtils.deductResources(player, { [selectedResource]: amountToSteal }); // remove resources from other player
          PlayerUtils.addResources(playerInstance, { [selectedResource]: amountToSteal }); // add resources to current player
        }
      }
    });

    // mark the card as played
    payload.devCard.played = true;

    // boardcast the resource gain to all players (for UI update purposes)
    gameController._broadcast({
      type: 'WAITING_FOR_ACTION',
      payload: {
        phase: gameController.gameContext.currentState,
        activePlayerId: gameController.gameContext.currentPlayerId,
      }
    })
  
  }
};