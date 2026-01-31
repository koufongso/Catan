import { MenuUI } from "./MenuUI.js";
import { RNG } from "../utils/rng.js";
import { MapGenerator } from "../utils/map-generator.js";
import { GameMap } from "../models/GameMap.js";
import { GameClient } from "./Client/GameClient.js";
import { GameControllerV2 } from "./GameControllerV2.js";
import { PLAYER_COLORS } from "../constants/RenderingConstants.js";

export class GameServer {
    constructor() {
        this.gameController = null;
        this.ui = new MenuUI(this); // Manage settings/buttons via DOM
        this.rng = null;
        this.map = null;
        this.clients = [];
    }

    connectClient(client) {
        // Implement connection logic here
        this.clients.push(client);
        return Promise.resolve({ status: 'connected' });
    }

    // Starts a local game with the given configuration
    startLocalGame(gameConfig) {
        this.rng = new RNG(gameConfig.randomSeed || Date.now());

        // create map
        this.gameMap = MapGenerator.createNewMap(this.rng);

        // add AI player clients (assume human player is always player 0 and only 1 human player for local games)
        let playerId = 1;
        for (let i = 0; i < gameConfig.numAIPlayers; i++) {
            this.clients.push(new GameClient(playerId, `AI ${playerId}`, PLAYER_COLORS[playerId], true));
            playerId++;
        }

        // The GameController handles logic
        this.gameController = new GameControllerV2(this.rng, this.gameMap, gameConfig.numTotalPlayers);

        // Subscribe clients to the game controller so they can receive updates
        for (let client of this.clients) {
            client.subscribeToGame(this.gameController);
        }

        this.gameController.start();
    }
}