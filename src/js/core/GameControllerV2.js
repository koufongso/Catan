import { StatusCodes } from "../constants/StatusCodes.js";
import { INITIAL_BANK_RESOURCES } from "../constants/GameRuleConstants.js";

import { Player } from "../models/Player.js";
import { BuildingPredictor } from "../utils/building-predictor.js";
import { MapRules } from "../utils/MapRules.js";
import { GameClient } from "./client/GameClient.js";
import { DebugClient } from "./debug/DebugClient.js";
import { Dice } from "../models/Dice.js";
import { DevCardDeck } from "../models/devCards/DevCardDeck.js";

import { HexUtils } from "../utils/hex-utils.js";
import { GameUtils } from "../utils/game-utils.js";
import { PlayerUtils } from "../utils/player-utils.js";


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

            // game components
            gameMap: gameMap, // game map instance (contain methods)
            bankResources: null,

            // robber properties
            stateAfterRob: null,
            playersToDiscard: [], // array of Player objects that needs to discard resources due to robbers

            // achievement tracking
            playerWithLongestRoad: null,
            playerWithLargestArmy: null,

            /* -------------private game context properties ------------- */
            devCardDeck: new DevCardDeck(this.rng),
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
            const playerData = {
                id: client.id,
                name: client.name,
                color: client.color
            }
            this.gameContext.players.push(new Player(playerData));
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
        gameContextCopy.devCardDeckCount = this.gameContext.devCardDeck.getRemainingCardCount();

        // Sanitize player hands
        gameContextCopy.players = gameContextCopy.players.map(player => {
            const sanitizedPlayer = structuredClone(player);
            if (!showAll && player.id !== viewingPlayerId) {
                // Hide resource cards and dev cards from other players
                sanitizedPlayer.resources = null;
                sanitizedPlayer.devCards = null;

                // replace with counts only
                sanitizedPlayer.resourceCount = PlayerUtils.getTotalResourceCount(player);
                sanitizedPlayer.devCardCount = PlayerUtils.getTotalDevCardCount(player);
            }
            return sanitizedPlayer;
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
            type: 'WAITING_FOR_INPUT',
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
            default:
                throw new Error(`Unknown game state: ${this.gameContext.currentState}`);
        }


        return res;
    }


    /*-------------------------------------------------------State Handlers-------------------------------------------------------*/

    handleStateInitialPlacement1(event) {
        if (event.type !== 'INITIAL_PLACEMENT') {
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Invalid event type, expected INITIAL_PLACEMENT1, received ${event.type}`
            };
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
            type: 'WAITING_FOR_INPUT',
            payload: {
                phase: 'INITIAL_PLACEMENT',
                activePlayerId: this.gameContext.currentPlayerId,
            } // expectedResponse: [{'SETTLEMENT':null}, {'ROAD':null}]
        };
        this._broadcast(newEvent);
    }



    handleStateInitialPlacement2(event) {
        if (event.type !== 'INITIAL_PLACEMENT') {
            return {
                status: StatusCodes.ERROR,
                errorMessage: `Invalid event type, expected INITIAL_PLACEMENT2, received ${event.type}`
            };
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
        const resourceTiles = this.gameContext.gameMap.getTilesOfVertex(settlementCoord);
        for (const tile of resourceTiles) {
            const resourceType = MapRules.getTileProduction(tile, this.gameContext.gameMap, false);
            player.addResources({ [resourceType]: 1 });
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
                type: 'WAITINIG_FOR_ACTION',
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
                type: 'WAITING_FOR_INPUT',
                payload: {
                    phase: 'INITIAL_PLACEMENT',
                    activePlayerId: this.gameContext.currentPlayerId,
                } // expectedResponse: [{'SETTLEMENT':null}, {'ROAD':null}]
            };
            this._broadcast(newEvent);
        }


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

    /**
     * Validate and apply the build stack for initial placement
     * Note: This only check for geometric validity, not resource cost, remaining building count, etc.
     * @param {*} playerId 
     * @param {*} buildStack 
     * @param {*} mode 
     * @returns 
     */
    _validateAndApplyBuildStack(playerId, buildStack, mode) {
        // verify player
        if (playerId !== this.gameContext.currentPlayerId) {
            console.error(`It's not player ${playerId}'s turn.`);
            return {
                status: StatusCodes.ERROR,
                errorMessage: `It's not player ${playerId}'s turn.`
            };
        }

        // verify buildStack
        // 1. must have length 2
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
        // 3. verify using BuildingPredictor
        const buildingPredictor = new BuildingPredictor();
        buildingPredictor.init(this.gameContext.gameMap, this.gameContext.players, mode);
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
                    this.gameContext.gameMap.updateSettlement(building.coord, playerId, 1);
                    this.gameContext.players.find(p => p.id === playerId).addSettlement(HexUtils.coordToId(building.coord));
                    break;
                case 'ROAD':
                    this.gameContext.gameMap.updateRoad(building.coord, playerId);
                    this.gameContext.players.find(p => p.id === playerId).addRoad(HexUtils.coordToId(building.coord));
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
    distributeResourcesByRoll(rolledNumber) {
        // get all the tile ids with the rolled number token
        const filteredTiles = this.gameContext.gameMap.filter('tiles', (tile) => tile.numberToken === rolledNumber)
        filteredTiles.forEach(tile => {
            const resourceType = MapRules.getTileProduction(tile);
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
                    this.distributeResourceToPlayer(ownerId, resourceType, amount);
                }
            });
        });

        // broadcast
        this._broadcast({
            type: 'RESOURCE_DISTRIBUTION',
            payload: {
                rolledNumber: rolledNumber
            }
        });
    }


    distributeResourceToPlayer(playerId, resourceType, amount) {
        // first check if bank has enough resources
        const returnedResources = this.getResourceFromBank({ [resourceType]: amount });

        // find the player in the game context and give them the resource
        console.log(`Distributing to Player ${playerId}:`, returnedResources);
        const player = this.gameContext.players.find(p => p.id === playerId);
        if (player) {
            console.log(`Before distribution, Player ${playerId} resources:`, player.resources);
            player.addResources(returnedResources);
            console.log(`After distribution, Player ${playerId} resources:`, player.resources);
        }
    }


    /**
     * Get resources from bank, if not enough, give whatever is left
     * @param {Object} requestResources a resource request object {RESOURCE_TYPES: amount, ...}
     * @returns the actual resources taken from bank
     */
    getResourceFromBank(requestResources) {
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


}