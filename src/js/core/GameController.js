import { GameMap } from '../models/GameMap.js';
import { ResourceType } from '../constants/ResourceType.js';
import { Player } from '../models/Player.js';
import { Dice } from './Dice.js';
import { RNG } from '../utils/rng.js';
import { HexUtils } from '../utils/hex-utils.js';
import {COSTS} from '../constants/GameConstants.js';

export const GameState = Object.freeze({
    SETUP: 'SETUP', // prompt UI wait for game setup
    INIT: 'INIT',
    PLACE_SETTLEMENT1: 'PLACE_SETTLEMENT1', // place first settlement and road
    PLACE_ROAD1: 'PLACE_ROAD1',
    PLACE_SETTLEMENT2: 'PLACE_SETTLEMENT2', // place second settlement and road
    PLACE_ROAD2: 'PLACE_ROAD2',
    ROLL: 'ROLL', // roll dice phase
    MAIN: 'MAIN', // main game loop: build, trade, end turn
    MAIN_BUILD_ROAD: 'MAIN_BUILD_ROAD', // main game loop: build road sub-state
    MAIN_BUILD_SETTLEMENT: 'MAIN_BUILD_SETTLEMENT', // main game loop: build settlement sub-state
    MAIN_BUILD_CITY: 'MAIN_BUILD_CITY', // main game loop: build city sub-state
    MAIN_BUY_DEV_CARD: 'MAIN_BUY_DEV_CARD', // main game loop: buy development card sub-state
    MAIN_PLAY_DEV_CARD: 'MAIN_PLAY_DEV_CARD', // main game loop: play development card sub-state
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
            gameMap: new GameMap(this.rng),
            players: [], // circular array of Player instances
            currentPlayerIndex: 0, // track whose turn it is
            totalPlayers: 0,
            humanPlayers: 0,
            aiPlayers: 0,
            turnNumber: 0,
            seed: this.seed,
            rng: this.rng,
            dice: new Dice(this.rng),
            currentState: GameState.SETUP,
            lastSettlementPlaced: null // track last settlement coord placed for resource distribution
        }

        this.bankResources.clear();
        Object.values(ResourceType).forEach(type => {
            if (type !== ResourceType.DESERT) {
                this.bankResources.set(type, 19); // standard Catan bank count
            }
        });
    }

    attachRenderer(renderer) {
        this.renderer = renderer;
    }

    attachDebug(debug) {
        this.debug = debug;
    }

    updateDebugHUD() {
        if (this.debug) {
            this.debug.renderDebugHUD(this.gameContext);
        } else {
            console.warn("Debug not attached. Cannot update debug HUD.");
        }
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
            case GameState.MAIN: // nested main states
                this.handleStateMain(event);
                break;
            case GameState.MAIN_BUILD_ROAD:
                // handle main build road events
                this.handleStateMainBuildRoad(event);
                break;
            case GameState.MAIN_BUILD_SETTLEMENT:
            case GameState.MAIN_BUILD_CITY:
            case GameState.MAIN_BUY_DEV_CARD:
            case GameState.MAIN_PLAY_DEV_CARD:
                break;
            case GameState.END:
                // handle end game events
                await this.handleStateEnd(event);
                break;
            default:
                throw new Error(`Unknown game state: ${this.gameContext.currentState}`);
        }
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

        // debug: print event
        console.log("Game Setup Event:", event);

        // set up players
        let gameContext = this.gameContext;
        gameContext.humanPlayers = event.humanPlayers;
        gameContext.aiPlayers = event.aiPlayers;
        gameContext.totalPlayers = gameContext.humanPlayers + gameContext.aiPlayers;
        gameContext.seed = event.seed || Date.now();

        const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple'];
        const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank'];

        // create player instances
        for (let i = 0; i < gameContext.humanPlayers; i++) {
            gameContext.players.push(new Player(i, names[i], colors[i], 'HUMAN'));
        }
        for (let j = 0; j < gameContext.aiPlayers; j++) {
            gameContext.players.push(new Player(gameContext.humanPlayers + j, `AI_${j + 1}`, colors[gameContext.humanPlayers + j], 'AI'));
        }
        // generate map
        await this.generateDefaultMap(this.gameContext.seed);

        this.gameContext.currentState = GameState.PLACE_SETTLEMENT1;

        // render the initial map and prompt to place first settlement
        if (this.renderer) {
            // render intial map
            const gameMap = this.gameContext.gameMap
            this.renderer.renderMainUI(gameMap.terrains, gameMap.tradingPosts, gameMap.robberCoord);

            // "activate" vertex elements for settlement placement
            this.activateSettlementPlacementMode();

        } else {
            console.warn("Renderer not attached. Cannot render game map.");
        }

        // update debug HUD
        this.updateDebugHUD();
        this.renderDebugHUDLog("Game started. Please place your first settlement.");
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
        this.addSettlementToPlayer(vertexId, this.getCurrentPlayer());

        const currentPlayer = this.getCurrentPlayer();
        this.gameContext.gameMap.updateSettlementById(vertexId, currentPlayer.id, 1);
        currentPlayer.addSettlement(vertexId);
        this.gameContext.lastSettlementPlaced = vertexId;

        // render updated settlement on map
        this.renderer.renderSettlement(vertexId, currentPlayer.color, 1);

        this.gameContext.currentState = GameState.PLACE_ROAD1;
        // compute all valid road spots based on last settlement placed
        const availableEdgeIds = this.gameContext.gameMap.getValidRoadSpotsFromVertex(vCoord, null);
        this.activateRoadPlacementMode(availableEdgeIds);
        this.updateDebugHUD();
        this.renderDebugHUDLog(`Settlement placed at vertex ${event.vertexId}. Please place your first road.`);
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
        this.addRoadToPlayer(event.edgeId, currentPlayer, 'INITIAL');

        // render updated road on map
        this.renderer.renderRoad(event.edgeId, currentPlayer.color);

        // check if current player is last player
        if (this.gameContext.currentPlayerIndex === this.gameContext.totalPlayers - 1) {
            // if last player, move to PLACE_SETTLEMENT2 state, same player places second settlement (by rule)
            this.gameContext.currentState = GameState.PLACE_SETTLEMENT2;
        } else {
            // else move to next player and PLACE_SETTLEMENT1 state
            this.nextPlayer();
            this.gameContext.currentState = GameState.PLACE_SETTLEMENT1;
        }

        this.activateSettlementPlacementMode();
        this.updateDebugHUD();
        this.renderDebugHUDLog(`Road placed at edge ${event.edgeId}. Next player place settlement 1.`);
    }

    handleStatePlaceSettlement2(event) {
        if (event.type !== 'PLACE_SETTLEMENT') {
            return;
        }

        this.deactivateSettlementPlacementMode();

        // add settlement to map
        const vCoord = HexUtils.idToCoord(event.vertexId);
        const vertexId = event.vertexId;
        this.addSettlementToPlayer(vertexId, this.getCurrentPlayer());

        // move to previous player and PLACE_ROAD2 state (since placement is in reverse order in the second round by rule)
        this.gameContext.currentState = GameState.PLACE_ROAD2;
        const avaibleRoads = this.gameContext.gameMap.getValidRoadSpotsFromVertex(vCoord, null); // connected to last settlement placed

        this.activateRoadPlacementMode(avaibleRoads);
        this.updateDebugHUD();
        this.renderDebugHUDLog(`Second settlement placed at vertex ${vertexId}. Next player place road 2.`);
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
        this.addRoadToPlayer(event.edgeId, currentPlayer, 'INITIAL');

        // render updated road on map
        this.renderer.renderRoad(event.edgeId, currentPlayer.color);

        // add adjacnet resources to player for second settlement
        const adjacentResources = this.gameContext.gameMap.getResourcesAdjacentToSettlement(this.gameContext.lastSettlementPlaced);
        console.log("Distributing initial resources for second settlement:", adjacentResources);
        adjacentResources.forEach(resourceType => {
            currentPlayer.addResource({[resourceType]: 1});
            this.addBankResource({[resourceType]: -1});
        });

        // check if current player is the first player
        if (this.gameContext.currentPlayerIndex === 0) {
            // if fisrt player, game setup is complete, move to ROLL state
            this.gameContext.currentState = GameState.ROLL;
            // prompt first player to roll dice
            this.updateDebugHUD();
            this.renderDebugHUDLog(`Road placed at edge ${event.edgeId}. Setup complete.`);
        } else {
            // else move to previous player and PLACE_SETTLEMENT2 state
            this.prevPlayer();
            this.gameContext.currentState = GameState.PLACE_SETTLEMENT2;
            this.activateSettlementPlacementMode();
            this.updateDebugHUD();
            this.renderDebugHUDLog(`Road placed at edge ${event.edgeId}. Next player place settlement 2.`);
        }
    }

    async handleStateRoll(event) {
        if (event.type !== 'ROLL_DICE') {
            return;
        }

        // roll dice and update game state
        const rollResult = this.gameContext.dice.roll(2);
        this.gameContext.lastRoll = rollResult;

        // distribute resources based on roll
        const rolledNumber = rollResult.sum;
        // get all the terrain ids with the rolled number token
        if (rolledNumber === 7) {
            console.log("Robber rolled! (Not implemented yet)");
        } else {
            this.distributeResourcesByRoll(rolledNumber);
        }

        // transition to MAIN state
        this.gameContext.currentState = GameState.MAIN;
        this.updateDebugHUD();
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
                break;
            case 'BUILD_CITY':
                // TODO: handle build city
                break;
            case 'BUY_DEV_CARD':
                // TODO: handle buy development card
                break;
            case 'PLAY_DEV_CARD':
                // TODO: handle play development card
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
        // end turn logic
        this.nextPlayer();
        this.nextTurn();
        this.gameContext.currentState = GameState.ROLL;
        this.debug.renderDebugHUD(this.gameContext, `Turn ended. Next player: Player ${this.getCurrentPlayer().id}. Please roll the dice.`);
    }

    __handleEventBuildRoad(event) {
        // build road logic
        this.gameContext.currentState = GameState.MAIN_BUILD_ROAD;

        // get current player
        const currentPlayer = this.getCurrentPlayer();
        const playerRoadIds = currentPlayer.getOwnedAssets()["roads"]
        const playerRoadCoords = playerRoadIds.map(roadId => HexUtils.idToCoord(roadId));

        // compute all valid road spots based on player's owned roads
        let availableRoads = [];
        playerRoadCoords.forEach(eCoord => {
            HexUtils.getVerticesFromEdge(eCoord).forEach(vCoord => {
                const availableECoords = this.gameContext.gameMap.getValidRoadSpotsFromVertex(vCoord, currentPlayer.id);
                availableRoads = availableRoads.concat(availableECoords);
            });
        });    
        console.log("Player owned roads:", availableRoads);        

        // activate road placement mode based on all settlement coords
        this.activateRoadPlacementMode(availableRoads, currentPlayer.id);
        this.debug.renderDebugHUD(this.gameContext, `Building road. Please place your road.`);
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
            }else{
                currentPlayer.addResource({ [ResourceType.BRICK]: -1, [ResourceType.LUMBER]: -1 });
                this.addBankResource({ [ResourceType.BRICK]: -1, [ResourceType.LUMBER]: -1 });
            }
            // deduct road cost from player and bank

            this.addRoadToPlayer(roadId, currentPlayer, 'MAIN');
            this.renderer.renderRoad(event.edgeId, currentPlayer.color);
            this.debug.renderDebugHUD(this.gameContext, `Road placed.`);
        }else if (event.type === 'CANCEL') {
            this.gameContext.currentState = GameState.MAIN;
            this.deactivateRoadPlacementMode();
            this.debug.renderDebugHUD(this.gameContext, `Road building cancelled.`);
        }
    }





    async generateDefaultMap() {
        // load standard map layout
        await this.gameContext.gameMap.loadMapFromJson('./src/assets/data/standard_map.json');
        // assign default resources and number tokens
        // 1. get target coords (all coords)
        const allCoords = this.gameContext.gameMap.getAllTerrainCoords();
        this.gameContext.gameMap.assignTerrainTypesRandom(allCoords, { 'hill': 4, 'mountain': 3, 'pasture': 4, 'field': 4, 'forest': 3, 'desert': 1 });

        // 2. get terrains that are not desert
        const productionCoords = [];
        allCoords.forEach(coord => {
            const terrain = this.gameContext.gameMap.terrains.get(HexUtils.coordToId(coord));

            if (terrain.type == 'desert') {
                this.gameContext.gameMap.robberCoord = coord;
            } else {
                // It's a resource-producing hex
                productionCoords.push(coord);
            }
        });

        this.gameContext.gameMap.assignTerrainNumberTokensRandom(productionCoords, { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 });
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
     * @param {Object} resources resources to update {resourceType: amount, ...}
     */
    addBankResource(resources) {
        for (let [type, amount] of Object.entries(resources)) {
            if (this.bankResources.has(type)) {
                const current = this.bankResources.get(type);
                this.bankResources.set(type, current + amount);
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

    activateSettlementPlacementMode() {
        if (this.renderer) {
            // compute all valid settlement spots
            const availableVertexIds = this.gameContext.gameMap.getValidSettlementSpots();
            this.renderer.activateSettlementPlacementMode(availableVertexIds);
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
    activateRoadPlacementMode(eCoordList, owner = null) {
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


    executeCheat(inputString) {
        const parts = inputString.split('_');
        const action = parts[0].toLowerCase(); // e.g., "/add"


        if (action === '/add') {
            const target = parts[1]?.toLowerCase(); // e.g., "wheat"
            const value = parseInt(parts[2]);      // e.g., 5

            const player = this.getCurrentPlayer();
            this.distributeResourceToPlayer(player.id, target, value);
            this.debug.renderDebugHUD(this.gameContext, `Cheat: Added ${value} ${target} to Player ${player.id}`);
        }

        if (action === '/dist') {
            const rolledNumber = parseInt(parts[1]);

            this.distributeResourcesByRoll(rolledNumber);
            this.debug.renderDebugHUD(this.gameContext, `Cheat: Rolled a ${rolledNumber} and distributed resources accordingly.`);
        }
    }


    /**
     * Distribute resources to players based on the rolled number.
     * @param {*} rolledNumber 
     */
    distributeResourcesByRoll(rolledNumber) {
        // get all the terrain ids with the rolled number token
        const gameMap = this.gameContext.gameMap;
        const terrainIds = gameMap.searchTerrainIdByNumberToken(rolledNumber);
        terrainIds.forEach(terrainId => {
            const terrain = gameMap.terrains.get(terrainId);
            // get all adjacent vertex coords
            const adjacentVertexCoords = HexUtils.getVerticesFromHex(terrain.coord);
            adjacentVertexCoords.forEach(vCoord => {
                const vertexId = HexUtils.coordToId(vCoord);
                // check if there is a settlement at this vertex
                if (gameMap.settlements.has(vertexId)) {
                    const settlement = gameMap.settlements.get(vertexId);
                    const ownerId = settlement.owner;
                    const resourceType = terrain.resource;
                    const amount = (settlement.level === 1) ? 1 : 2; // settlement gives 1, city gives 2
                    // distribute resource to player with ownerId
                    this.distributeResourceToPlayer(ownerId, resourceType, amount);
                }
            });
        });
    }

    distributeResourceToPlayer(playerId, resourceType, amount) {
        // find the player in the game context and give them the resource
        const player = this.gameContext.players.find(p => p.id === playerId);
        if (player) {
            player.addResource({[resourceType]: amount});
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


    addSettlementToPlayer(vertexId, player) {
        // double check if the spot is valid in case of cheating
        const vCoord = HexUtils.idToCoord(vertexId);
        if (!this.gameContext.gameMap.isSettlementSpotValid(vCoord)) { // no owner check for initial placement
            throw new Error(`Invalid settlement spot: ${vCoord}`);
        }

        // add settlement to map
        this.gameContext.gameMap.updateSettlementById(vertexId, player.id, 1);
        player.addSettlement(vertexId);
        this.gameContext.lastSettlementPlaced = vertexId;

        // render updated settlement on map
        this.renderer.renderSettlement(vertexId, player.color, 1);
    }

    addRoadToPlayer(edgeId, player, phase = 'MAIN') {
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
        player.addRoad(edgeId);
    }
}