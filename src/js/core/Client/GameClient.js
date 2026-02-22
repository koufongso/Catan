import { GameRenderer } from "./GameRenderer.js";
import { InputManager } from "./InputManager.js";
import { GameRules } from "../../logic/GameRules.js";

// constants
import { DEV_CARD_TYPES } from "../../constants/DevCardTypes.js";
import { RESOURCE_TYPES } from "../../constants/ResourceTypes.js";

// utils
import { PlayerUtils } from "../../utils/PlayerUtils.js";
import { DevCardUtils } from "../../utils/DevCardUtils.js";


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

    async onGameStateUpdate(updatePacket) {
        // Update the local game state
        this.gameContext = updatePacket.gameContext;
        console.log(`Client ${this.id} received game state update:`, updatePacket);

        if (!this.isHuman) {
            console.warn(`AI Client ${this.id} logic not implemented yet.`);
            return;
        }
        console.log(`client ${this.id} this.pendingRobberResultCallback: ${this.pendingRobberResultCallback}`);
        if (this.pendingRobberResultCallback) {
            // If there is a pending callback for robber placement result, call it with the update packet
            await this.pendingRobberResultCallback(updatePacket);
            console.log(`client ${this.id} finished handling pending robber result callback.`);
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


    handleWaitingForAction(payload) {
        switch (payload.phase) {
            case 'INITIAL_PLACEMENT1':
            case 'INITIAL_PLACEMENT2':
            case 'INITIAL_PLACEMENT':
                this.inputManager.activateInitialPlacementMode(this.id, this.gameContext.gameMap, this.color);
                break;
            case 'DISCARD':
                const currentResources = this.gameContext.players.find(p => p.id === this.id).resources;
                this.inputManager.activateDiscardMode(this.id, currentResources, payload.numberToDiscard);
                break;
            case 'MOVE_ROBBER':
                // compute robbable tiles
                this.inputManager.activateRobberPlacementMode(this.id, this.gameContext.gameMap, 'ROBBER_PLACEMENT', false);
                break;
            case 'ROLL':
                this.inputManager.deactivateAllBtns(); // clear all buttons first
                this.inputManager.activateBtn('btnRoll');
                this.inputManager.activateDevCards();
                break;
            case 'MAIN':
                this.inputManager.deactivateAllBtns();
                this.inputManager.activateDevCards();
                this.inputManager.activateBtn('btnBuildRoad');
                this.inputManager.activateBtn('btnBuildSettlement');
                this.inputManager.activateBtn('btnBuildCity');
                this.inputManager.activateBtn('btnTrade');
                this.inputManager.activateBtn('btnBuyDevCard');
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

    submitBuild(buildStack, mode) {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }
        // quick check buildStack validity and compute total cost
        if (buildStack.length === 0) {
            return; // allow empty submission to exit road building mode
        }

        let totalCost = {};
        let cost = {}
        switch (mode) {
            case "BUILD_ROAD":
                cost = GameRules.getRoadCost();
                break;
            case "BUILD_SETTLEMENT":
                cost = GameRules.getSettlementCost();
                break;
            case "BUILD_CITY":
                cost = GameRules.getCityCost();
                break;
            default:
                throw new Error(`Invalid mode for submitBuild: ${mode}`);
        }

        const validType = ['ROAD', 'SETTLEMENT', 'CITY'];
        for (let build of buildStack) {
            if (!validType.includes(build.type)) {
                console.error(`Invalid build type in buildStack for submitBuildRoad: ${build.type}`);
                return;
            }

            for (let [resource, amount] of Object.entries(cost)) {
                totalCost[resource] = (totalCost[resource] || 0) + amount;
            }
        }


        // check if has enough resources to build the roads
        let player = this.gameContext.players.find(p => p.id === this.id);


        if (!PlayerUtils.canAfford(player, totalCost)) {
            console.warn(`Player ${this.id} cannot afford to build roads with total cost:`, totalCost);
            return;
        }

        this.gameController.inputEvent({ type: mode, payload: { playerId: this.id, buildStack: buildStack } });
    }



    submitDiscardResources(selectedResources) {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }

        if (GameRules.isDiscardValid(this.gameContext.players.find(p => p.id === this.id).resources, selectedResources)) {
            this.gameController.inputEvent({ type: 'DISCARD', payload: { playerId: this.id, discardedResources: selectedResources } });
        } else {
            throw new Error("Invalid discard resources submitted.");
        }
    }

    /**
     * Send the robber placement result to the GameController, and set up a pending callback to handle the result update (success or error)
     * @param {*} robStack 
     * @param {*} actionType 'MOVE_ROBBER' or 'ACTIVATE_KNIGHT_CARD', they have the same payload but different handling in the GameController
     * @returns 
     */
    submitRobberPlacement(robStack, actionType) {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }
        this._pendingAfterRobberPlacement(); // set up pending callback to handle the result update after submitting the robber placement

        console.log(`Submitting robber placement with robStack:`, robStack);
        this.gameController.inputEvent({ type: actionType, payload: { playerId: this.id, robStack: robStack } });
    }

    // only for visual effect
    _pendingAfterRobberPlacement() {
        if (this.isHuman) {
            this.pendingRobberResultCallback = async (updatePacket) => {
                console.log("Robber placement result update packet:", updatePacket);

                if (!(updatePacket.event.type === 'MOVE_ROBBER_ERROR' && updatePacket.event.payload.playerId === this.id)) {
                    // If it's not an error related to this player's robber placement
                    // execute move robber animation
                    //  TODO: execute steal resource animation if applicable
                    await this.uiRenderer.animateMoveRobberToTile(this.gameContext.gameMap.robberCoord);
                } else {
                    console.error("Robber placement failed:", updatePacket.event.payload.message);
                }

                // clear no matter success or failure
                this.pendingRobberResultCallback = null;
            };
        }
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


    btnEndTurnOnClick() {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }
        this.inputManager._clearInteractionLayer(); // clear any interaction layer (e.g. road building highlights)
        this.gameController.inputEvent({ type: 'END_TURN', payload: { playerId: this.id } });
    }

    btnBuildRoadOnClick() {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }

        this.inputManager.activateBuildingMode(this.id, this.gameContext.gameMap, this.color, 'BUILD_ROAD');
    }

    btnBuildSettlementOnClick() {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }

        this.inputManager.activateBuildingMode(this.id, this.gameContext.gameMap, this.color, 'BUILD_SETTLEMENT');
    }

    btnBuildCityOnClick() {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }

        this.inputManager.activateBuildingMode(this.id, this.gameContext.gameMap, this.color, 'BUILD_CITY');
    }

    btnBuyDevCardOnClick() {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }

        // check if can afford dev card
        let player = this.gameContext.players.find(p => p.id === this.id);

        const devCardCost = GameRules.getDevCardCost();
        if (!PlayerUtils.canAfford(player, devCardCost)) {
            console.warn(`Player ${this.id} cannot afford to buy a development card with cost:`, devCardCost);
            return;
        }

        // check if dev cards are available in the bank
        // TODO: better interface managment of dev card deck
        if (this.gameContext.devCardDeck.cards.length <= 0) {
            console.warn(`No development cards left in the bank.`);
            return;
        }

        this.gameController.inputEvent({ type: 'BUY_DEV_CARD', payload: { playerId: this.id } });
    }

    /**
     * Client side handle activate dev card
     * @param {*} cardType 
     * @returns 
     */
    handleActivateDevCard(cardType) {
        //1. collect required info for each card type
        switch (cardType) {
            case DEV_CARD_TYPES.KNIGHT:
                // move robber routine
                // TODO: add a wrapper function for the knight card logic to make it cleaner
                this.inputManager.activateRobberPlacementMode(this.id, this.gameContext.gameMap, 'ACTIVATE_DEV_CARD_KNIGHT', true);
                break;
            case DEV_CARD_TYPES.YEAR_OF_PLENTY:
                // activate resource selection UI and wait for player to select resources, then submit the selected resources to the controller
                this.inputManager.activateYOPSelectionMode();
                break;
            case DEV_CARD_TYPES.ROAD_BUILDING:
                // activate road building mode, but allow building 2 roads for free (no resource cost, and can build 2 roads in one submission)
                this.inputManager.activateBuildingMode(this.id, this.gameContext.gameMap, this.color, 'DEV_CARD_ROAD_BUILDING');
                break;
            case DEV_CARD_TYPES.MONOPOLY:
                // activate resource selection UI for monopoly card, then submit the selected resource type to the controller
                this.inputManager.activateMonopolySelectionMode();
                break;
            default:
                console.warn(`Dev card type ${cardType} activation not implemented yet.`);
        }
    }

    /**
     * Send dev card activation request to the controller
     * @param {*} cardType 
     * @param {*} additionalPayload payload specify by the card type other than player id 
     * @returns 
     */
    submitActivateDevCard(cardType, additionalPayload) {
        if (this.gameController === null) {
            console.error("GameController not connected.");
            return;
        }

        // setup pending callback if needed (e.g. for knight card to handle the result of robber placement)
        // or prelimiary check before submission (e.g. for year of plenty to check if the selected resources are valid)
        switch (cardType) {
            case DEV_CARD_TYPES.KNIGHT:
                if (!additionalPayload.robStack) {
                    console.error("Robber placement stack is required for activating Knight card.");
                    return;
                }
                this._pendingAfterRobberPlacement(); // set up pending callback to handle the result update after submitting the robber placement for knight card
                break;
            case DEV_CARD_TYPES.YEAR_OF_PLENTY:
                // the validity of the selected resources should have been checked in the input manager before submission, but do a quick check here as well
                if (!GameRules.isValidYOPSelection(additionalPayload.selectedResources)) {
                    console.error('Invalid resource selection for Year of Plenty:', additionalPayload.selectedResources);
                    return;
                }
            case DEV_CARD_TYPES.ROAD_BUILDING:
                 // no pending callback or additional payload needed for road building card, the input manager will handle the road building logic and submission
                 if (!additionalPayload.buildStack || additionalPayload.buildStack.length != 2) {
                    console.log(`Invalid build stack for Road Building card activation:`, additionalPayload.buildStack);
                    console.error("Build stack with 2 roads is required for activating Road Building card.");
                    return;
                }
                 break;
            case DEV_CARD_TYPES.MONOPOLY:
                if (!additionalPayload.selectedResource || !Object.values(RESOURCE_TYPES).includes(additionalPayload.selectedResource)) {
                    console.error("Selected resource type is required for activating Monopoly card.");
                    return;
                }
            default:
                // no pending callback needed for other card types for now
                break;
        }

        console.log(`Submitting activate dev card with type ${cardType} and payload:`, additionalPayload);
        this.gameController.inputEvent({ type: 'ACTIVATE_DEV_CARD', payload: { playerId: this.id, cardType: cardType, ...additionalPayload } });
    }






}