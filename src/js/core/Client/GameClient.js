import { GameRenderer } from "./GameRenderer.js";
import { InputManager } from "./InputManager.js";
import { DEBUG_FLAGS } from "../../constants/Config.js";

export class GameClient {
    constructor(id, name, color, isHuman) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.isHuman = isHuman;           // boolean indicating if this client is an AI, if ai, it will not need the uiRenderer
        this.gameController = null;
        this.gameState = null;      // will hold the latest game state
        this.gameContext = null;
        this.uiRenderer = isHuman ? new GameRenderer() : null; // only create UI renderer for human players
        this.inputManager = isHuman ? new InputManager(this) : null; // only create input manager for human players

        this.mapInitialized = false;
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
        console.log(`Client ${this.id} received game state update:`, updatePacket);

        if (!this.isHuman) {
            console.warn(`AI Client ${this.id} logic not implemented yet.`);
            return;
        }

        // For human players, render according to the event type
        switch (updatePacket.event.type) {
            case 'WAITING_FOR_INPUT':
                this.handleWaitingForInput(updatePacket.event.payload);
                break;
            case 'WAITING_FOR_PLAYER_0_ROLL':
                // roll, play dev card
                break;
            case 'WAITING_FOR_PLAYER_1_ACTION':
                // build, trade, play dev card, end turn, etc.
                break;
            default:
                // maybe waiting for other players
                console.log(`Client ${this.id} received event type: ${updatePacket.event.type}`);
        }
    }


    /* ----------------------------------------------------Handle updates from GameController---------------------------------------------------- */
    handleWaitingForInput(payload) {
        switch (payload.phase) {
            case 'INITIAL_PLACEMENT1':
                // draw map for initial placement
                if (!this.mapInitialized) {
                    if (DEBUG_FLAGS.HOTSEAT_MODE && payload.activePlayerId !== this.id) {
                        // use hotseat mode, and not the active palyer, skip drawing the map
                        console.log("HOTSEAT MODE: Drawing map for all players on one machine.");
                    } else {
                        let playerColors = {};
                        for (let player of this.gameContext.players) {
                            playerColors[player.id] = player.color;
                        }
                        this.uiRenderer.drawMap(this.gameContext.gameMap, playerColors);
                        this.mapInitialized = true;
                    }
                }

                // only activate input for the active player
                if (payload.activePlayerId === this.id) {
                    // start initial placement process
                    this.inputManager.activateInitialPlacementInteractionLayer(this.id, this.gameContext.gameMap, this.color);
                }
                break;

            default:
                console.warn(`Unhandled phase in handleWaitingForInput: ${payload.phase}`);
        }
    }

    /*----------------------------------------------------ACTION INPUT METHODS----------------------------------------------------*/
    submitInitialPlacement(buildStack) {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }
        // quick check buildStack validity
        // 1. must have length 2
        if (buildStack.length !== 2) {
            console.error(`Invalid buildStack length for initial placement: ${buildStack.length}`);
            return;
        }
        // 2. first must be settlement, second must be road
        if (buildStack[0].type !== 'SETTLEMENT' || buildStack[1].type !== 'ROAD') {
            console.error(`Invalid buildStack types for initial placement: ${buildStack[0].type}, ${buildStack[1].type}`);
            return;
        }

        // 3. (Skip for now) check if the locations are valid according to game rules

        this.gameController.inputEvent({ type: 'INITIAL_PLACEMENT1', payload: { playerId: this.id, buildStack: buildStack } });
    }





}