import { StatusCodes } from "../constants/StatusCodes.js";
import { INITIAL_BANK_RESOURCES } from "../constants/GameRuleConstants.js";

import { BuildingPredictor } from "../utils/BuildingPredictor.js";
import { GameRules } from "../logic/GameRules.js";
import { GameClient } from "./client/GameClient.js";
import { DebugClient } from "./debug/DebugClient.js";
import { Dice } from "../core/Dice.js";
// factories
import { createDevCardDeck } from "../factories/deckFactory.js";
import { createPlayer } from "../factories/playerFactory.js";
// uitls
import { HexUtils } from "../utils/HexUtils.js";
import { PlayerUtils } from "../utils/PlayerUtils.js";
import { MapUtils } from "../utils/MapUtils.js";
import { DevCardDeckUtils } from "../utils/DeckUtils.js";
import {DevCardUtils} from "../utils/DevCardUtils.js";

// logic
import { DevCardEffects } from "../logic/DevCardActions.js";


export const GameState = Object.freeze({
    IDLE: 'IDLE', // wait for start
    INITIAL_PLACEMENT1: 'INITIAL_PLACEMENT1', // wait for first settlement and road placements
    INITIAL_PLACEMENT2: 'INITIAL_PLACEMENT2', // wait for second settlement and road placements
    ROLL: 'ROLL',                           // wait for current player to roll dice

    // sub-states for when 7 is rolled
    DISCARD: 'DISCARD',                     // wait for players to discard if over 7 cards, advance when all done
    MOVE_ROBBER: 'MOVE_ROBBER',             // wait for current player to move robber
    ROB_PLAYER: 'ROB_PLAYER',               // wait for current player to select a player to rob

    // for main game loop
    MAIN: 'MAIN', // main game loop: build, trade, end turn

    GAME_OVER: 'GAME_OVER' // game has ended
});


export class GameControllerV2 {
    constructor(rng, gameMap, expectedTotalPlayers) {
        this.rng = rng;

        // clients that listen to game state changes
        this.listeners = new Map();
        this.expectedTotalPlayers = expectedTotalPlayers;
        this.dice = new Dice(this.rng);

        this.gameContext = {
            /* -------------public game context properties ------------- */
            // game status properties
            totalPlayers: expectedTotalPlayers,
            currentPlayerIndex: null,
            currentPlayerId: null,
            turnNumber: 0,
            currentState: GameState.IDLE,

            // game components (all plain data, no methods)
            gameMap: gameMap,
            bankResources: null,

            // robber properties
            stateAfterRob: null,
            playersToDiscard: [], // array of Player objects that needs to discard resources due to robbers

            // achievement tracking
            playerWithLongestRoad: null,
            playerWithLargestArmy: null,

            /* -------------private game context properties ------------- */
            devCardDeck: createDevCardDeck(this.rng),
            players: [], // array of Player objects
        }
    }


    /**
     *  Clients register here to get updates.
     * @param {Function} callback - Function to run when state changes
     */
    subscribe(client, callback) {
        if (client instanceof GameClient) {
            console.log(`Subscribing GameClient ${client.id} to GameController`);
            this.gameContext.players.push(createPlayer(client.id, client.name, client.color));
            this.listeners.set(client.id, callback);
        } else if (client instanceof DebugClient) {
            console.log(`Subscribing DebugClient to GameController`);
            this.listeners.set('DEBUG_CLIENT', callback);
        }
    }


    /**
    * Publish a event with the current game state to all listeners.
    * @param {Object} event - Optional event details
    * (e.g. { type: 'TURN_CHANGE', playerId: 1, action: 'BUILD_ROAD' })
    */
    _broadcast(event = null) {
        this.listeners.forEach((callback, playerId) => {
            let publicGameContext = null;
            if (playerId === 'DEBUG_CLIENT') {
                // debug client gets full game context
                publicGameContext = this._serializeState(true, null);
            } else {
                publicGameContext = this._serializeState(false, playerId);
            }

            // 2. Create the Update Packet
            const updatePacket = {
                event: event,                    // The Signal
                gameContext: publicGameContext, // The Data
            };

            // callback(updatePacket);
            callback(updatePacket);
        });
    }


    /**
     * Serialize the current game state, removing any private information.
     * @param {boolean} showAll - If true, includes all private info (god mode, sfor debugging)
     * @param {string|null} viewingPlayerId - Only aplly when showAll is false. The ID of the player viewing the state (to keep their own info visible)
     * if null, all private info is hidden.
     * @returns {Object} - The serialized game state
     */
    _serializeState(showAll = false, viewingPlayerId = null,) {
        const gameContextCopy = structuredClone(this.gameContext); // deep clone, only keep data (no methods)

        // hide dev cards in deck
        gameContextCopy.devCardDeck.devCards = null;
        // replace with count only
        gameContextCopy.devCardDeckCount = DevCardDeckUtils.getCount(this.gameContext.devCardDeck);

        // replaced with Sanitize player info
        gameContextCopy.players = this.gameContext.players.map(player => {
            console.log(`Serializing player ${player.id} for viewingPlayerId ${viewingPlayerId} with showAll=${showAll}`);
            return PlayerUtils.serialize(player, !showAll && player.id !== viewingPlayerId);
        });

        return gameContextCopy;
    }

    start() {
        // check if clients are ready
        const numberOfPlayers = this.gameContext.players.length;
        if (numberOfPlayers !== this.expectedTotalPlayers) {
            throw new Error(`Cannot start game: expected ${this.expectedTotalPlayers} clients, but got ${numberOfPlayers}`);
        }

        // set first player
        this.gameContext.currentPlayerIndex = 0;
        this.gameContext.currentPlayerId = this.gameContext.players[0].id;

        // initialize bank resources
        this.gameContext.bankResources = structuredClone(INITIAL_BANK_RESOURCES);

        // change state to first placement
        this.gameContext.currentState = GameState.INITIAL_PLACEMENT1;

        // broadcast initial state
        const event = {
            type: 'WAITING_FOR_ACTION',
            payload: {
                phase: 'INITIAL_PLACEMENT',
                activePlayerId: this.gameContext.currentPlayerId,
            } // expectedResponse: [{'SETTLEMENT':null}, {'ROAD':null}]
        }

        this._broadcast(event);
    }


    // main game loop methods would go here
    async inputEvent(event) {
        console.log(`State: ${this.gameContext.currentState} | Event: ${event.type}`);
        let res = {
            status: StatusCodes.ERROR
        };

        switch (this.gameContext.currentState) {
            case GameState.INITIAL_PLACEMENT1:
                // handle first settlement placement events
                res = this.handleStateInitialPlacement1(event);
                break;
            case GameState.INITIAL_PLACEMENT2:
                // handle second settlement placement events
                res = this.handleStateInitialPlacement2(event);
                break;
            case GameState.ROLL:
                // handle roll events
                res = this.handleStateRoll(event);
                break;
            case GameState.MAIN:
                // handle main game loop events
                res = this.handleStateMain(event);
                break;
            case GameState.DISCARD:
                res = this.handleStateDiscard(event);
                break;
            case GameState.MOVE_ROBBER:
                // handle move robber events
                res = this.handleStateMoveRobber(event);
                break;
            default:
                throw new Error(`Unknown game state: ${this.gameContext.currentState}`);
        }


        return res;
    }


    /*-------------------------------------------------------State Handlers-------------------------------------------------------*/

    handleStateInitialPlacement1(event) {
        const validationResult = this._validateRequest(event, 'INITIAL_PLACEMENT');
        if (validationResult.status === StatusCodes.ERROR) {
            return validationResult;
        }

        const playerId = event.payload.playerId;
        const buildStack = event.payload.buildStack; // array of build actions

        // validate buildStack
        const validationRes = this._validateAndApplyBuildStack(playerId, buildStack, "INITIAL_PLACEMENT");
        if (validationRes.status !== StatusCodes.SUCCESS) {
            return validationRes;
        }

        // advance
        // 1. if current player is the last player, move to next state
        if (this.gameContext.currentPlayerIndex === this.gameContext.totalPlayers - 1) {
            this.gameContext.currentState = GameState.INITIAL_PLACEMENT2;
            // set current player to last player (will reverse order in next state)
            this.gameContext.currentPlayerId = this.gameContext.players[this.gameContext.currentPlayerIndex].id;
        } else {
            // 2. else, move to next player (update index and id)
            this._nextPlayer();
        }

        const newEvent = {
            type: 'WAITING_FOR_ACTION',
            payload: {
                phase: 'INITIAL_PLACEMENT',
                activePlayerId: this.gameContext.currentPlayerId,
            } // expectedResponse: [{'SETTLEMENT':null}, {'ROAD':null}]
        };
        this._broadcast(newEvent);
    }



    handleStateInitialPlacement2(event) {
        const validationResult = this._validateRequest(event, 'INITIAL_PLACEMENT');
        if (validationResult.status === StatusCodes.ERROR) {
            return validationResult;
        }

        const playerId = event.payload.playerId;
        const buildStack = event.payload.buildStack; // array of build actions

        // validate buildStack
        const validationRes = this._validateAndApplyBuildStack(playerId, buildStack, "INITIAL_PLACEMENT");
        if (validationRes.status !== StatusCodes.SUCCESS) {
            return validationRes;
        }

        // distribute resources for second settlement
        const player = this.gameContext.players.find(p => p.id === playerId);
        const settlementCoord = buildStack[0].coord;
        const resourceTiles = MapUtils.getTilesAtVertex(this.gameContext.gameMap, settlementCoord);
        for (const tile of resourceTiles) {
            const resourceType = GameRules.getTileProduction(tile, this.gameContext.gameMap, false);
            if (resourceType === null) continue; // skip if tile does not produce resources (e.g. desert)
            PlayerUtils.addResources(player, { [resourceType]: 1 });
            console.log(`Player ${playerId} received 1 ${resourceType} from initial settlement at ${settlementCoord}`);
            this.gameContext.bankResources[resourceType] -= 1;
        }


        // update last settlement placed
        // advance
        // 1. if current player is the first player, move to next state
        if (this.gameContext.currentPlayerIndex === 0) {
            this.gameContext.currentState = GameState.ROLL;
            // set current player to last player (will reverse order in next state)
            this.gameContext.currentPlayerId = this.gameContext.players[this.gameContext.currentPlayerIndex].id;

            const newEvent = {
                type: 'WAITING_FOR_ACTION',
                payload: {
                    phase: 'ROLL',
                    activePlayerId: this.gameContext.currentPlayerId,
                } // expectedResponse: [{'SETTLEMENT':null}, {'ROAD':null}]
            };
            this._broadcast(newEvent);
        } else {
            // 2. else, move to previous player (update index and id)
            this._previousPlayer();
            const newEvent = {
                type: 'WAITING_FOR_ACTION',
                payload: {
                    phase: 'INITIAL_PLACEMENT',
                    activePlayerId: this.gameContext.currentPlayerId,
                } // expectedResponse: [{'SETTLEMENT':null}, {'ROAD':null}]
            };
            this._broadcast(newEvent);
        }
    }


    handleStateRoll(event) {
        const validationResult = this._validateRequest(event, ['ROLL', 'ACTIVATE_DEV_CARD']);
        if (validationResult.status === StatusCodes.ERROR) {
            return validationResult;
        }

        const playerId = event.payload.playerId;

        // roll dice
        switch (event.type) {
            case 'ROLL':
                const rollResult = this.dice.roll();
                console.log(`Player ${playerId} rolled a ${rollResult.sum} (${rollResult.values.join(' + ')})`);
                this._processRoll(rollResult.sum);
                break;
            case 'ACTIVATE_DEV_CARD':
                this._activateDevCard(playerId, event.payload);
                break;
            default:
                throw new Error(`Invalid event type ${event.type} for state ${this.gameContext.currentState}`);
        }
    }

    _processRoll(rolledNumber) {
        if (rolledNumber === 7) {
            // start robber sequence
            this.returnStateAfterRob = GameState.MAIN;
            this.discardInfo = []; // reset discard list
            this.discardInfo = GameRules.getDiscardInfo(this.gameContext);
            this._handleDiscardOrMoveRobber();
        } else {
            // distribute resources
            console.log(`Distributing resources for roll ${rolledNumber}`);
            this._distributeResourcesByRoll(rolledNumber);
            this.gameContext.currentState = GameState.MAIN;

            // broadcast turn change to MAIN phase
            const newEvent = {
                type: 'WAITING_FOR_ACTION',
                payload: {
                    phase: 'MAIN',
                    activePlayerId: this.gameContext.currentPlayerId,
                }
            };
            this._broadcast(newEvent);
        }
    }

    _activateDevCard(playerId, payload) {
        console.log(`Player ${playerId} is attempting to activate dev card with payload:`, payload);
        const cardType = payload.cardType;
        // validate dev card can be played
        const player = this.gameContext.players.find(p => p.id === playerId);
        console.log(`Player :`, player);
        const devCard = player.devCards.find(card => (card.type === cardType && DevCardUtils.isPlayable(card, this.gameContext.turnNumber)));
        if (!devCard) {
            console.error(`Player ${playerId} does not have a playable ${cardType} development card to activate.`);
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Player ${playerId} does not have a ${cardType} development card to play.`
            };
        }
        payload.devCard = devCard; // add the dev card object to the payload for easy access in the effect function
        
        // activate dev card effect
        console.log(`Activating dev card effect for ${cardType} with payload:`, payload);
        DevCardEffects[cardType](this, payload); // pass entire controller and the payload for generic interface
    }

    updateLargestArmy() {
        this.gameContext.players.forEach(player => {
            const armySize = player.achievements.knightPlayed;
            if (armySize >= 3) {
                if (!this.gameContext.playerWithLargestArmy || this.gameContext.players[this.gameContext.playerWithLargestArmy].achievements.knightPlayed < armySize) {
                    // no current largest army holder or current player has larger army than existing holder
                    this.gameContext.playerWithLargestArmy = player.id;
                }
            }
        });
    }

    handleStateMain(event) {
        const validationResult = this._validateRequest(event,
            ['BUILD_ROAD',
                'BUILD_SETTLEMENT',
                'BUILD_CITY',
                'TRADE',
                'BUY_DEV_CARD',
                'ACTIVATE_DEV_CARD',
                'END_TURN']);
        if (validationResult.status === StatusCodes.ERROR) {
            return validationResult;
        }

        const playerId = event.payload.playerId;
        switch (event.type) {
            case 'BUILD_ROAD':
            case 'BUILD_SETTLEMENT':
            case 'BUILD_CITY':
                // handle build road logic
                this._handleStateMainBuild(event, event.type);
                break;
            case 'BUY_DEV_CARD':
                this._handleStateMainBuyDevCard(event);
                break;
            case 'TRADE':
                // handle trade logic
                console.warn(`Player ${playerId} TRADE action not implemented yet.`);
                break;
            case 'ACTIVATE_DEV_CARD':
                // handle dev card activation logic
                this._activateDevCard(playerId, event.payload);
                break;
            case 'END_TURN':
                // handle end turn logic
                this._handleStateMainEndTurn(event);
                break;
            default:
                break;
        }
    }

    _handleStateMainBuild(event, eventType) {
        const validateResult = this._validateRequest(event, ['BUILD_ROAD', 'BUILD_SETTLEMENT', 'BUILD_CITY']);
        if (validateResult.status === StatusCodes.ERROR) {
            return validateResult;
        }

        const buildStack = event.payload.buildStack; // array of build actions
        const playerId = event.payload.playerId;
        const player = this.gameContext.players.find(p => p.id === playerId);
        if (buildStack.length === 0) {
            return {
                status: StatusCodes.ERROR,
                errorMessage: `No ${eventType.toLowerCase()}s provided in ${eventType} action.`
            }
        }

        // check resource 
        let totalCost = {};
        for (let build of buildStack) {
            switch (build.type) {
                case 'ROAD':
                    var cost = GameRules.getRoadCost('ROAD');
                    break;
                case 'SETTLEMENT':
                    var cost = GameRules.getSettlementCost('SETTLEMENT');
                    break;
                case 'CITY':
                    var cost = GameRules.getCityCost('CITY');
                    break;
            }

            for (let [resource, amount] of Object.entries(cost)) {
                totalCost[resource] = (totalCost[resource] || 0) + amount;
            }
        }

        if (!PlayerUtils.canAfford(player, totalCost)) {
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Player ${playerId} cannot afford to build ${buildStack.length} ${eventType.toLowerCase()}s. Required: ${JSON.stringify(totalCost)}.`
            }
        }

        // check placement rules
        switch (eventType) {
            case 'BUILD_ROAD':
                var mode = 'ROAD_ONLY'
                break;
            case 'BUILD_SETTLEMENT':
                var mode = 'SETTLEMENT_ONLY'
                break;
            case 'BUILD_CITY':
                var mode = 'CITY_ONLY'
                break;
        }

        const validateRes = this._validateAndApplyBuildStack(playerId, buildStack, mode);
        if (validateRes.status !== StatusCodes.SUCCESS) {
            return validateRes;
        }

        // apply cost
        PlayerUtils.deductResources(player, totalCost);

        // put resource back to bank
        this._addBankResource(totalCost);

        // broadcast update to all clients
        this._broadcast({
            type: 'WAITING_FOR_ACTION',
            payload: {
                phase: 'MAIN',
                activePlayerId: this.gameContext.currentPlayerId,
            }
        });
    }

    _handleStateMainBuyDevCard(event) {
        const validationResult = this._validateRequest(event, 'BUY_DEV_CARD');
        if (validationResult.status === StatusCodes.ERROR) {
            return validationResult;
        }

        // check if player can afford
        const playerId = event.payload.playerId;
        const player = this.gameContext.players.find(p => p.id === playerId);
        const cost = GameRules.getDevCardCost();
        console.log(`Player ${playerId} attempting to buy dev card. Cost: ${JSON.stringify(cost)}. Player resources: ${JSON.stringify(player.resources)}`);
        if (!PlayerUtils.canAfford(player, cost)) {
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Player ${playerId} cannot afford to buy a development card. Required: ${JSON.stringify(cost)}.`
            }
        }

        // check if dev cards are available
        console.log(`Checking if dev cards are available. Remaining: ${DevCardDeckUtils.getCount(this.gameContext.devCardDeck)}`);
        if (DevCardDeckUtils.getCount(this.gameContext.devCardDeck) <= 0) {
            return {
                status: StatusCodes.ERROR,
                errorMessage: `No development cards left in the deck.`
            }
        }

        // apply cost
        PlayerUtils.deductResources(player, cost);
        // put resource back to bank
        this._addBankResource(cost);

        // give player a dev card
        const devCard = DevCardDeckUtils.drawCard(this.gameContext.devCardDeck, this.gameContext.turnNumber);
        PlayerUtils.addDevCard(player, devCard);

        // broadcast update to all clients
        this._broadcast({
            type: 'WAITING_FOR_ACTION',
            payload: {
                phase: 'MAIN',
                activePlayerId: this.gameContext.currentPlayerId,
            }
        });

    }



    _handleStateMainEndTurn(event) {
        this._nextPlayer();
        this.gameContext.currentState = GameState.ROLL;
        this._broadcast({
            type: 'WAITING_FOR_ACTION',
            payload: {
                phase: 'ROLL',
                activePlayerId: this.gameContext.currentPlayerId,
            }
        });
    }


    /*------------------------------------------------------- Robber subroutine -------------------------------------------------------*/
    handleStateDiscard(event) {
        const validationResult = this._validateRequest(event, 'DISCARD');
        if (validationResult.status === StatusCodes.ERROR) {
            return validationResult;
        }

        // check if player is current discard player
        const requestDiscardPlayerId = event.payload.playerId;
        const currentDiscardPlayerId = this.discardInfo[0].playerId;


        // process discard
        // get the player instance
        const player = this.gameContext.players.find(p => p.id === requestDiscardPlayerId);
        const discardedResources = event.payload.discardedResources; // { 'WOOD': 2, 'BRICK': 1, ...}

        // validate discard
        if (!GameRules.isDiscardValid(player.resources, discardedResources)) {
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Invalid discard resources submitted by Player ${requestDiscardPlayerId}.`
            };
        }

        // apply discard
        PlayerUtils.deductResources(player, discardedResources);

        // return resources to bank
        this._addBankResource(discardedResources);

        // remove player from discard list
        this.discardInfo.shift();

        // check if more players need to discard
        this._handleDiscardOrMoveRobber();
    }

    handleStateMoveRobber(event) {
        const validationResult = this._validateRequest(event, ['ROBBER_PLACEMENT', 'ACTIVATE_DEV_CARD_KNIGHT']);
        if (validationResult.status === StatusCodes.ERROR) {
            console.error("Invalid MOVE_ROBBER request:", validationResult.errorMessage);
            return validationResult;
        }

        // validate input tile for robber placement
        // expected format: [{type: 'TILE', id: tileId}, {type: 'SETTLEMENT', id: vertexId}]
        // or [{type: 'TILE', id: tileId}] if no robbable settlement to rob on that tile
        const robStack = event.payload.robStack;
        if (!robStack || robStack.length < 1 || robStack[0].type !== 'TILE') {
            console.error("Invalid robStack format for MOVE_ROBBER:", robStack);
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Invalid robStack format for MOVE_ROBBER: ${JSON.stringify(robStack)}`
            };
        }

        const tileId = event.payload.robStack[0].id;
        const vertexId = event.payload.robStack[1] ? event.payload.robStack[1].id : null;

        const robbableTileIds = GameRules.getRobbableTiles(this.gameContext.gameMap).map(tile => tile.id);
        if (!robbableTileIds.includes(tileId)) {
            console.error(`MOVE_ROBBER validation error: tile id not valid ${tileId}`);
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Invalid tileId for MOVE_ROBBER: ${tileId} is not a valid tile to move the robber to.`
            };
        }

        // tile is valid, move robber, check for robbable settlements on that tile if applicable,
        const robbableSettlementIds = GameRules.getRobbableSettlementIds(this.gameContext.currentPlayerId, tileId, this.gameContext.gameMap);
        if (robbableSettlementIds.length > 0 && vertexId === null) {
            // can rob, but no settlement selected to rob
            console.error("MOVE_ROBBER validation error: settlement id not valid");
            return {
                status: StatusCodes.ERROR,
                errorMessage: `No settlement selected to rob on tile ${tileId}. Player must select a settlement to rob.`
            };
        }

        if (robbableSettlementIds.length === 0 && vertexId !== null) {
            // cnnot rob, but settlement id provided
            console.error("MOVE_ROBBER validation error: settlement id not valid");
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Invalid vertexId for MOVE_ROBBER: ${vertexId} is not a valid settlement to rob on tile ${tileId}.`
            };
        }

        if (robbableSettlementIds.length > 0 && vertexId && !robbableSettlementIds.includes(vertexId)) {
            // can rob, provided settlement id is not in the list of robbable settlements
            console.error("MOVE_ROBBER validation error: settlement id not valid");
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Invalid vertexId for MOVE_ROBBER: ${vertexId} is not a valid settlement to rob on tile ${tileId}.`
            };
        }

        // valid input, update robber position
        this.gameContext.gameMap.robberCoord = HexUtils.idToCoord(tileId);

        // check if target player has resources to steal
        if (vertexId) {
            const ownerId = this.gameContext.gameMap.settlements[vertexId].ownerId;
            const targetPlayer = this.gameContext.players.find(p => p.id === ownerId);
            const stolenResources = this._randomStealFromPlayer(targetPlayer, this._getCurrentPlayer());
        }


        // complete, broadcast
        console.log(`change state to ${this.returnStateAfterRob}`);
        this.gameContext.currentState = this.returnStateAfterRob;
        this.returnStateAfterRob = null; // clear

        if (event.type === 'ACTIVATE_DEV_CARD_KNIGHT') {
            const currentPlayer = this._getCurrentPlayer();
            // mark the card as played and update knights played count
            const devCard = event.payload.devCard; // avoid searching again for the card, we already have it in the payload
            devCard.played = true;
            currentPlayer.achievements.knightsPlayed++;
            this.updateLargestArmy(); 
        }

        this._broadcast({
            type: 'WAITING_FOR_ACTION',
            payload: {
                phase: this.gameContext.currentState,
                activePlayerId: this.gameContext.currentPlayerId,
            }
        });
    }







    /*-------------------------------------------------------Helper Methods-------------------------------------------------------*/
    /**
     * update current player to next playerIndex, and id in turn order
     */
    _nextPlayer() {
        this.gameContext.currentPlayerIndex = (this.gameContext.currentPlayerIndex + 1) % this.gameContext.totalPlayers;
        this.gameContext.currentPlayerId = this.gameContext.players[this.gameContext.currentPlayerIndex].id;
    }

    _previousPlayer() {
        this.gameContext.currentPlayerIndex = (this.gameContext.currentPlayerIndex - 1 + this.gameContext.totalPlayers) % this.gameContext.totalPlayers;
        this.gameContext.currentPlayerId = this.gameContext.players[this.gameContext.currentPlayerIndex].id;
    }

    _getCurrentPlayer() {
        return this.gameContext.players[this.gameContext.currentPlayerIndex];
    }

    _isActivePlayer(playerId) {
        return this.gameContext.currentPlayerId === playerId;
    }

    /**
     * Validate and apply the build stack for initial placement
     * Note: This only check for geometric validity, not resource cost, remaining building count, etc.
     * @param {*} playerId 
     * @param {*} buildStack 
     * @param {*} mode 
     * @returns 
     */
    _validateAndApplyBuildStack(playerId, buildStack, mode) {
        // verify buildStack
        // prelimeary checks for initial placement
        console.log(`Validating build stack for player ${playerId} in mode ${mode}:`, buildStack);
        switch (mode) {
            case "INITIAL_PLACEMENT":
                // 1. must have length 2 for initial placement (one settlement and one road)
                if (buildStack.length !== 2) {
                    return {
                        status: StatusCodes.ERROR,
                        errorMessage: `Invalid buildStack length for initial placement: ${buildStack.length}`
                    };
                }
                // 2. first must be settlement, second must be road
                if (buildStack[0].type !== 'SETTLEMENT' || buildStack[1].type !== 'ROAD') {
                    return {
                        status: StatusCodes.ERROR,
                        errorMessage: `Invalid buildStack types for initial placement: ${buildStack[0].type}, ${buildStack[1].type}`
                    };
                }
                break;
            case "ROAD_ONLY":
                if (!buildStack.every(build => build.type === 'ROAD')) {
                    return {
                        status: StatusCodes.ERROR,
                        errorMessage: `Invalid buildStack types for ROAD_ONLY mode: ${buildStack.map(b => b.type).join(', ')}`
                    };
                }
                break;
            case "SETTLEMENT_ONLY":
                if (!buildStack.every(build => build.type === 'SETTLEMENT')) {
                    return {
                        status: StatusCodes.ERROR,
                        errorMessage: `Invalid buildStack types for SETTLEMENT_ONLY mode: ${buildStack.map(b => b.type).join(', ')}`
                    };
                }
                break;
            case "CITY_ONLY":
                if (!buildStack.every(build => build.type === 'CITY')) {
                    return {
                        status: StatusCodes.ERROR,
                        errorMessage: `Invalid buildStack types for CITY_ONLY mode: ${buildStack.map(b => b.type).join(', ')}`
                    };
                }
                break;
            default:
                throw new Error(`Invalid mode for _validateAndApplyBuildStack: ${mode}`);
        }


        // 3. verify using BuildingPredictor
        console.log(`Checking build stack validity for player ${playerId} with BuildingPredictor in mode ${mode}...`);
        const buildingPredictor = new BuildingPredictor();
        buildingPredictor.init(this.gameContext.gameMap, playerId, mode);
        buildingPredictor.getNextValidSpots(); // prepare valid spots for the player
        buildStack.forEach((building) => {
            console.log(`Verifying building: ${building.type} at ${building.coord}`);
            if (!buildingPredictor.build(building.type, building.coord)) {
                return {
                    status: StatusCodes.ERROR,
                    errorMessage: `Invalid building: ${building.type} at ${building.coord}`
                };
            }
        });

        // all checks passed, apply the build actions to the game map
        buildStack.forEach((building) => {
            switch (building.type) {
                case 'SETTLEMENT':
                    MapUtils.updateSettlement(this.gameContext.gameMap, building.coord, playerId, 1);
                    PlayerUtils.addSettlement(this.gameContext.players.find(p => p.id === playerId), HexUtils.coordToId(building.coord));
                    break;
                case 'ROAD':
                    MapUtils.updateRoad(this.gameContext.gameMap, building.coord, playerId);
                    PlayerUtils.addRoad(this.gameContext.players.find(p => p.id === playerId), HexUtils.coordToId(building.coord));
                    break;
                case 'CITY':
                    MapUtils.updateSettlement(this.gameContext.gameMap, building.coord, playerId, 2);
                    PlayerUtils.addCity(this.gameContext.players.find(p => p.id === playerId), HexUtils.coordToId(building.coord));
                    break;
                default:
                    throw new Error(`Invalid building type in initial placement: ${building.type}`);
            }
        });

        return {
            status: StatusCodes.SUCCESS
        };
    }


    /**
     * Distribute resources to players based on the rolled number.
     * @param {*} rolledNumber 
     */
    _distributeResourcesByRoll(rolledNumber) {
        // get all the tile ids with the rolled number token
        const filteredTiles = MapUtils.filter(this.gameContext.gameMap, 'tiles', (tile) => tile.numberToken === rolledNumber);
        filteredTiles.forEach(tile => {
            const resourceType = GameRules.getTileProduction(tile);
            if (resourceType === null) return; // skip desert or invalid resource tile

            // get all adjacent vertex coords
            const adjacentVertexCoords = HexUtils.getVerticesFromHex(tile.coord);
            adjacentVertexCoords.forEach(vCoord => { // iterate each vertex
                const vertexId = HexUtils.coordToId(vCoord);
                // check if there is a settlement at this vertex
                if (this.gameContext.gameMap.settlements[vertexId]) {
                    const settlement = this.gameContext.gameMap.settlements[vertexId];
                    const ownerId = settlement.ownerId;
                    const amount = (settlement.level === 1) ? 1 : 2; // settlement gives 1, city gives 2
                    // distribute resource to player with ownerId
                    this._distributeResourceToPlayer(ownerId, resourceType, amount);
                }
            });
        });
    }


    _distributeResourceToPlayer(playerId, resourceType, amount) {
        // first check if bank has enough resources
        const returnedResources = this._getResourceFromBank({ [resourceType]: amount });

        // find the player in the game context and give them the resource
        const player = this.gameContext.players.find(p => p.id === playerId);
        if (player) {
            PlayerUtils.addResources(player, returnedResources);
        }
    }


    /**
     * Get resources from bank, if not enough, give whatever is left
     * @param {Object} requestResources a resource request object {RESOURCE_TYPES: amount, ...}
     * @returns the actual resources taken from bank
     */
    _getResourceFromBank(requestResources) {
        let returnedResources = {};
        for (let [type, amount] of Object.entries(requestResources)) {
            const currentResource = this.gameContext.bankResources[type];
            if (currentResource) {
                if (currentResource < amount) { // not enough in bank, return whatever is left
                    returnedResources[type] = currentResource;
                    this.gameContext.bankResources[type] = 0;
                } else { // enough in bank
                    returnedResources[type] = amount;
                    this.gameContext.bankResources[type] = currentResource - amount;
                }
            }
        }
        return returnedResources;
    }


    /**
     * 
     * @param {Object} resources resources to update {RESOURCE_TYPES: amount, ...}
     */
    _addBankResource(resources) {
        for (let [type, amount] of Object.entries(resources)) {
            const current = this.gameContext.bankResources[type];
            if (current) {
                this.gameContext.bankResources[type] = current + amount;
            } else {
                throw new Error(`Non-existent resource type (should not happen): ${type}`);
            }
        }
    }


    _handleDiscardOrMoveRobber() {
        // 1. If there are still people left to discard
        if (this.discardInfo.length > 0) {
            const nextDiscard = this.discardInfo[0];
            this.gameContext.currentState = GameState.DISCARD;

            this._broadcast({
                type: 'WAITING_FOR_ACTION',
                payload: {
                    phase: 'DISCARD',
                    activePlayerId: nextDiscard.playerId,
                    numberToDiscard: nextDiscard.numberToDiscard
                }
            });
        }
        // 2. Everyone is finished, time to move the robber
        else {
            this.gameContext.currentState = GameState.MOVE_ROBBER;

            this._broadcast({
                type: 'WAITING_FOR_ACTION',
                payload: {
                    phase: 'MOVE_ROBBER',
                    activePlayerId: this.gameContext.currentPlayerId
                }
            });
        }
    }

    /**
     * Validate an incoming event request.
     * @param {Object} event - The incoming event object
     * @param {String|String[]} allowedTypes - A single type or an array of valid types
     */
    _validateRequest(event, allowedTypes) {
        // 1. Normalize allowedTypes to an array
        const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];

        // 2. Check Event Type
        if (!types.includes(event.type)) {
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Invalid event: expected [${types.join(', ')}], received ${event.type}`
            };
        }

        // 3. Check Player Authorization
        const playerId = event.payload.playerId;
        if (!this._isAuthorizedPlayer(playerId)) {
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Player ${playerId} is not authorized for this action.`
            };
        }

        return { status: StatusCodes.SUCCESS };
    }

    _isAuthorizedPlayer(playerId) {
        if (this.gameContext.currentState === GameState.DISCARD && this.discardInfo.length > 0) {
            // during DISCARD phase, only the first player in the queue is authorized
            return this.discardInfo[0].playerId === playerId;
        }

        // otherwise, only the current active player is authorized

        return this.gameContext.currentPlayerId === playerId;
    }


    /**
     * Steal a random resource from the target player and give it to the active player.
     * Should only be called after validating that the steal action is valid (e.g. there is a settlement to rob, target player has resources to steal, etc.)
     * @param {Player} targetPlayer 
     * @param {Player} activePlayer 
     * @returns the resources stolen from the target player, or null if no resources were stolen
     */
    _randomStealFromPlayer(targetPlayer, activePlayer) {
        const totalResources = PlayerUtils.getTotalResourceCount(targetPlayer);
        if (totalResources === 0) {
            return null; // nothing to steal
        }

        // create a weighted array of resources based on the player's current resources
        const randomIndex = this.rng.nextInt(0, totalResources - 1);

        const stolenResources = PlayerUtils.removeResourceByIndicies(targetPlayer, [randomIndex]);
        PlayerUtils.addResources(activePlayer, stolenResources);
        return stolenResources;
    }


}