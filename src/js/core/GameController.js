import { GameMap } from '../models/GameMap.js';
import { RESOURCE_TYPES } from '../constants/ResourceTypes.js';
import { Player } from '../models/Player.js';
import { Dice } from './Dice.js';
import { RNG } from '../utils/rng.js';
import { HexUtils } from '../utils/hex-utils.js';
import { COSTS, INITIAL_BANK_RESOURCES, PLAYER_NAMES, PLAYER_COLORS, NUMBER_TOKENS_DISTRIBUTION } from '../constants/GameConstants.js';
import { DevCardDeck } from '../models/devCards/DevCardDeck.js';
import { PLAYERABLDE_DEVCARDS } from '../constants/DevCardTypes.js';

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
    MAIN_BUILD_ROAD: 'MAIN_BUILD_ROAD', // main game loop: build road sub-state
    MAIN_BUILD_SETTLEMENT: 'MAIN_BUILD_SETTLEMENT', // main game loop: build settlement sub-state
    MAIN_BUILD_CITY: 'MAIN_BUILD_CITY', // main game loop: build city sub-state
    MAIN_BUY_DEV_CARD: 'MAIN_BUY_DEV_CARD', // main game loop: buy development card sub-state

    END: 'END' // game has ended
});

export class GameController {
    constructor(seed = Date.now()) {
        this.renderer = null;

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
            returnToStateAfterRob: null             // state to return to after robber process (GameState enum)
        }

        this.bankResources.clear();
        for (let [type, amount] of Object.entries(INITIAL_BANK_RESOURCES)) {
            this.bankResources.set(type, amount);
        }
    }

    attachRenderer(renderer) {
        this.renderer = renderer;
    }

    attachDebug(debug) {
        this.debug = debug;
    }


    // Simple log to console
    renderDebugHUDLog(message) {
        console.log("Debug HUD Log:", message);
    }

    // main game loop methods would go here
    async inputEvent(event) {
        console.log(`State: ${this.gameContext.currentState} | Event: ${event.type}`);

        switch (this.gameContext.currentState) {
            case GameState.SETUP:
                // handle setup events
                await this.handleStateSetup(event);
                break;
            case GameState.INIT:
                // handle init events
                await this.handleStateInit(event);
                break;
            case GameState.PLACE_SETTLEMENT1:
                // handle first settlement placement events
                await this.handleStatePlaceSettlement1(event);
                break;
            case GameState.PLACE_ROAD1:
                // handle first road placement events
                await this.handleStatePlaceRoad1(event);
                break;
            case GameState.PLACE_SETTLEMENT2:
                // handle second settlement placement events
                await this.handleStatePlaceSettlement2(event);
                break;
            case GameState.PLACE_ROAD2:
                // handle second road placement events
                await this.handleStatePlaceRoad2(event);
                break;
            case GameState.ROLL:
                // handle roll events
                await this.handleStateRoll(event);
                break;
            case GameState.DISCARD:
                // handle discard events
                this.handleStateDiscard(event);
                break;
            case GameState.MOVE_ROBBER:
                this.handleStateMoveRobber(event);
                break;
            case GameState.ROB_PLAYER:
                this.handleStateRobPlayer(event);
                break;
            case GameState.MAIN: // nested main states
                this.handleStateMain(event);
                break;
            case GameState.MAIN_BUILD_ROAD:
                // handle main build road events
                this.handleStateMainBuildRoad(event);
                break;
            case GameState.MAIN_BUILD_SETTLEMENT:
                this.handleStateMainBuildSettlement(event);
                break;
            case GameState.MAIN_BUILD_CITY:
                this.handleStateMainBuildCity(event);
                break;
            case GameState.MAIN_BUY_DEV_CARD:
                this.handleStateMainBuyDevCard(event);
                break;
            case GameState.MAIN_PLAY_DEV_CARD:
                break;
            case GameState.END:
                // handle end game events
                await this.handleStateEnd(event);
                break;
            default:
                throw new Error(`Unknown game state: ${this.gameContext.currentState}`);
        }

        // check for win condition after each event (right after action finished, back to MAIN state)
        const currentState = this.gameContext.currentState;
        if (currentState === GameState.MAIN) {
            const winner = this.checkWinCondition();
            if (winner.length > 0) {
                this.gameContext.currentState = GameState.END;
                this.renderer.renderGameOver(winner);
                this.debug.renderDebugHUD(this.gameContext, `Winner: ${winner.map(p => p.name).join(', ')}`);
            }
        }
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
            this.renderer.showConfig(); // render setup UI again
        }
    }

    restartGame() {
        // reset game context
        this.gameContext = new GameContext();
        this.gameContext.currentState = GameState.SETUP;
        this.debug.renderDebugHUD(this.gameContext, "Game restarted.");
    }

    /**
     * If click "start game" button in setup state, 
     * read the user setup and setup game (e.g. # of players, AI/human), 
     * then generate map and transition to INIT state
     * @param {*} event 
     */
    async handleStateSetup(event) {
        if (event.type !== 'START_GAME') {
            return;
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

        this.gameContext.currentState = GameState.PLACE_SETTLEMENT1;

        // render the initial map and prompt to place first settlement
        if (this.renderer) {
            // render intial map
            const gameMap = this.gameContext.gameMap
            this.renderer.renderMainUI(gameMap.tiles, gameMap.tradingPosts, gameMap.robberCoord);

            // "activate" vertex elements for settlement placement
            const availableVertexIds = this.gameContext.gameMap.getValidSettlementSpots();
            this.activateSettlementPlacementMode(availableVertexIds);

        } else {
            console.warn("Renderer not attached. Cannot render game map.");
        }

        // update debug HUD
        this.debug.renderDebugHUD(this.gameContext);
    }

    async handleStatePlaceSettlement1(event) {
        if (event.type !== 'PLACE_SETTLEMENT') {
            return;
        }

        // place settlement logic here
        // deactivate settlement placement mode
        this.renderer.deactivateSettlementPlacementMode();

        // add settlement to map
        const vCoord = HexUtils.idToCoord(event.vertexId);
        const vertexId = event.vertexId;
        const currentPlayer = this.getCurrentPlayer();

        this.addSettlementToPlayerAndRender(vertexId, currentPlayer);


        // render updated settlement on map

        this.gameContext.currentState = GameState.PLACE_ROAD1;
        // compute all valid road spots based on last settlement placed
        const availableEdgeIds = this.gameContext.gameMap.getValidRoadSpotsFromVertex(vCoord, null);
        this.activateRoadPlacementMode(availableEdgeIds);
        this.debug.renderDebugHUD(this.gameContext);
    }

    async handleStatePlaceRoad1(event) {
        if (event.type !== 'PLACE_ROAD') {
            return;
        }
        // place road logic here
        // deactivate road placement mode
        this.renderer.deactivateRoadPlacementMode();

        // add road to map
        const currentPlayer = this.getCurrentPlayer();
        this.addRoadToPlayerAndRender(event.edgeId, currentPlayer, 'INITIAL');

        // check if current player is last player
        if (this.gameContext.currentPlayerIndex === this.gameContext.totalPlayers - 1) {
            // if last player, move to PLACE_SETTLEMENT2 state, same player places second settlement (by rule)
            this.gameContext.currentState = GameState.PLACE_SETTLEMENT2;
        } else {
            // else move to next player and PLACE_SETTLEMENT1 state
            this.nextPlayer();
            this.gameContext.currentState = GameState.PLACE_SETTLEMENT1;
        }

        const availableVertexIds = this.gameContext.gameMap.getValidSettlementSpots();
        this.activateSettlementPlacementMode(availableVertexIds);
        this.debug.renderDebugHUD(this.gameContext);
    }

    handleStatePlaceSettlement2(event) {
        if (event.type !== 'PLACE_SETTLEMENT') {
            return;
        }

        this.deactivateSettlementPlacementMode();

        // add settlement to map
        const vCoord = HexUtils.idToCoord(event.vertexId);
        const vertexId = event.vertexId;
        const currentPlayer = this.getCurrentPlayer();
        this.addSettlementToPlayerAndRender(vertexId, currentPlayer);


        // move to previous player and PLACE_ROAD2 state (since placement is in reverse order in the second round by rule)
        this.gameContext.currentState = GameState.PLACE_ROAD2;
        const avaibleRoads = this.gameContext.gameMap.getValidRoadSpotsFromVertex(vCoord, null); // connected to last settlement placed

        this.activateRoadPlacementMode(avaibleRoads);
        this.debug.renderDebugHUD(this.gameContext);
    }

    handleStatePlaceRoad2(event) {
        if (event.type !== 'PLACE_ROAD') {
            return;
        }
        // place road logic here
        // deactivate road placement mode
        this.renderer.deactivateRoadPlacementMode();

        // add road to map and register its ownership
        const currentPlayer = this.getCurrentPlayer();
        this.addRoadToPlayerAndRender(event.edgeId, currentPlayer, 'INITIAL');

        // add adjacnet resources to player for second settlement
        const adjacentResources = this.gameContext.gameMap.getResourcesAdjacentToSettlement(this.gameContext.lastSettlementPlaced);
        adjacentResources.forEach(RESOURCE_TYPES => {
            currentPlayer.addResources({ [RESOURCE_TYPES]: 1 });
            this.addBankResource({ [RESOURCE_TYPES]: -1 });
        });
        this.renderer.renderPlayerAssets(currentPlayer, this.gameContext.turnNumber);

        // check if current player is the first player
        if (this.gameContext.currentPlayerIndex === 0) {
            // if fisrt player, game setup is complete, move to ROLL state
            this.gameContext.currentState = GameState.ROLL;
            // prompt first player to roll dice
            this.debug.renderDebugHUD(this.gameContext);
        } else {
            // else move to previous player and PLACE_SETTLEMENT2 state
            this.prevPlayer();
            this.gameContext.currentState = GameState.PLACE_SETTLEMENT2;
            const availableVertexIds = this.gameContext.gameMap.getValidSettlementSpots();
            this.activateSettlementPlacementMode(availableVertexIds);
            this.debug.renderDebugHUD(this.gameContext);
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
                this.discardCardAndActivateRobber();
            } else {
                this.distributeResourcesByRoll(rolledNumber);
                this.renderer.renderPlayerAssets(this.getCurrentPlayer(), this.gameContext.turnNumber);
                // transition to MAIN state
                this.gameContext.currentState = GameState.MAIN;
                this.debug.renderDebugHUD(this.gameContext);
            }
        }else if (event.type === 'PLAY_DEV_CARD') {
            // handle play development card event
            this.handlePlayDevCard(event);
        }
    }

    handlePlayDevCard(event){
        const currentPlayer = this.getCurrentPlayer();
        const devCardType = event.devCardType;

        // check if player has the dev card and can play it
        // must be one of the playable types (not victory point), and player own the card and is playable
        const devCard = currentPlayer.getDevCards().find(card => PLAYERABLDE_DEVCARDS.includes(card.type) && card.type === devCardType && card.isPlayable(this.gameContext.turnNumber));
        if (devCard) {
            devCard.activate(this);
        } else {
            this.debug.renderDebugHUD(this.gameContext, `Invalid development card play attempt: ${devCardType}`);
        }
    }


    handleStateMain(event) {
        // main game logic would go here
        switch (event.type) {
            case 'END_TURN':
                this.__handleEventEnd(event);
                break;
            case 'BUILD_ROAD':
                this.__handleEventBuildRoad(event);
                break;
            case 'BUILD_SETTLEMENT':
                // TODO: handle build settlement
                this.__handleEventBuildSettlement(event);
                break;
            case 'BUILD_CITY':
                // TODO: handle build city
                this.__handleEventBuildCity(event);
                break;
            case 'BUY_DEV_CARD':
                // TODO: handle buy development card
                this.__handleEventBuyDevCard(event);
                break;
            case 'PLAY_DEV_CARD':
                this.handlePlayDevCard(event);
                break;
            case 'TRADE':
                // TODO: handle trade
                break;

            default:
                // do nothing for events not belonging to MAIN state
                return;
        }
    }

    __handleEventEnd(event) {
        const winner = this.checkWinCondition();
        if (winner.length > 0) {
            // game over, render UI
            this.gameContext.currentState = GameState.END;
            this.renderer.renderGameOver(winner);
            this.debug.renderDebugHUD(this.gameContext, `Winner: ${winner.map(p => p.name).join(', ')}`);
        } else {
            // continue to next turn
            this.nextPlayer();
            this.nextTurn();
            this.renderer.renderPlayerAssets(this.getCurrentPlayer(), this.gameContext.turnNumber); // update to next player's aseets
            this.gameContext.currentState = GameState.ROLL;
            this.debug.renderDebugHUD(this.gameContext, `Turn ended. Next player: Player ${this.getCurrentPlayer().id}. Please roll the dice.`);
        }
    }

    __handleEventBuildRoad(event) {
        // build road logic
        this.gameContext.currentState = GameState.MAIN_BUILD_ROAD;

        // get current player
        const currentPlayer = this.getCurrentPlayer();
        const playerRoads = currentPlayer.getRoads();
        const playerRoadCoords = playerRoads.map(road => road.coord);

        // compute all valid road spots based on player's owned roads
        let availableRoads = [];
        playerRoadCoords.forEach(eCoord => {
            HexUtils.getVerticesFromEdge(eCoord).forEach(vCoord => {
                const availableECoords = this.gameContext.gameMap.getValidRoadSpotsFromVertex(vCoord, currentPlayer.id);
                availableRoads = availableRoads.concat(availableECoords);
            });
        });

        // activate road placement mode based on all settlement coords
        this.activateRoadPlacementMode(availableRoads, currentPlayer.id);
        this.debug.renderDebugHUD(this.gameContext, `Building road. Please place your road.`);
    }

    __handleEventBuildSettlement(event) {
        this.gameContext.currentState = GameState.MAIN_BUILD_SETTLEMENT;

        // get current player's owned roads
        const currentPlayer = this.getCurrentPlayer();
        // compute all valid settlement spots based on player's owned roads
        const availableSettlements = this.gameContext.gameMap.getValidSettlementSpots(currentPlayer.id);
        this.activateSettlementPlacementMode(availableSettlements, 1);
        this.debug.renderDebugHUD(this.gameContext, `Building settlement. Please place your settlement.`);
    }

    __handleEventBuildCity(event) {
        this.gameContext.currentState = GameState.MAIN_BUILD_CITY;

        // get the current player's owned settlements
        const currentPlayer = this.getCurrentPlayer();
        const playerSettlements = currentPlayer.getSettlements(1); // get level 1 settlements only
        const playerSettlementCoords = playerSettlements.map(settlement => settlement.coord);
        this.activateSettlementPlacementMode(playerSettlementCoords, 2);
        this.debug.renderDebugHUD(this.gameContext, `Building city. Please place your city.`);
    }

    __handleEventBuyDevCard(event) {
        this.gameContext.currentState = GameState.MAIN_BUY_DEV_CARD;
        // TODO: let rendere prompt to confirm purchase
        this.renderer.activateActionConfirmationUI({ title: 'Buy a Development Card', message: 'Are you sure?' });
        this.debug.renderDebugHUD(this.gameContext, `Buying development card. Please confirm purchase.`);
    }

    handleStateMainBuildRoad(event) {
        if (event.type == 'PLACE_ROAD') {
            // place road logic
            this.gameContext.currentState = GameState.MAIN;
            this.deactivateRoadPlacementMode();

            const roadId = event.edgeId;
            const currentPlayer = this.getCurrentPlayer();
            // check if player can afford road
            if (!currentPlayer.canAfford(COSTS.road)) {
                this.debug.renderDebugHUD(this.gameContext, `Player ${currentPlayer.id} cannot afford to build a road.`);
                return;
            }

            // successfully placed road
            // deduct road cost from player and bank
            currentPlayer.addResources(COSTS.road);
            this.addBankResourceFromCost(COSTS.road);
            // add road to map and render
            this.addRoadToPlayerAndRender(roadId, currentPlayer, 'MAIN');

            this.renderer.renderPlayerAssets(currentPlayer, this.gameContext.turnNumber);
            this.debug.renderDebugHUD(this.gameContext, `Road placed.`);
        } else if (event.type === 'CANCEL_ACTION') {
            this.gameContext.currentState = GameState.MAIN;
            this.deactivateRoadPlacementMode();
            this.debug.renderDebugHUD(this.gameContext, `Road building cancelled.`);
        }
    }

    handleStateMainBuildSettlement(event) {
        if (event.type == 'PLACE_SETTLEMENT') {
            // place settlement logic
            this.gameContext.currentState = GameState.MAIN;
            this.deactivateSettlementPlacementMode();

            const settlementId = event.vertexId;
            const currentPlayer = this.getCurrentPlayer();

            // check if player can afford settlement
            if (!currentPlayer.canAfford(COSTS.settlement)) {
                this.debug.renderDebugHUD(this.gameContext, `Player ${currentPlayer.id} cannot afford to build a settlement.`);
                return;
            }

            // deduct settlement cost from player and bank
            currentPlayer.addResources(COSTS.settlement);
            this.addBankResourceFromCost(COSTS.settlement);
            // add settlement to map and render
            this.addSettlementToPlayerAndRender(settlementId, currentPlayer);
            this.renderer.renderPlayerAssets(currentPlayer, this.gameContext.turnNumber);
            this.debug.renderDebugHUD(this.gameContext, `Settlement placed.`);

        } else if (event.type === 'CANCEL_ACTION') {
            this.gameContext.currentState = GameState.MAIN;
            this.deactivateSettlementPlacementMode();
            this.debug.renderDebugHUD(this.gameContext, `Settlement building cancelled.`);
        }
    }


    handleStateMainBuildCity(event) {
        if (event.type == 'PLACE_SETTLEMENT') { // this might seem odd but we are reusing the settlement placement for city placement click event
            // place city logic
            this.gameContext.currentState = GameState.MAIN;
            this.deactivateSettlementPlacementMode();

            const cityId = event.vertexId;
            const currentPlayer = this.getCurrentPlayer();
            // check if player can afford city
            if (!currentPlayer.canAfford(COSTS.city)) {
                this.debug.renderDebugHUD(this.gameContext, `Player ${currentPlayer.id} cannot afford to build a city.`);
                return;
            }

            // deduct city cost from player and bank
            currentPlayer.addResources(COSTS.city);
            this.addBankResourceFromCost(COSTS.city);
            this.renderer.renderPlayerAssets(currentPlayer, this.gameContext.turnNumber);

            // add city to map and render
            this.addCityToPlayerAndRender(cityId, currentPlayer);
            this.debug.renderDebugHUD(this.gameContext, `City placed.`);

        } else if (event.type === 'CANCEL_ACTION') {
            this.gameContext.currentState = GameState.MAIN;
            this.deactivateSettlementPlacementMode();
            this.debug.renderDebugHUD(this.gameContext, `City building cancelled.`);
        }
    }


    handleStateMainBuyDevCard(event) {
        if (event.type === 'CONFIRM_ACTION') {
            // check if player can afford dev card
            const currentPlayer = this.getCurrentPlayer();
            if (!currentPlayer.canAfford(COSTS.devCard)) {
                this.gameContext.currentState = GameState.MAIN;
                this.debug.renderDebugHUD(this.gameContext, `Player ${currentPlayer.id} cannot afford to buy a development card.`);
                return;
            }

            // deduct dev card cost from player and bank
            currentPlayer.addResources(COSTS.devCard);
            this.addBankResourceFromCost(COSTS.devCard);

            // add dev card to player and render
            const devCard = this.gameContext.devCardDeck.drawCard(this.gameContext.turnNumber);
            currentPlayer.addDevCard(devCard);

            this.renderer.renderPlayerAssets(currentPlayer, this.gameContext.turnNumber);
            this.gameContext.currentState = GameState.MAIN;
            this.debug.renderDebugHUD(this.gameContext, `Development card purchased.`);

        } else if (event.type === 'CANCEL_ACTION') {
            this.gameContext.currentState = GameState.MAIN;
            this.debug.renderDebugHUD(this.gameContext, `Development card purchase cancelled.`);
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

    activateSettlementPlacementMode(vCoord) {
        if (this.renderer) {
            // compute all valid settlement spots
            this.renderer.activateSettlementPlacementMode(vCoord);
        } else {
            console.warn("Renderer not attached. Cannot activate settlement placement mode.");
        }
    }

    deactivateSettlementPlacementMode() {
        if (this.renderer) {
            this.renderer.deactivateSettlementPlacementMode();
        } else {
            console.warn("Renderer not attached. Cannot deactivate settlement placement mode.");
        }
    }

    // Activate road placement mode based on a given edge coordinate list
    activateRoadPlacementMode(eCoordList) {
        if (this.renderer) {
            this.renderer.activateRoadPlacementMode(eCoordList);
        } else {
            console.warn("Renderer not attached. Cannot activate road placement mode.");
        }
    }

    deactivateRoadPlacementMode() {
        if (this.renderer) {
            this.renderer.deactivateRoadPlacementMode();
        } else {
            console.warn("Renderer not attached. Cannot deactivate road placement mode.");
        }
    }


    activateDiceRollMode() {
        if (this.renderer) {
            this.renderer.activateDiceRollMode();
        } else {
            console.warn("Renderer not attached. Cannot activate dice roll mode.");
        }
    }

    deactivateDiceRollMode() {
        if (this.renderer) {
            this.renderer.deactivateDiceRollMode();
        } else {
            console.warn("Renderer not attached. Cannot deactivate dice roll mode.");
        }
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

    // activate all action buttons 
    activateActionBtnMode(actionType) {
        if (this.renderer) {
            this.renderer.activateActionBtnMode(actionType);
        } else {
            console.warn("Renderer not attached. Cannot activate action button mode.");
        }
    }


    addSettlementToPlayerAndRender(vertexId, player) {
        // double check if the spot is valid in case of cheating
        const vCoord = HexUtils.idToCoord(vertexId);
        if (!this.gameContext.gameMap.isSettlementSpotValid(vCoord)) { // no owner check for initial placement
            throw new Error(`Invalid settlement spot: ${vCoord}`);
        }

        // add settlement to map
        this.gameContext.gameMap.updateSettlementById(vertexId, player.id, 1);
        player.addSettlement(this.gameContext.gameMap.settlements.get(vertexId));
        this.gameContext.lastSettlementPlaced = vertexId;

        this.renderer.renderSettlement(vertexId, player.color, 1);
    }

    addCityToPlayerAndRender(vertexId, player) {
        // double check if city upgrade is valid in case of cheating
        const settlement = this.gameContext.gameMap.settlements.get(vertexId);
        if (!settlement || settlement.owner !== player.id || settlement.level !== 1) {
            throw new Error(`Invalid city upgrade spot: ${vertexId}`);
        }

        // update city to map
        settlement.upgrade();

        // render city
        this.renderer.renderSettlement(vertexId, player.color, 2);
    }

    addRoadToPlayerAndRender(edgeId, player, phase = 'MAIN') {
        // double check if the spot is valid in case of cheating
        const eCoord = HexUtils.idToCoord(edgeId);

        if (phase === 'INITIAL') {
            // during initial placement, check if the road is connected to the last settlement placed
            if (!this.gameContext.gameMap.isRoadSpotValid(eCoord, null) && !this.gameContext.gameMap.isRoadConnectedToSettlement(eCoord, this.gameContext.lastSettlementPlaced, player.id)) {
                throw new Error(`Invalid road spot: ${eCoord}`);
            }
        } else {
            if (!this.gameContext.gameMap.isRoadSpotValid(eCoord, player.id)) { // check owner for normal placement (either connected to own settlement or road)
                throw new Error(`Invalid road spot: ${eCoord}`);
            }
        }

        // add road to map
        this.gameContext.gameMap.updateRoadById(edgeId, player.id);
        player.addRoad(this.gameContext.gameMap.roads.get(edgeId));

        // render road
        this.renderer.renderRoad(edgeId, player.color);
    }

    /**
     * One of the two will happen:
     * Trigger discard card process if possible, transit to discard stage, OR
     * When no one needs to discard, activate robber placement mode, transit to move robber stage
     */
    discardCardAndActivateRobber() {
        this.gameContext.playersToDiscard = this.getPlayersNeedsToDiscard();
        if (this.gameContext.playersToDiscard.length > 0) {
            // activate selection mode for discarding cards
            this.renderer.activateDiscardSelectionMode(this.gameContext.playersToDiscard[0]);
            this.gameContext.currentState = GameState.DISCARD; // wait for players to discard
            this.debug.renderDebugHUD(this.gameContext);
        } else {
            // no one need to discard
            this.activateRobber(GameState.MAIN); // this is after finish rolling dice, therefore return to MAIN state
        }
    }

    /**
     * Start the robber placement -> move robber process -> steal routine, this eventually will transit to returnToState state
     * @param {*} returnToState state to return to after robber process is complete
     */
    activateRobber(returnToState) {
        this.gameContext.returnToStateAfterRob = returnToState; // store the state to return to after robber process
        this.renderer.activateRobberPlacementMode(this.gameContext.gameMap.searchTileCoordsWithoutRobber()); // render to select where to move robber
        this.gameContext.currentState = GameState.MOVE_ROBBER;
        this.debug.renderDebugHUD(this.gameContext);
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
        if (event.type !== 'CONFIRM_DISCARD') {
            return;
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
                throw new Error(`Player does not have enough ${cardType} cards to discard`);
            }
            selectedCount += discardCount[cardType];
        }

        if (selectedCount !== requiredDiscard) {
            throw new Error(`Player must discard exactly ${requiredDiscard} cards, but selected ${selectedCount}`);
        }

        // pass validation test,
        this.renderer.deactivateDiscardSelectionMode();

        // actually discard the cards
        player.discardResources(discardCount);

        // remove player from playersToDiscard list
        this.gameContext.playersToDiscard.shift();

        // if there are more players to discard, activate selection mode for next player
        if (this.gameContext.playersToDiscard.length > 0) {
            this.renderer.activateDiscardSelectionMode(this.gameContext.playersToDiscard[0]);
        } else {
            // no more players to discard, activate move robber mode
            this.renderer.deactivateDiscardSelectionMode();
            this.renderer.activateRobberPlacementMode(this.gameContext.gameMap.searchTileCoordsWithoutRobber());
            this.gameContext.currentState = GameState.MOVE_ROBBER;
            this.debug.renderDebugHUD(this.gameContext, `All players have discarded. Please move the robber.`);

        }
    }


    handleStateMoveRobber(event) {
        if (event.type !== 'PLACE_ROBBER') {
            return;
        }

        const robTileId = event.tileId;
        // check if the tile is valid
        if (!this.gameContext.gameMap.isRobableTile(robTileId)) {
            throw new Error(`Invalid robber placement tile: ${robTileId}`);
        }
        // deactivate robber placement mode
        this.renderer.deactivateRobberPlacementMode();

        // update robber position on map
        const robTileCoord = HexUtils.idToCoord(robTileId);
        this.gameContext.gameMap.moveRobberToTile(robTileCoord);
        this.renderer.moveRobberToTile(robTileCoord);

        // get player list adjacent to the robber tile to steal from
        const adjacentSettlements = this.gameContext.gameMap.searchSettlementsByTileId(robTileId);
        const robableSettlements = adjacentSettlements.filter(
            settlement => settlement.owner !== this.getCurrentPlayer().id &&
                this.gameContext.players[settlement.owner].getTotalResourceCount() > 0
        ); // only settlements owned by other players with resources

        if (robableSettlements.length === 0) {
            // no one to rob, rob process complete, transition to MAIN state
            this.gameContext.currentState = GameState.MAIN;
            this.debug.renderDebugHUD(this.gameContext, `Robber moved. No players to rob. Turn continues.`);
            return;
        }

        const robableSettlementsCoords = robableSettlements.map(settlement => settlement.coord);
        // activate rob selection mode
        this.renderer.activateRobSelectionMode(robableSettlementsCoords, HexUtils.idToCoord(robTileId));
        this.gameContext.currentState = GameState.ROB_PLAYER;
        this.debug.renderDebugHUD(this.gameContext, `Robber moved. Please select a player to rob.`);
    }


    handleStateRobPlayer(event) {
        if (event.type !== 'ROB_PLAYER') {
            return;
        }

        // targeted settlement and player
        const targetVertexId = event.vertexId;
        const settlement = this.gameContext.gameMap.settlements.get(targetVertexId);
        const targetPlayer = this.gameContext.players[settlement.owner];
        const totalResourceCount = targetPlayer.getTotalResourceCount();

        // check if the settlement is valid to rob from
        if (!settlement || settlement.owner !== targetPlayer.id || totalResourceCount === 0) {
            throw new Error(`Invalid rob target settlement: ${targetVertexId}`);
        }

        // deactivate rob selection mode
        this.renderer.deactivateRobSelectionMode();

        // steal a random resource from the target player

        // compute the resource index to steal
        const randomIndex = this.rng.nextInt(0, totalResourceCount - 1); // generate a random index from 0 to  n-1

        const stolenResources = targetPlayer.removeResourceByIndicies([randomIndex]);
        this.getCurrentPlayer().addResources(stolenResources);

        // whole rob process complete, transition to MAIN state
        this.gameContext.currentState = this.gameContext.returnToStateAfterRob;
        this.gameContext.returnToStateAfterRob = null; // reset return state

        // render updated player assets
        this.renderer.renderPlayerAssets(this.getCurrentPlayer(), this.gameContext.turnNumber);
        this.debug.renderDebugHUD(this.gameContext, `Robbed Player ${targetPlayer.id} and stole ${Object.entries(stolenResources).map(([type, amount]) => `${amount} ${type}`).join(', ')}.`);

    }

    updateLargestArmy() {
        this.gameContext.players.forEach(player => {
            const armySize = player.achievements.knightPlayed;
            if (armySize >= 3) {
                if (!this.gameContext.playerWithLargestArmy || this.gameContext.players[this.gameContext.playerWithLargestArmy].achievements.knightPlayed < armySize) {
                    // no current largest army holder or current player has larger army than existing holder
                    this.gameContext.playerWithLargestArmy = player.id;
                    this.debug.renderDebugHUD(this.gameContext, `Player ${player.id} now has the Largest Army with ${armySize} knights played.`);
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
                    this.debug.renderDebugHUD(this.gameContext, `Player ${player.id} now has the Longest Road with ${longestRoadLength} segments.`);
                }
            }
        });
    }
}
