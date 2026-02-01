import { Dice } from "../models/Dice.js";
import { GameMap } from "../models/GameMap.js";
import { DevCardDeck } from "../models/devCards/DevCardDeck.js";
import { StatusCodes } from "../constants/StatusCodes.js";
import { MapGenerator } from "../utils/map-generator.js";
import { RNG } from "../utils/rng.js";
import { INITIAL_BANK_RESOURCES } from "../constants/GameRuleConstants.js";
import { Player } from "../models/Player.js";
import { PlayerUtils } from "../utils/player-utils.js";

export const GameState = Object.freeze({
    IDLE: 'IDLE', // wait for start
    PLACE_SETTLEMENT1: 'PLACE_SETTLEMENT1', // wait for first settlement and road placements
    PLACE_ROAD1: 'PLACE_ROAD1',
    PLACE_SETTLEMENT2: 'PLACE_SETTLEMENT2', // wait for second settlement and road placements
    PLACE_ROAD2: 'PLACE_ROAD2',
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
            gameMap: gameMap,
            lastSettlementPlaced: null,
            lastRoll: null,
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
        this.gameContext.players.push(new Player(client.id, client.name, client.color));
        this.listeners.set(client.id, callback);
    }


    /**
    * Publish a event with the current game state to all listeners.
    * @param {Object} event - Optional event details
    * (e.g. { type: 'TURN_CHANGE', playerId: 1, action: 'BUILD_ROAD' })
    */
    _broadcast(event = null) {
        this.listeners.forEach((callback, playerId) => {
            const publicGameContext = this._serializeState(playerId);

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
     */
    _serializeState(viewingPlayerId = null) {
        const gameContextCopy = structuredClone(this.gameContext); // deep clone, only keep data (no methods)

        // hide dev cards in deck
        gameContextCopy.devCardDeck.devCards = null;
        // replace with count only
        gameContextCopy.devCardDeckCount = this.gameContext.devCardDeck.getRemainingCardCount();

        // Sanitize player hands
        gameContextCopy.players = gameContextCopy.players.map(player => {
            const sanitizedPlayer = structuredClone(player);
            if (player.id !== viewingPlayerId) {
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

    start(){
        // check if clients are ready
        if(this.listeners.size !== this.expectedTotalPlayers){
            throw new Error(`Cannot start game: expected ${this.expectedTotalPlayers} clients, but got ${this.listeners.size}`);
        }

        // set first player
        this.gameContext.currentPlayerIndex = 0;
        this.gameContext.currentPlayerId = this.gameContext.players[0].id;

        // initialize bank resources
        this.gameContext.bankResources = structuredClone(INITIAL_BANK_RESOURCES);

        // change state to first placement
        this.gameContext.currentState = GameState.PLACE_SETTLEMENT1;

        // broadcast initial state
        this._broadcast({ type: `WAITING_FOR_PLAYER_${this.gameContext.currentPlayerId}_PLACEMENT` });
    }


    // main game loop methods would go here
    async inputEvent(event) {
        console.log(`State: ${this.gameContext.currentState} | Event: ${event.type}`);
        let res = {
            status: StatusCodes.ERROR
        };

        switch (this.gameContext.currentState) {
            case GameState.SETUP:
                // handle setup events
                res = await this.handleStateSetup(event);
                break;
            case GameState.PLACE_SETTLEMENT1:
                // handle first settlement placement events
                res = await this.handleStatePlaceSettlement1(event);
                break;
            case GameState.PLACE_ROAD1:
                // handle first road placement events
                res = await this.handleStatePlaceRoad1(event);
                break;
            case GameState.PLACE_SETTLEMENT2:
                // handle second settlement placement events
                res = await this.handleStatePlaceSettlement2(event);
                break;
            case GameState.PLACE_ROAD2:
                // handle second road placement events
                res = await this.handleStatePlaceRoad2(event);
                break;
            case GameState.ROLL:
                // handle roll events
                res = await this.handleStateRoll(event);
                break;
            case GameState.DISCARD:
                // handle discard events
                res = this.handleStateDiscard(event);
                break;
            case GameState.MOVE_ROBBER:
                res = this.handleStateMoveRobber(event);
                break;
            case GameState.ROB_PLAYER:
                res = this.handleStateRobPlayer(event);
                break;
            case GameState.MAIN: // nested main states
                res = this.handleStateMain(event);
                break;
            case GameState.GAME_OVER:
                // no events should be processed in GAME_OVER state
                return;
            default:
                throw new Error(`Unknown game state: ${this.gameContext.currentState}`);
        }

        // check for win condition after each event (right after action finished, back to MAIN state)
        if (res.status === StatusCodes.SUCCESS) {
            const winner = this.checkWinCondition();
            if (winner.length > 0) {
                this.gameContext.currentState = GameState.GAME_OVER;
                res.status = StatusCodes.GAME_OVER;
                res.winner = winner;
            }
        }

        return res;
    }
}