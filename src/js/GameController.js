import { GameMap } from './map/GameMap.js';
import { ResourceType } from './map/ResourceType.js';
import { Player } from './Player.js';
import {Dice} from './Dice.js';
import { SeededRandom } from './SeededRandom.js';
import { HexUtils } from './utils/hex-utils.js';

export const GameState = Object.freeze({
    SETUP: 'SETUP', // prompt UI wait for game setup
    INIT: 'INIT',
    PLACE_SETTLEMENT1: 'PLACE_SETTLEMENT1', // place first settlement and road
    PLACE_ROAD1: 'PLACE_ROAD1',
    PLACE_SETTLEMENT2: 'PLACE_SETTLEMENT2', // place second settlement and road
    PLACE_ROAD2: 'PLACE_ROAD2',
    ROLL: 'ROLL', // roll dice phase
    MAIN: 'MAIN', // main game loop: build, trade, end turn
    END: 'END' // game has ended
});

export class GameController {
    constructor() {
        this.renderer = null;

        // game setup
        this.seed = 0;
        this.rng = new SeededRandom(this.seed);
        this.gameContext = {};
        this.bankResources = new Map();
        this.resetGame();        
    }

        resetGame(){
        // reset game context
        this.gameContext = {
            gameMap: new GameMap(),
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

    attachRenderer(renderer){
        this.renderer = renderer;
    }

    updateDebugHUD(){
        if (this.renderer){
            this.renderer.renderDebugHUD(this.gameContext);
        }else{
            console.warn("Renderer not attached. Cannot update debug HUD.");
        }
    }

    renderDebugHUDLog(message){
        if (this.renderer){
            this.renderer.renderDebugHUDLog(message);
        }else{
            console.warn("Renderer not attached. Cannot render debug HUD log.");
        }
    }

    // main game loop methods would go here
    async inputEvent(event){
        console.log(`State: ${this.gameContext.currentState} | Event: ${event.type}`);
        
        switch(this.gameContext.currentState){
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
            case GameState.MAIN:
                // handle main game events  
                await this.handleStateMain(event);
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
    async handleStateSetup(event){
        if (event.type !== 'START_GAME'){
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
            gameContext.players.push(new Player(i, names[i], colors[i],'HUMAN'));
        }
        for (let j = 0; j < gameContext.aiPlayers; j++) {
            gameContext.players.push(new Player(gameContext.humanPlayers + j, `AI_${j+1}`, colors[gameContext.humanPlayers + j],'AI'));
        }
        // generate map
        await this.generateDefaultMap(this.gameContext.seed);
        
        this.gameContext.currentState = GameState.PLACE_SETTLEMENT1;

        // render the initial map and prompt to place first settlement
        if (this.renderer){
            // render intial map
            const gameMap = this.gameContext.gameMap
            this.renderer.renderInitialMap(gameMap.tiles, gameMap.tradingPosts, gameMap.robberTileCoord);

            // "activate" vertex elements for settlement placement
            this.activateSettlementPlacementMode();

        }else{
            console.warn("Renderer not attached. Cannot render game map.");
        }

        // update debug HUD
        this.updateDebugHUD();
        this.renderDebugHUDLog("Game started. Please place your first settlement.");
    }

    async handleStatePlaceSettlement1(event){
        if (event.type !== 'PLACE_SETTLEMENT'){
            return;
        }

        // place settlement logic here
        // deactivate settlement placement mode
        this.renderer.deactivateSettlementPlacementMode();

        // add settlement to map
        const vCoord = HexUtils.idToCoord(event.vertexId);
        const vertexId = event.vertexId;
        const currentPlayer = this.getCurrentPlayer();
        this.gameContext.gameMap.updateSettlementById(vertexId, currentPlayer.id, 1);
        currentPlayer.addSettlement(vertexId);
        this.gameContext.lastSettlementPlaced = vertexId;

        // render updated settlement on map
        this.renderer.renderSettlement(vertexId, currentPlayer.color, 1);

        // TODO: activate road placement mode for first road
        this.gameContext.currentState = GameState.PLACE_ROAD1;
        this.activateRoadPlacementMode(vCoord); 
        this.updateDebugHUD();
        this.renderDebugHUDLog(`Settlement placed at vertex ${event.vertexId}. Please place your first road.`);
    }

    async handleStatePlaceRoad1(event){
        if (event.type !== 'PLACE_ROAD'){
            return;
        }
        // place road logic here
        // deactivate road placement mode
        this.renderer.deactivateRoadPlacementMode();
        
        // add road to map
        const currentPlayer = this.getCurrentPlayer();
        this.gameContext.gameMap.updateRoadById(event.edgeId, currentPlayer.id);
        currentPlayer.addRoad(event.edgeId);
        
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

    handleStatePlaceSettlement2(event){ 
        if (event.type !== 'PLACE_SETTLEMENT'){
            return;
        }

        this.deactivateSettlementPlacementMode();

        // add settlement to map
        const vertexId = event.vertexId;
        const settlementCoord = HexUtils.idToCoord(vertexId)
        const currentPlayer = this.getCurrentPlayer();
        this.gameContext.gameMap.updateSettlementById(vertexId, currentPlayer.id, 1);
        currentPlayer.addSettlement(vertexId);
        this.gameContext.lastSettlementPlaced = vertexId;

        // render updated settlement on map
        this.renderer.renderSettlement(vertexId, currentPlayer.color, 1);

        // move to previous player and PLACE_ROAD2 state (since placement is in reverse order in the second round by rule)
        this.gameContext.currentState = GameState.PLACE_ROAD2;
        this.activateRoadPlacementMode(settlementCoord); 
        this.updateDebugHUD();
        this.renderDebugHUDLog(`Second settlement placed at vertex ${vertexId}. Next player place road 2.`);
    }

    handleStatePlaceRoad2(event){
        if (event.type !== 'PLACE_ROAD'){
            return;
        }
        // place road logic here
        // deactivate road placement mode
        this.renderer.deactivateRoadPlacementMode();
        
        // add road to map and register its ownership
        const currentPlayer = this.getCurrentPlayer();
        this.gameContext.gameMap.updateRoadById(event.edgeId, currentPlayer.id);
        currentPlayer.addRoad(event.edgeId);
        
        // render updated road on map
        this.renderer.renderRoad(event.edgeId, currentPlayer.color);

        // add adjacnet resources to player for second settlement
        const adjacentResources = this.gameContext.gameMap.getResourcesAdjacentToSettlement(this.gameContext.lastSettlementPlaced);
        console.log("Distributing initial resources for second settlement:", adjacentResources);
        adjacentResources.forEach(resourceType => {
            currentPlayer.addResource(resourceType, 1);
            this.updateBankResource(resourceType, -1);
        });

        // check if current player is the first player
        if (this.gameContext.currentPlayerIndex === 0) {
            // if fisrt player, game setup is complete, move to ROLL state
            this.gameContext.currentState = GameState.ROLL;
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

    async handleStateRoll(event){
        if (event.type !== 'ROLL_DICE'){
            return;
        }

        // roll dice and update game state
        const rollResult = this.gameContext.dice.roll(2);
        console.log("Dice rolled:", rollResult);
        this.updateDebugHUD();
    }




    async generateDefaultMap(seed = Date.now()){
        // load standard map layout
        await this.gameContext.gameMap.loadMapFromJson('./src/assets/map_layout/standard_map.json');
        // assign default resources and number tokens
        this.gameContext.gameMap.assignResourceRandom(seed, {'WOOD':4, 'BRICK':3, 'SHEEP':4, 'WHEAT':4, 'ROCK':3, 'DESERT':1});
        this.gameContext.gameMap.assignNumberTokenRandom(seed, [2,3,3,4,4,5,5,6,6,7,8,8,9,9,10,10,11,11,12]);
        // serach desert tile and swap with center tile
        let desert_id = this.gameContext.gameMap.searchTileByResource(ResourceType.DESERT)
        this.gameContext.gameMap.swapTile(desert_id[0], `0,0,0`, true, false);
        // serach number token 7 and swap with desert tile
        let token7_id = this.gameContext.gameMap.searchTileByNumberToken(7)
        this.gameContext.gameMap.swapTile(token7_id[0], `0,0,0`, false, true);

        // debug: print map info
        console.log("Generated Default Map:");
        console.log(this.gameContext.gameMap);
    }

    isBankResourceAvailable(cost) {
        for (let [type, amount] of Object.entries(cost)) {
            if (this.bankResources.get(type) < amount) {
                return false;
            }
        }
        return true;
    }

    updateBankResource(type, amount) {
        if (this.bankResources.has(type)) {
            const current = this.bankResources.get(type);
            this.bankResources.set(type, current + amount);
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

    activateSettlementPlacementMode(){
        if (this.renderer){
            // compute all valid settlement spots
            const availableVertexIds = this.gameContext.gameMap.getValidSettlementSpots();
            console.log("Activating settlement placement mode. Available vertices:", availableVertexIds);
            this.renderer.activateSettlementPlacementMode(availableVertexIds);
        }else{
            console.warn("Renderer not attached. Cannot activate settlement placement mode.");
        }
    }

    deactivateSettlementPlacementMode(){
        if (this.renderer){
            this.renderer.deactivateSettlementPlacementMode();
        }else{
            console.warn("Renderer not attached. Cannot deactivate settlement placement mode.");
        }
    }

    // Activate road placement mode based on a given vertex coordinate
    activateRoadPlacementMode(vCoord){
        if (this.renderer){
            // compute all valid road spots based on last settlement placed
            const availableEdgeIds = this.gameContext.gameMap.getValidRoadSpotsFromVertex(vCoord);
            console.log("Activating road placement mode. Available edges:", availableEdgeIds);
            this.renderer.activateRoadPlacementMode(availableEdgeIds);
        }else{
            console.warn("Renderer not attached. Cannot activate road placement mode.");
        }
    }

    deactivateRoadPlacementMode(){
        if (this.renderer){
            this.renderer.deactivateRoadPlacementMode();
        }else{
            console.warn("Renderer not attached. Cannot deactivate road placement mode.");
        }
    }
}