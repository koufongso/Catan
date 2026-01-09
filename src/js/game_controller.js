import { GameMap } from './map/game_map.js';
import { ResourceType } from './map/resource_type.js';
import { Player } from './player.js';

export const GameState = Object.freeze({
    SETUP: 'SETUP', // prompt UI wait for game setup
    INIT: 'INIT',
    INIT_SETTLEMENT_PLACEMENT1: 'INIT_SETTLEMENT_PLACEMENT1', // place first settlement and road
    INIT_SETTLEMENT_PLACEMENT2: 'INIT_SETTLEMENT_PLACEMENT2', // place second settlement and road
    ROLL: 'ROLL', // roll dice phase
    MAIN: 'MAIN', // main game loop
    END: 'END' // game has ended
});

export class GameController {
    constructor() {
        // game setup
        this.gameMap = new GameMap();
        this.players = []; // circular array of Player instances
        this.currentPlayerIndex = 0; // track whose turn it is
        this.totalPlayers = 0;
        this.humanPlayers = 0;
        this.aiPlayers = 0;
        this.turnNumber = 0;
        this.seed = 0;

        this.renderer = null;


        // bank resources could be added here
        this.bankResources = new Map();
        Object.values(ResourceType).forEach(type => {
            if (type !== ResourceType.DESERT) {
                this.bankResources.set(type, 19); // standard Catan bank count
            }
        });

        this.currentState = GameState.SETUP;
    }

    attachRenderer(renderer){
        this.renderer = renderer;
    }

    

    // main game loop methods would go here
    async inputEvent(event){
        console.log(`State: ${this.currentState} | Event: ${event.type}`);
        
        switch(this.currentState){
            case GameState.SETUP:
                // handle setup events
                await this.handleStateSetup(event);
                break;
            case GameState.INIT:
                // handle init events
                await this.handleStateInit(event);
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
                throw new Error(`Unknown game state: ${this.currentState}`);
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
        this.humanPlayers = event.humanPlayers;
        this.aiPlayers = event.aiPlayers;
        this.totalPlayers = this.humanPlayers + this.aiPlayers;
        this.seed = event.seed || Date.now();

        // create player instances
        for (let i = 0; i < this.humanPlayers; i++) {
            this.players.push(new Player(i, `Human_${i+1}`, `Color_${i+1}`));
        }
        for (let j = 0; j < this.aiPlayers; j++) {
            this.players.push(new Player(this.humanPlayers + j, `AI_${j+1}`, `Color_${this.humanPlayers + j +1}`));
        }
        // generate map
        await this.generateDefaultMap(this.seed);
        // transition to INIT state
        this.currentState = GameState.INIT;

        // TODO: render the initial map
        if (this.renderer){
            this.renderer.renderInitialMap(this.gameMap, this.inputEvent);
        }else{
            console.warn("Renderer not attached. Cannot render game map.");
        }
    }


    async handleStateInit(event){
        // handle init state events here
        // for now, just transition to ROLL state
        this.currentState = GameState.ROLL;
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
        return this.players[this.currentPlayerIndex];
    }

    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }

    nextTurn() {
        this.turnNumber++;
    }



}