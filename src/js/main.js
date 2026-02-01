// entry point for the application

import { MenuUI } from "./core/MenuUI.js";
import { GameServer } from "./core/GameServer.js";
import { GameClient } from "./core/Client/GameClient.js";
import { PLAYER_COLORS } from "./constants/RenderingConstants.js";

const menu = new MenuUI();
let gameServer = null;
let myClient = null;

menu.onStartGame = async () => {
    let gameConfig = menu.getConfigInfo();
    gameConfig.isLocal = true; // for now, only local games are supported


    // create the server interface
    if (gameConfig.isLocal) {
        // Create the "Server" right here in the browser memory
        gameServer = new GameServer(gameConfig);

        // Now create the local player's client
        gameConfig.playerId = 0; // In local mode, the first player is always player 0
        myClient = new GameClient(gameConfig.playerId, gameConfig.playerName, PLAYER_COLORS[gameConfig.playerId], true);

        // Connect the client to the "Server"
        const connection = await gameServer.connectClient(myClient);

        if (connection.status === 'connected') {
            console.log("Client connected to server.");
            console.log("Waiting for server to start the game...");
        }

        gameServer.startLocalGame(gameConfig);
        menu.removeMenu();
    } else {
        // TODO: connect to remote server
        console.warn("Connecting to remote server... (not implemented)");
        return;
    }


};