import { DEV_CARD_TYPES } from "../../constants/DevCardTypes.js";

export const DevCardEffects = {
  
  [DEV_CARD_TYPES.KNIGHT]: (gameController) => {
    // Logic: Move Robber
    console.log("Knight played: Switching to Robber State");
    const currentPlayer = gameController.getCurrentPlayer();
    currentPlayer.achievements.knightsPlayed++;
    gameController.updateLargestArmy();  // check for largest army update
    gameController.activateRobber(gameController.gameContext.currentState);    // start robber move process, need to return to current state after completion
  }
};