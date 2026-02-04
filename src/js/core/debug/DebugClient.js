import { DebugDashboard } from "./DebugDashboard.js";
import { DebugController } from "./DebugController.js";

// this is a special class for debugging
export class DebugClient{
    constructor(debugClient){
        this.debugDashboard = null;     // update/render the debug dashboard
        this.debugController = null;    // process debug commands and update game state in game controller
        this.gameController = null;    // reference to the game controller
        this.gameContext = null;
    }


    subscribeToGame(gameController){
        this.gameController = gameController;
        this.gameController.subscribe(this, this.onGameStateUpdate.bind(this));

        this.debugController = new DebugController(this)
        this.debugDashboard = new DebugDashboard(this.debugController); // no uiRenderer needed
    }

    onGameStateUpdate(updatePacket){
        // Update the local game state
        console.log(`DebugClient received game state update:`, updatePacket);
        this.gameContext = updatePacket.gameContext; // save full game context

        // render the debug HUD
        this.updateDashboard(`Game State Updated: Event - ${updatePacket.event.type}`);
    }

    updateDashboard(message){
        this.debugDashboard.renderDebugHUD(this.gameContext, message);
    }
}