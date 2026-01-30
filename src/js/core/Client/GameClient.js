export class GameClient{
    constructor(playerId, isAI){
        this.playerId = playerId;
        this.isAI = isAI;           // boolean indicating if this client is an AI, if ai, it will not need the uiRenderer
        this.gameController = null;
        this.gameState = null; // will hold the latest game state
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
        this.gameState = updatePacket.gameContext;
        console.log(`Client ${this.playerId} received game state update:`, this.gameState);

    }

    

    

}