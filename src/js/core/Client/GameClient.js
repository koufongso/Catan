import { GameRenderer } from "../../rendering/GameRenderer.js";

export class GameClient{
    constructor(id, name, color, isAI){
        this.id = id;
        this.name = name;
        this.color = color;
        this.isAI = isAI;           // boolean indicating if this client is an AI, if ai, it will not need the uiRenderer
        this.gameController = null;
        this.gameState = null;      // will hold the latest game state
        this.gameContext = null;
        // this.uiRenderer = isAI ? null : new GameRenderer(); // only create UI renderer for human players
    }

    /**
     * Subscribe to game state updates from the GameController
     * @param {*} gameController 
     */
    subscribeToGame(gameController) {
        this.gameController = gameController;
        this.gameController.subscribe(this, this.onGameStateUpdate.bind(this));
    }

    onGameStateUpdate(updatePacket) {
        // Update the local game state
        this.gameContext = updatePacket.gameContext;
        console.log(`Client ${this.id} received game state update:`, this.gameContext);
    }

    

    

}