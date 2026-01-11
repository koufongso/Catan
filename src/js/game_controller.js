import { GameMap } from './map/game_map.js';
import { ResourceType } from './map/resource_type.js';
import { Player } from './player.js';
import {Dice} from './dice.js';
import { SeededRandom } from './seeded_random.js';

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
        this.gameMap = new GameMap();
        this.seed = 0;
        this.rng = new SeededRandom(this.seed);
        this.gameContext = {};
        this.bankResources = new Map();
        this.resetGame();        
    }

        resetGame(){
        // reset game context
        this.gameContext = {
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
            this.renderer.renderInitialMap(this.gameMap);

            // "activate" vertex elements for settlement placement
            this.renderer.activateSettlementPlacementMode(this.gameMap);

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
        const currentPlayer = this.getCurrentPlayer();
        this.gameMap.updateSettlementById(event.vertexId, currentPlayer.id, 1);
        currentPlayer.addSettlement(event.vertexId);

        // render updated settlement on map
        this.renderer.renderSettlement(event.vertexId, currentPlayer.color, 1);

        // TODO: activate road placement mode for first road
        this.gameContext.currentState = GameState.PLACE_ROAD1;
        this.renderer.activateRoadPlacementMode(this.gameMap, event.vertexId); 
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
        this.gameMap.updateRoadById(event.edgeId, currentPlayer.id);
        currentPlayer.addRoad(event.edgeId);
        
        // render updated road on map
        this.renderer.renderRoad(event.edgeId, currentPlayer.color);
        this.nextPlayer(); // move to next player for second settlement
        this.gameContext.currentState = GameState.PLACE_SETTLEMENT2;
        
        this.updateDebugHUD();
        this.renderDebugHUDLog(`Road placed at edge ${event.edgeId}. Please place your second settlement.`);
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
        await this.gameMap.loadMapFromJson('./src/assets/map_layout/standard_map.json');
        // assign default resources and number tokens
        this.gameMap.assignResourceRandom(seed, {'WOOD':4, 'BRICK':3, 'SHEEP':4, 'WHEAT':4, 'ROCK':3, 'DESERT':1});
        this.gameMap.assignNumberTokenRandom(seed, [2,3,3,4,4,5,5,6,6,7,8,8,9,9,10,10,11,11,12]);
        // serach desert tile and swap with center tile
        let desert_id = this.gameMap.searchTileByResource(ResourceType.DESERT)
        this.gameMap.swapTile(desert_id[0], `0,0,0`, true, false);
        // serach number token 7 and swap with desert tile
        let token7_id = this.gameMap.searchTileByNumberToken(7)
        this.gameMap.swapTile(token7_id[0], `0,0,0`, false, true);

        // debug: print map info
        console.log("Generated Default Map:");
        console.log(this.gameMap);
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

    nextTurn() {
        this.gameContext.turnNumber++;
    }



}