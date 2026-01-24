import { GameMap } from '../models/GameMap.js';
import { RESOURCE_TYPES } from '../constants/ResourceTypes.js';
import { Player } from '../models/Player.js';
import { Dice } from './Dice.js';
import { RNG } from '../utils/rng.js';
import { HexUtils } from '../utils/hex-utils.js';
import { COSTS, INITIAL_BANK_RESOURCES, PLAYER_NAMES, PLAYER_COLORS, NUMBER_TOKENS_DISTRIBUTION } from '../constants/GameConstants.js';
import { DevCardDeck } from '../models/devCards/DevCardDeck.js';
import { DEV_CARD_TYPES, PLAYERABLDE_DEVCARDS } from '../constants/DevCardTypes.js';
import { DevCardEffects } from '../models/devCards/DevCardActions.js';
import { GameUtils } from '../utils/game-utils.js';
import { StatusCodes } from '../constants/StatusCodes.js';

export const GameState = Object.freeze({
    SETUP: 'SETUP', // prompt UI wait for game setup
    INIT: 'INIT',
    PLACE_SETTLEMENT1: 'PLACE_SETTLEMENT1', // place first settlement and road
    PLACE_ROAD1: 'PLACE_ROAD1',
    PLACE_SETTLEMENT2: 'PLACE_SETTLEMENT2', // place second settlement and road
    PLACE_ROAD2: 'PLACE_ROAD2',
    ROLL: 'ROLL', // roll dice phase

    // sub-states for when 7 is rolled
    DISCARD: 'DISCARD', // discard resources if over 7 when 7 is rolled
    MOVE_ROBBER: 'MOVE_ROBBER', // move robber after 7 is rolled
    ROB_PLAYER: 'ROB_PLAYER', // rob a player after moving robber

    // sub-states for main game loop
    MAIN: 'MAIN', // main game loop: build, trade, end turn

    END: 'END' // game has ended
});

export class GameController {
    constructor(seed = Date.now()) {
        // game setup
        this.seed = seed;
        this.rng = new RNG(this.seed);
        this.gameContext = {};
        this.bankResources = new Map();
        this.resetGame();
    }

    resetGame() {
        // reset game context
        this.gameContext = {
            gameMap: new GameMap(this.rng),         // instance of GameMap
            players: [],                            // array of Player instances
            currentPlayerIndex: 0,                  // track current player (index in players array) (int)
            totalPlayers: 0,                        // total number of players (int)
            humanPlayers: 0,                        // number of human players (int)         
            aiPlayers: 0,                           // number of AI players (int)
            turnNumber: 0,                          // current turn number (starts at 0)
            seed: this.seed,                        // seed for rng (number)
            rng: this.rng,                          // rng instance
            dice: new Dice(this.rng),               // dice instance
            currentState: GameState.SETUP,          // current game state (from GameState enum) 
            lastSettlementPlaced: null,             // track last settlement coord placed for resource distribution (string id of `q,r,s`)
            devCardDeck: new DevCardDeck(this.rng), // development card deck (instance of DevCardDeck)
            bankResources: this.bankResources,      // map of RESOURCE_TYPES to amount
            playersToDiscard: [],                   // players that need to discard hands (player instances)
            lastRoll: null,                         // last dice roll result (number)
            playerWithLongestRoad: null,            // player id (number)
            playerWithLargestArmy: null,             // player id (number)
            stateAfterRob: null             // state to return to after robber process (GameState enum)
        }

        this.bankResources.clear();
        for (let [type, amount] of Object.entries(INITIAL_BANK_RESOURCES)) {
            this.bankResources.set(type, amount);
        }
    }

    // Simple log to console
    renderDebugHUDLog(message) {
        console.log("Debug HUD Log:", message);
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
            case GameState.END:
                // handle end game events
                res = await this.handleStateEnd(event);
                break;
            default:
                throw new Error(`Unknown game state: ${this.gameContext.currentState}`);
        }

        // check for win condition after each event (right after action finished, back to MAIN state)
        if (res.status === StatusCodes.SUCCESS) {
            const winner = this.checkWinCondition();
            if (winner.length > 0) {
                this.gameContext.currentState = GameState.END;
                res.status = StatusCodes.GAME_OVER;
                res.winner = winner;
            }
        }

        return res;
    }

    checkWinCondition() {
        let winner = []; // in case of multiple winners (can this happen?)
        for (let player of this.gameContext.players) {
            if (player.getVictoryPoints() >= 10) {
                winner.push(player);
            }
        }
        return winner;
    }

    handleStateEnd(event) {
        // handle end game events
        if (event.type === 'RESTART_GAME') {
            this.restartGame();
        }
    }

    restartGame() {
        // reset game context
        this.gameContext = new GameContext();
        this.gameContext.currentState = GameState.SETUP;
    }

    /**
     * If click "start game" button in setup state, 
     * read the user setup and setup game (e.g. # of players, AI/human), 
     * then generate map and transition to INIT state
     * @param {*} event 
     */
    async handleStateSetup(event) {
        if (event.type !== 'START_GAME') {
            return {
                status: StatusCodes.INAPPLICABLE_EVENT
            }
        }

        // set up players
        let gameContext = this.gameContext;
        gameContext.humanPlayers = event.humanPlayers;
        gameContext.aiPlayers = event.aiPlayers;
        gameContext.totalPlayers = gameContext.humanPlayers + gameContext.aiPlayers;
        gameContext.seed = event.seed || Date.now();

        // create player instances
        for (let i = 0; i < gameContext.humanPlayers; i++) {
            gameContext.players.push(new Player(i, PLAYER_NAMES[i], PLAYER_COLORS[i], 'HUMAN'));
        }

        for (let j = 0; j < gameContext.aiPlayers; j++) {
            gameContext.players.push(new Player(gameContext.humanPlayers + j, `AI_${j + 1}`, PLAYER_COLORS[gameContext.humanPlayers + j], 'AI'));
        }
        // generate map
        await this.generateDefaultMap(this.gameContext.seed);

        const validSettlementCoords = GameUtils.getValidSettlementCoords(this.gameContext.gameMap, null); // pre-compute valid settlement spots for initial placement

        this.gameContext.currentState = GameState.PLACE_SETTLEMENT1;

        return {
            status: StatusCodes.SUCCESS, // indicate success
            gameContext: this.gameContext,
            interaction: {
                action: 'HIGHLIGHT_SETTLEMENT_SPOTS',
                data: {
                    validSettlementCoords: validSettlementCoords
                }
            }
        };
    }

    async handleStatePlaceSettlement1(event) {
        if (event.type !== 'BUILD_SETTLEMENT') {
            return {
                status: StatusCodes.INAPPLICABLE_EVENT
            };
        }

        // place settlement logic here

        // add settlement to map
        const settlementCoord = HexUtils.idToCoord(event.vertexId);
        const settlementId = event.vertexId;
        const currentPlayer = this.getCurrentPlayer();

        // try to build settlement
        if (!this.buildSettlement(settlementId, currentPlayer, 'INITIAL')) {
            return {
                status: StatusCodes.ERROR,
                error_message: "Failed to build 1st settlement."
            }
        }

        this.gameContext.currentState = GameState.PLACE_ROAD1;

        // compute all valid road spots based on last settlement placed
        const availableRoadCoords = GameUtils.getValidRoadFromVertex(this.gameContext.gameMap, settlementCoord, currentPlayer);
        console.log("Available road coords after 1st settlement:", availableRoadCoords);
        return {
            status: StatusCodes.SUCCESS,
            settlementId: settlementId,
            settlementLevel: 1,
            playerColor: currentPlayer.color,
            gameContext: this.gameContext,
            interaction: {
                action: 'HIGHLIGHT_ROAD_SPOTS',
                data: {
                    validRoadCoords: availableRoadCoords
                }
            }
        };
    }

    async handleStatePlaceRoad1(event) {
        if (event.type !== 'BUILD_ROAD') {
            return {
                status: StatusCodes.INAPPLICABLE_EVENT
            };
        }
        // place road logic here

        // add road to map
        const currentPlayer = this.getCurrentPlayer();
        const roadId = event.edgeId;

        if (!this.buildRoad(roadId, currentPlayer, 'INITIAL')) {
            return {
                status: StatusCodes.ERROR,
                error_message: "Failed to build 1st road."
            };
        }


        // check if current player is last player
        if (this.gameContext.currentPlayerIndex === this.gameContext.totalPlayers - 1) {
            // if last player, move to PLACE_SETTLEMENT2 state, same player places second settlement (by rule)
            this.gameContext.currentState = GameState.PLACE_SETTLEMENT2;
        } else {
            // else move to next player and PLACE_SETTLEMENT1 state
            this.nextPlayer();
            this.gameContext.currentState = GameState.PLACE_SETTLEMENT1;
        }

        const availableSettlementCoords = GameUtils.getValidSettlementCoords(this.gameContext.gameMap, null); // "free" spots for initial placement
        return {
            status: StatusCodes.SUCCESS,
            roadId: roadId,
            playerColor: currentPlayer.color,
            gameContext: this.gameContext,
            interaction: {
                action: 'HIGHLIGHT_SETTLEMENT_SPOTS',
                data: {
                    validSettlementCoords: availableSettlementCoords
                }
            }
        };

    }

    handleStatePlaceSettlement2(event) {
        if (event.type !== 'BUILD_SETTLEMENT') {
            return {
                status: StatusCodes.INAPPLICABLE_EVENT
            };
        }

        // add settlement to map
        const settlementCoord = HexUtils.idToCoord(event.vertexId);
        const settlementId = event.vertexId;
        const currentPlayer = this.getCurrentPlayer();

        if (!this.buildSettlement(settlementId, currentPlayer, 'INITIAL')) {
            return {
                status: StatusCodes.ERROR,
                error_message: "Failed to build 2nd settlement."
            };
        }

        // move to previous player and PLACE_ROAD2 state (since placement is in reverse order in the second round by rule)
        this.gameContext.currentState = GameState.PLACE_ROAD2;
        const availableRoadCoords = GameUtils.getValidRoadFromVertex(this.gameContext.gameMap, settlementCoord, currentPlayer);

        return {
            status: StatusCodes.SUCCESS,
            settlementId: settlementId,
            settlementLevel: 1,
            playerColor: currentPlayer.color,
            gameContext: this.gameContext,
            interaction: {
                action: 'HIGHLIGHT_ROAD_SPOTS',
                data: {
                    validRoadCoords: availableRoadCoords
                }
            }
        };
    }

    handleStatePlaceRoad2(event) {
        if (event.type !== 'BUILD_ROAD') {
            return {
                status: StatusCodes.INAPPLICABLE_EVENT
            };
        }
        // place road logic here

        // add road to map and register its ownership
        const currentPlayer = this.getCurrentPlayer();
        const roadId = event.edgeId;

        if (!this.buildRoad(roadId, currentPlayer, 'INITIAL')) {
            return {
                status: StatusCodes.ERROR,
                error_message: "Failed to build 2nd road."
            }
        }


        // add adjacnet resources to player for second settlement
        const adjacentResources = this.gameContext.gameMap.getResourcesAdjacentToSettlement(this.gameContext.lastSettlementPlaced);
        adjacentResources.forEach(RESOURCE_TYPES => {
            currentPlayer.addResources({ [RESOURCE_TYPES]: 1 });
            this.addBankResource({ [RESOURCE_TYPES]: -1 });
        });

        // check if current player is the first player
        if (this.gameContext.currentPlayerIndex === 0) {
            // if fisrt player, game setup is complete, move to ROLL state
            this.gameContext.currentState = GameState.ROLL;
            return {
                status: StatusCodes.SUCCESS,
                roadId: roadId,
                playerColor: currentPlayer.color,
                gameContext: this.gameContext
            }
        } else {
            // else move to previous player and PLACE_SETTLEMENT2 state
            this.prevPlayer();
            this.gameContext.currentState = GameState.PLACE_SETTLEMENT2;
            const availableSettlementCoords = GameUtils.getValidSettlementCoords(this.gameContext.gameMap, null); // "free" spots for initial placement
            return {
                status: StatusCodes.SUCCESS,
                roadId: roadId,
                playerColor: currentPlayer.color,
                gameContext: this.gameContext,
                interaction: {
                    action: 'HIGHLIGHT_SETTLEMENT_SPOTS',
                    data: {
                        validSettlementCoords: availableSettlementCoords
                    }
                }
            }
        }
    }

    async handleStateRoll(event) {
        if (event.type === 'ROLL_DICE') {
            // roll dice and update game state
            const rollResult = this.gameContext.dice.roll(2);
            this.gameContext.lastRoll = rollResult;

            // distribute resources based on roll
            const rolledNumber = rollResult.sum;
            // get all the tiles ids with the rolled number token
            if (rolledNumber === 7) {
                // check players that needs to discard cards
                return this.discardCardAndActivateRobber(GameState.MAIN);
            } else {
                this.distributeResourcesByRoll(rolledNumber);
                // transition to MAIN state
                this.gameContext.currentState = GameState.MAIN;
                return {
                    status: StatusCodes.SUCCESS,
                    roll: rollResult,
                    gameContext: this.gameContext
                };
            }

        } else if (event.type === 'ACTIVATE_KNIGHT' ||
            event.type === 'ACTIVATE_YEAR_OF_PLENTY' ||
            event.type === 'ACTIVATE_MONOPOLY' ||
            event.type === 'ACTIVATE_ROAD_BUILDING') {
            // handle play development card event
            return this.handleEventActivateDevCard(event);
        } else {
            return {
                status: StatusCodes.INAPPLICABLE_EVENT
            };
        }
    }


    handleStateMain(event) {
        // main game logic would go here
        switch (event.type) {
            case 'END_TURN':
                return this.handleEventEnd(event);
            case 'QUERY_VALID_SPOTS':
                // user request to query valid spots for building road/settlement, this will trigger renderer to highlight valid spots (for human player)
                return this.queryValidSpots(this.gameContext.currentPlayerIndex, event.queryType);
            case 'BUILD_ROAD':
                // user request to build settlement with
                return this.handleEventBuildRoad(event);
            case 'BUILD_SETTLEMENT':
                // user request to build settlement with
                return this.handleEventBuildSettlement(event);
            case 'BUILD_CITY':
                return this.handleEventBuildCity(event);
            case 'BUY_DEV_CARD':
                // TODO: handle buy development card
                return this.handleEventBuyDevCard(event);
            case 'ACTIVATE_KNIGHT':
            case 'ACTIVATE_YEAR_OF_PLENTY':
            case 'ACTIVATE_MONOPOLY':
            case 'ACTIVATE_ROAD_BUILDING':
                return this.handleEventActivateDevCard(event);
            case 'TRADE':
                // TODO: handle trade
                return {
                    status: StatusCodes.TODO_IMPLEMENT
                };

            default:
                // do nothing for events not belonging to MAIN state
                return {
                    status: StatusCodes.INAPPLICABLE_EVENT
                };
        }
    }

    isValidPlayerId(playerId) {
        return (playerId >= 0 && playerId < this.gameContext.totalPlayers);
    }

    handleEventEnd(event) {
        const winner = this.checkWinCondition();
        if (winner.length > 0) {
            // game over, render UI
            this.gameContext.currentState = GameState.END;
            return {
                status: StatusCodes.GAME_OVER,
                winner: winner,
                gameContext: this.gameContext,
            }
        } else {
            // continue to next turn
            this.nextPlayer();
            this.nextTurn();
            this.gameContext.currentState = GameState.ROLL;
            return {
                status: StatusCodes.SUCCESS,
                gameContext: this.gameContext,
            }
        }
    }


    /**
     * Find valid spots for building road/settlement/city for a given player
     * @param {*} playerId 
     * @param {*} queryType 
     * @returns an array of coords
     */
    queryValidSpots(playerId, queryType) {
        const player = this.gameContext.players[playerId];
        switch (queryType) {
            case 'ROAD':
                // compute all valid road spots based on player's owned roads
                const validRoadCoords = this.queryValidRoadSpots(player);
                return {
                    status: StatusCodes.SUCCESS,
                    gameContext: this.gameContext,
                    interaction: {
                        action: 'HIGHLIGHT_ROAD_SPOTS',
                        data: { validRoadCoords: validRoadCoords }
                    }
                };
            case 'SETTLEMENT':
                // compute all valid settlement spots based on player's owned roads
                const validSettlementCoords = this.queryValidSettlementSpots(player);
                return {
                    status: StatusCodes.SUCCESS,
                    gameContext: this.gameContext,
                    interaction: {
                        action: 'HIGHLIGHT_SETTLEMENT_SPOTS',
                        data: { validSettlementCoords: validSettlementCoords }
                    }
                };
            case 'CITY':
                // compute all valid city upgrade spots based on player's owned settlements
                const validCityCoords = this.queryValidCitySpots(player);
                return {
                    status: StatusCodes.SUCCESS,
                    gameContext: this.gameContext,
                    interaction: {
                        action: 'HIGHLIGHT_CITY_SPOTS',
                        data: { validCityCoords: validCityCoords }
                    }
                };
            default:
                return {
                    status: StatusCodes.ERROR,
                    error_message: `Invalid query type: ${queryType}, must be one of 'ROAD', 'SETTLEMENT', 'CITY'`
                }
        }
    }

    /**
     * Find all valid road spots for the player to build road
     * @param {*} player 
     */
    queryValidRoadSpots(player) {
        const playerRoads = player.getRoads();
        const playerRoadCoords = playerRoads.map(road => road.coord);

        // compute all valid road spots based on player's owned roads
        let availableRoads = new Set(); // use set to avoid duplicates
        playerRoadCoords.forEach(eCoord => {
            HexUtils.getVerticesFromEdge(eCoord).forEach(vCoord => {
                const availableECoords = GameUtils.getValidRoadFromVertex(this.gameContext.gameMap, vCoord, player);
                availableECoords.forEach(coord => availableRoads.add(coord));
            });
        });
        return Array.from(availableRoads);
    }

    /**
     * Find all valid settlement spots for the player to build settlement
     * @param {*} player 
     * @returns an array of vertex coords
     */
    queryValidSettlementSpots(player) {
        return GameUtils.getValidSettlementCoords(this.gameContext.gameMap, player); // onyl spots connected to player's roads
    }

    /**
     * Find all valid city upgrade spots for the player to build city
     * @param {*} player 
     * @returns an array of vertex coords
     */
    queryValidCitySpots(player) {
        return GameUtils.getValidCityCoords(player);
    }

    handleEventBuildRoad(event) {
        const currentPlayer = this.getCurrentPlayer();
        if (this.buildRoad(event.edgeId, currentPlayer, "MAIN")) {
            return {
                status: StatusCodes.SUCCESS,
                roadId: event.edgeId,
                playerColor: currentPlayer.color,
                gameContext: this.gameContext
            }
        } else {
            return {
                status: StatusCodes.ERROR,
                error_message: "Failed to build road."
            }
        }
    }

    buildRoad(roadId, player, phase) {
        if (phase !== 'INITIAL' && phase !== 'MAIN') {
            throw new Error(`Invalid phase: ${phase}`);
        }

        // add road to map and render
        const roadCoord = HexUtils.idToCoord(roadId);

        if (phase === 'INITIAL') {
            // during initial placement, free roads
            // check if the road is connected to the last settlement placed
            if (!this.gameContext.gameMap.isRoadSpotValid(roadCoord, null) && !this.gameContext.gameMap.isRoadConnectedToSettlement(roadCoord, this.gameContext.lastSettlementPlaced, player.id)) {
                throw new Error(`Invalid road spot: ${roadCoord}`);
            }
        } else if (phase === 'MAIN') {
            // check if player can afford road
            if (!player.canAfford(COSTS.road)) {
                return false;
            }
            player.addResources(COSTS.road);
            this.addBankResourceFromCost(COSTS.road);
            if (!this.gameContext.gameMap.isRoadSpotValid(roadCoord, player.id)) { // check owner for normal placement (either connected to own settlement or road)
                throw new Error(`Invalid road spot: ${roadCoord}`);
            }
        }

        // add road to map
        this.gameContext.gameMap.updateRoadById(roadId, player.id);
        player.addRoad(this.gameContext.gameMap.roads.get(roadId));
        return true;
    }

    handleEventBuildSettlement(event) {
        const currentPlayer = this.getCurrentPlayer();
        if (this.buildSettlement(event.vertexId, currentPlayer, "MAIN")) {
            return {
                status: StatusCodes.SUCCESS,
                settlementId: event.vertexId,
                settlementLevel: 1,
                playerColor: currentPlayer.color,
                gameContext: this.gameContext
            }
        } else {
            return {
                status: StatusCodes.ERROR,
                error_message: "Failed to build settlement."
            }
        }
    }

    buildSettlement(settlementId, player, phase) {
        if (phase !== 'INITIAL' && phase !== 'MAIN') {
            throw new Error(`Invalid phase: ${phase}`);
        }

        const settlementCoord = HexUtils.idToCoord(settlementId);

        // check if settlement spot is valid
        if (!this.gameContext.gameMap.isSettlementSpotValid(settlementCoord)) { // no owner check for initial placement
            throw new Error(`Invalid settlement spot: ${settlementCoord}`);
        }

        if (phase === 'MAIN') {
            // place settlement logic
            // check if player can afford settlement
            if (!player.canAfford(COSTS.settlement)) {
                return false;
            }
            // deduct settlement cost from player and bank
            player.addResources(COSTS.settlement);
            this.addBankResourceFromCost(COSTS.settlement);
        }

        // add settlement to map
        this.gameContext.gameMap.updateSettlementById(settlementId, player.id, 1);
        player.addSettlement(this.gameContext.gameMap.settlements.get(settlementId));
        this.gameContext.lastSettlementPlaced = settlementId;
        return true;
    }

    handleEventBuildCity(event) {
        const currentPlayer = this.getCurrentPlayer();
        const settlementId = event.vertexId;
        if (this.buildCity(settlementId, currentPlayer)) {
            return {
                status: StatusCodes.SUCCESS,
                settlementId: settlementId, // note: we use settlementId to represent city as wellss
                playerColor: currentPlayer.color,
                settlementLevel: 2,
                gameContext: this.gameContext
            }
        } else {
            return {
                status: StatusCodes.ERROR,
                error_message: "Failed to build city."
            }
        }
    }

    buildCity(cityId, player) {
        // check if city upgrade spot is valid
        const cityCoord = HexUtils.idToCoord(cityId);
        const settlement = this.gameContext.gameMap.settlements.get(cityId);
        if (!settlement || settlement.owner !== player.id || settlement.level !== 1) {
            throw new Error(`Invalid city upgrade spot: ${cityCoord}`);
        }

        // check if player can afford city
        if (!player.canAfford(COSTS.city)) {
            return false;
        }

        // deduct city cost from player and bank
        player.addResources(COSTS.city);
        this.addBankResourceFromCost(COSTS.city);

        // update city
        settlement.upgrade();
        return true;
    }

    handleEventBuyDevCard(event) {
        const player = this.getCurrentPlayer();
        if (this.buyDevCard(player)) {
            return {
                status: StatusCodes.SUCCESS,
                gameContext: this.gameContext
            }
        } else {
            return {
                status: StatusCodes.ERROR,
                error_message: " You don't have enough resources or the deck is empty."
            }
        }
    }

    buyDevCard(player) {
        // check if player can afford dev card
        if (!player.canAfford(COSTS.devCard)) {
            this.gameContext.currentState = GameState.MAIN;
            return false;
        }

        // deduct dev card cost from player and bank
        player.addResources(COSTS.devCard);
        this.addBankResourceFromCost(COSTS.devCard);

        // add dev card to player and render
        const devCard = this.gameContext.devCardDeck.drawCard(this.gameContext.turnNumber);
        if (!devCard) {
            return false;
        }
        player.addDevCard(devCard);
        return true;
    }


    getDevCard(player, devCardType) {
        const devCard = player.getDevCards().find(card => PLAYERABLDE_DEVCARDS.includes(card.type) && card.type === devCardType && card.isPlayable(this.gameContext.turnNumber));
        if (!devCard) {
            return null;
        }
        return devCard;
    }

    handleEventActivateDevCard(event) {
        const currentPlayer = this.getCurrentPlayer();

        switch (event.type) {
            case 'ACTIVATE_KNIGHT':
                return this.getDevCard(currentPlayer, DEV_CARD_TYPES.KNIGHT).activate(this);
            case 'ACTIVATE_YEAR_OF_PLENTY':
                return this.getDevCard(currentPlayer, DEV_CARD_TYPES.YEAR_OF_PLENTY).activate(this, event.selectedCards);
            default:
                return {
                    status: StatusCodes.ERROR,
                    error_message: `Unhandled dev card activation event type: ${event.type}`
                }
        }

    }

    async generateDefaultMap() {
        // load standard map layout
        await this.gameContext.gameMap.loadMapFromJson('./src/assets/data/standard_map.json');
        // assign default resources and number tokens
        // 1. get target coords (all coords)
        const allCoords = this.gameContext.gameMap.getAllTileCoords();
        this.gameContext.gameMap.assignTerrainTypesRandom(allCoords, { 'hill': 4, 'mountain': 3, 'pasture': 4, 'field': 4, 'forest': 3, 'desert': 1 });

        // 2. get tiles that are not desert
        const productionCoords = [];
        allCoords.forEach(coord => {
            const tile = this.gameContext.gameMap.getTileByCoord(coord);
            if (tile.terrainType == 'desert') {
                this.gameContext.gameMap.robberCoord = coord;
            } else {
                // It's a resource-producing hex
                productionCoords.push(coord);
            }
        });
        this.gameContext.gameMap.assignNumberTokensRandom(productionCoords, NUMBER_TOKENS_DISTRIBUTION);
    }

    isBankResourceAvailable(cost) {
        for (let [type, amount] of Object.entries(cost)) {
            if (this.bankResources.get(type) < amount) {
                return false;
            }
        }
        return true;
    }

    /**
     * 
     * @param {Object} resources resources to update {RESOURCE_TYPES: amount, ...}
     */
    addBankResource(resources) {
        for (let [type, amount] of Object.entries(resources)) {
            if (this.bankResources.has(type)) {
                const current = this.bankResources.get(type);
                this.bankResources.set(type, current + amount);
            }
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
            if (this.bankResources.has(type)) {
                const current = this.bankResources.get(type);
                if (current < amount) { // not enough in bank, return whatever is left
                    returnedResources[type] = current;
                    this.bankResources.set(type, 0);
                } else { // enough in bank
                    returnedResources[type] = amount;
                    this.bankResources.set(type, current - amount);
                }
            }
        }
        return returnedResources;
    }

    addBankResourceFromCost(cost) {
        for (let [type, amount] of Object.entries(cost)) {
            if (this.bankResources.has(type)) {
                const current = this.bankResources.get(type);
                this.bankResources.set(type, current - amount); // subtracting because cost is negative number (what player pays)
            }
        }
    }

    getCurrentPlayer() {
        return this.gameContext.players[this.gameContext.currentPlayerIndex];
    }

    nextPlayer() {
        this.gameContext.currentPlayerIndex = (this.gameContext.currentPlayerIndex + 1) % this.gameContext.players.length;
    }

    prevPlayer() {
        this.gameContext.currentPlayerIndex = (this.gameContext.currentPlayerIndex - 1 + this.gameContext.players.length) % this.gameContext.players.length;
    }

    nextTurn() {
        this.gameContext.turnNumber++;
    }


    /**
     * Distribute resources to players based on the rolled number.
     * @param {*} rolledNumber 
     */
    distributeResourcesByRoll(rolledNumber) {
        // get all the tile ids with the rolled number token
        const gameMap = this.gameContext.gameMap;
        const tileIds = gameMap.searchTileIdsByNumberToken(rolledNumber);
        tileIds.forEach(tileId => {
            const tile = gameMap.getTileById(tileId);
            // get all adjacent vertex coords
            const adjacentVertexCoords = HexUtils.getVerticesFromHex(tile.coord);
            adjacentVertexCoords.forEach(vCoord => {
                const vertexId = HexUtils.coordToId(vCoord);
                // check if there is a settlement at this vertexs
                if (gameMap.settlements.has(vertexId)) {
                    const settlement = gameMap.settlements.get(vertexId);
                    const ownerId = settlement.owner;
                    const resourceType = tile.resource;
                    const amount = (settlement.level === 1) ? 1 : 2; // settlement gives 1, city gives 2
                    // distribute resource to player with ownerId
                    this.distributeResourceToPlayer(ownerId, resourceType, amount);
                }
            });
        });
    }

    distributeResourceToPlayer(playerId, resourceType, amount) {
        // first check if bank has enough resources
        const returnedResources = this.getResourceFromBank({ [resourceType]: amount });

        // find the player in the game context and give them the resource
        const player = this.gameContext.players[playerId];
        if (player) {
            player.addResources(returnedResources);
        }
    }


    /**
     * One of the two will happen:
     * Trigger discard card process if possible, transit to discard stage, OR
     * When no one needs to discard, activate robber placement mode, transit to move robber stage
     */
    discardCardAndActivateRobber(stateAfterRob) {
        this.gameContext.stateAfterRob = stateAfterRob; // store the state to return to after robber process
        this.gameContext.playersToDiscard = this.getPlayersNeedsToDiscard();
        if (this.gameContext.playersToDiscard.length > 0) {
            // activate selection mode for discarding cards
            this.gameContext.currentState = GameState.DISCARD; // wait for players to discard
            const playerToDiscard = this.gameContext.playersToDiscard[0];
            const numberToDiscard = Math.floor(playerToDiscard.getTotalResourceCount() / 2);
            return { // direct result from rolling 7, enter discard state and "tell" caller the player and the number to discard
                status: StatusCodes.SUCCESS,
                gameContext: this.gameContext,
                interaction: {
                    action: 'ACTIVATE_DISCARD_MODE',
                    data: {
                        resourceToDiscard: playerToDiscard.getResources(),
                        numberToDiscard: numberToDiscard
                    }
                }
            };
        } else {
            // no one need to discard, continue the process to move robber
            return this.activateRobber(stateAfterRob); // this is after finish rolling dice, therefore return to the given state
        }
    }

    /**
     * Start the robber placement -> move robber process -> steal routine, this eventually will transit to returnToState state
     * @param {*} stateAfterRob state to return to after robber process is complete
     */
    activateRobber(stateAfterRob) {
        this.gameContext.stateAfterRob = stateAfterRob; // store the state to return to after robber process
        this.gameContext.currentState = GameState.MOVE_ROBBER;
        return { // tell caller to activate robber placement mode/select one tile from robable tiles
            status: StatusCodes.SUCCESS,
            gameContext: this.gameContext,
            interaction: {
                action: 'ACTIVATE_ROBBER_PLACEMENT_MODE',
                data: {
                    robableTileCoords: this.gameContext.gameMap.searchTileCoordsWithoutRobber()
                }
            }
        }
    }

    /**
     * Find players that need to discard cards (more than 7 resource cards in hand)
     * @returns an array of player objects
     */
    getPlayersNeedsToDiscard() {
        let playersToDiscard = [];
        this.gameContext.players.forEach(player => {
            const totalResources = player.getTotalResourceCount();
            if (totalResources > 7) {
                playersToDiscard.push(player);
            }
        });
        return playersToDiscard;
    }

    handleStateDiscard(event) {
        // in discard state: wait for players to discard cards one by one
        // first check the input event  (number/type of cards to discard) is valid: 
        // match the required number and player has enough of each type

        if (event.type !== 'CONFIRM_DISCARD') {
            return {
                status: StatusCodes.INAPPLICABLE_EVENT
            };
        }

        // discard logic
        const player = this.gameContext.playersToDiscard[0];

        // check if the number of selected cards is correct
        const totalResources = player.getTotalResourceCount();
        const requiredDiscard = Math.floor(totalResources / 2);
        const selectedCards = event.selectedCards; // array of resource types to discard

        // summarize the types and the counts of selected cards
        let discardCount = {};
        selectedCards.forEach(cardType => {
            if (discardCount[cardType]) {
                discardCount[cardType]++;
            } else {
                discardCount[cardType] = 1;
            }
        });

        // check if the selected cards are valid (i.e., player has enough of each type)
        let selectedCount = 0;
        for (const cardType in discardCount) {
            if (player.getTotalResourceCount(cardType) < discardCount[cardType]) {
                return {
                    status: StatusCodes.ERROR,
                    error_message: `Player does not have enough ${cardType} cards to discard.`
                }
            }
            selectedCount += discardCount[cardType];
        }

        if (selectedCount !== requiredDiscard) {
            return {
                status: StatusCodes.ERROR,
                error_message: `Player must discard exactly ${requiredDiscard} cards, but selected ${selectedCount}.`
            }
        }

        // pass validation test,
        // actually discard the cards
        player.discardResources(discardCount);

        // remove player from playersToDiscard list
        this.gameContext.playersToDiscard.shift();

        // if there are more players to discard, activate selection mode for next player
        if (this.gameContext.playersToDiscard.length > 0) {
            const playerToDiscard = this.gameContext.playersToDiscard[0];
            const numberToDiscard = Math.floor(playerToDiscard.getTotalResourceCount() / 2);
            return { // this is telling caller the next player to discard and the number to discard
                status: StatusCodes.SUCCESS,
                gameContext: this.gameContext,
                interaction: {
                    action: 'ACTIVATE_DISCARD_MODE',
                    data: {
                        resourceToDiscard: playerToDiscard.getResources(),
                        numberToDiscard: numberToDiscard
                    }
                }
            };
        } else {
            // no more players to discard, activate move robber mode
            return this.activateRobber(this.gameContext.stateAfterRob);
        }
    }


    handleStateMoveRobber(event) {
        if (event.type !== 'PLACE_ROBBER') {
            return {
                status: StatusCodes.INAPPLICABLE_EVENT
            }
        }

        const robTileId = event.tileId;
        // check if the tile is valid
        if (!this.gameContext.gameMap.isRobableTile(robTileId)) {
            return {
                status: StatusCodes.ERROR,
                error_message: `Invalid robber placement tile: ${robTileId}`
            };
        }

        // update robber position on map
        const robTileCoord = HexUtils.idToCoord(robTileId);
        this.gameContext.gameMap.moveRobberToTile(robTileCoord);

        // get player list adjacent to the robber tile to steal from
        const adjacentSettlements = this.gameContext.gameMap.searchSettlementsByTileId(robTileId);
        const robableSettlements = adjacentSettlements.filter(
            settlement => settlement.owner !== this.getCurrentPlayer().id &&
                this.gameContext.players[settlement.owner].getTotalResourceCount() > 0
        ); // only settlements owned by other players with resources

        if (robableSettlements.length === 0) {
            // no one to rob, rob process complete, transition to MAIN state
            this.gameContext.currentState = this.gameContext.stateAfterRob;
            this.gameContext.stateAfterRob = null; // reset return state
            return { // tell caller no one to rob, skip robbing process
                status: StatusCodes.SUCCESS,
                gameContext: this.gameContext,
            };
        }

        // there are players to rob from, get their settlement coords
        const robableSettlementsCoords = robableSettlements.map(settlement => settlement.coord);
        // activate rob selection mode
        this.gameContext.currentState = GameState.ROB_PLAYER;
        return { // tell caller to activate rob selection mode with the robable settlements/ select one settlement to rob from
            status: StatusCodes.SUCCESS,
            gameContext: this.gameContext,
            interaction: {
                action: 'ACTIVATE_ROB_SELECTION_MODE',
                data: {
                    robableSettlementsCoords: robableSettlementsCoords,
                    robTileCoord: robTileCoord
                }
            }
        };
    }


    handleStateRobPlayer(event) {
        if (event.type !== 'ROB_PLAYER') {
            return {
                status: StatusCodes.INAPPLICABLE_EVENT
            };
        }

        // targeted settlement and player
        const targetVertexId = event.vertexId;
        const settlement = this.gameContext.gameMap.settlements.get(targetVertexId);
        const targetPlayer = this.gameContext.players[settlement.owner];
        const totalResourceCount = targetPlayer.getTotalResourceCount();

        // check if the settlement is valid to rob from
        if (!settlement || settlement.owner !== targetPlayer.id || totalResourceCount === 0) {
            return {
                status: StatusCodes.ERROR,
                error_message: `Invalid rob target settlement: ${targetVertexId}`
            };
        }

        // steal a random resource from the target player
        // compute the resource index to steal
        const randomIndex = this.rng.nextInt(0, totalResourceCount - 1); // generate a random index from 0 to  n-1

        const stolenResources = targetPlayer.removeResourceByIndicies([randomIndex]);
        this.getCurrentPlayer().addResources(stolenResources);

        // whole rob process complete, transition to MAIN state
        this.gameContext.currentState = this.gameContext.stateAfterRob;
        this.gameContext.stateAfterRob = null; // reset return state

        return { // tell caller the rob process is complete along with the stolen resources (should back to stateAfterRob)
            status: StatusCodes.SUCCESS,
            gameContext: this.gameContext,
            stolenResources: stolenResources
        };
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


    updateLongestRoad() {
        this.gameContext.players.forEach(player => {
            const longestRoadLength = player.calculateLongestRoad(this.gameContext.gameMap);
            if (longestRoadLength >= 5) {
                if (!this.gameContext.playerWithLongestRoad || this.gameContext.players[this.gameContext.playerWithLongestRoad].calculateLongestRoad(this.gameContext.gameMap) < longestRoadLength) {
                    // no current longest road holder or current player has longer road than existing holder
                    this.gameContext.playerWithLongestRoad = player.id;
                }
            }
        });
    }
}
