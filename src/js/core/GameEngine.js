import { MenuUI } from "./MenuUI.js";
import { RNG } from "../utils/rng.js";
import { MapGenerator } from "../utils/map-generator.js";
import { GameMap } from "../models/GameMap.js";
import { GameClient } from "./Client/GameClient.js";
import { GameControllerV2 } from "./GameControllerV2.js";

export class GameEngine {
    constructor() {
        this.gameController = null;
        this.ui = new MenuUI(this); // Manage settings/buttons via DOM
        this.rng = null;
        this.map = null;
    }

    /** Called when 'Start Game' is clicked in the UI */
    startGame(gameConfig) {
        this.rng = new RNG(gameConfig.randomSeed || Date.now());

        // create map
        this.gameMap = MapGenerator.createNewMap(this.rng);

        // create clients
        // add human player client
        let playerId = 0;
        let PLAYER_COLORS = ['rgba(255,0,0,1)', 'rgb(255, 136, 0)', 'rgb(0, 162, 255)', 'rgb(209, 209, 206)'];
        this.clients = [];
        for (let i = 0; i < gameConfig.numHumanPlayers; i++) {
            this.clients.push(new GameClient(playerId, gameConfig.playerName, PLAYER_COLORS[playerId], false));
            playerId++;
        }


        // add AI player clients
        for (let i = 0; i < gameConfig.numAIPlayers; i++) {
            this.clients.push(new GameClient(playerId, `AI ${playerId}`, PLAYER_COLORS[playerId], true));
            playerId++;
        }

        // The GameController handles logic
        this.gameController = new GameControllerV2(this.rng, this.gameMap, gameConfig.numTotalPlayers);

        // Subscribe clients to the game controller
        for (let client of this.clients) {
            client.subscribeToGame(this.gameController);
        }


        this.gameController.start();
    }
}

const gameEngine = new GameEngine();
