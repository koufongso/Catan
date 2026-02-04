import { GameRenderer } from "./GameRenderer.js";
import { InputManager } from "./InputManager.js";
import { DEBUG_FLAGS } from "../../constants/Config.js";
import { Player } from "../../models/Player.js";
import { DebugController } from "../debug/DebugController.js";
import { DebugDashboard } from "../debug/DebugDashboard.js";

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

        const activePlayerId = updatePacket.event.payload.activePlayerId;
        console.log(`Active Player ID: ${activePlayerId}, This Client ID: ${this.id}`);

        // update UI if this is the active player
        if (activePlayerId !== this.id) {
            return;
        }

        
        if (!this.mapInitialized) {// draw static board only once
            this.uiRenderer.initializeUI();
            this.inputManager.initalize();
            this.uiRenderer.drawStaticBoard(this.gameContext.gameMap);
            this.mapInitialized = true;
        }

        // update gameState
        this.uiRenderer.refreshGameState(this.gameContext, this.id);




        // For human players, render according to the event type
        switch (updatePacket.event.type) {
            case 'WAITING_FOR_INPUT': // we define input as some request from the controller/server that user need to respond to like initial placement, discarding cards, etc
                this.handleWaitingForInput(updatePacket.event.payload);
                break;
            case 'WAITING_FOR_ACTION': // we deinfe action as click btuttons like roll, build, play card, trade etc
                // ROLL phase: roll, play dev card
                // MAIN phase: build, trade, play dev card, end turn
                console.log(`Client ${this.id} handling WAITING_FOR_ACTION phase: ${updatePacket.event.payload.phase}`);
                this.handleWaitingForAction(updatePacket.event.payload);
                break;
            default:
                // maybe waiting for other players
                console.log(`Client ${this.id} received event type: ${updatePacket.event.type}`);
        }
    }


    /* ----------------------------------------------------Handle updates from GameController---------------------------------------------------- */
    handleWaitingForInput(payload) {
        switch (payload.phase) {
            case 'INITIAL_PLACEMENT':
                this.inputManager.activateInitialPlacementInteractionLayer(this.id, this.gameContext.gameMap, this.color);
                break;

            default:
                console.warn(`Unhandled phase in handleWaitingForInput: ${payload.phase}`);
        }
    }


    handleWaitingForAction(payload) {
        switch (payload.phase) {
            case 'ROLL':
                this.inputManager.deactivateAllBtns(); // clear all buttons first
                this.inputManager.activateBtn('btnRoll');
                this.inputManager.activateDevCards();
                break;  
            case 'MAIN':    
                this.inputManager.deactivateAllBtns();
                this.inputManager.activateBtn('btnBuild');
                this.inputManager.activateBtn('btnEndTurn');
                break;
            default:
                console.warn(`Unhandled phase in handleWaitingForAction: ${payload.phase}`);
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

        this.gameController.inputEvent({ type: 'INITIAL_PLACEMENT', payload: { playerId: this.id, buildStack: buildStack } });
    }



    /* ---------------------------------------------------- button handlers ---------------------------------------------------- */
    btnRollOnClick() {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }
        console.log(`Client ${this.id} clicked Roll Dice button.`);
        this.gameController.inputEvent({ type: 'ROLL', payload: { playerId: this.id } });
    }


    btnBuildOnClick() {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }

        this.inputManager.activateBuildInteractionLayer(this.id, this.gameContext.gameMap, this.color);
    }


    btnEndTurnOnClick() {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }
        this.gameController.inputEvent({ type: 'END_TURN', payload: { playerId: this.id } });
    }




}