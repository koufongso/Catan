import { GameController } from "./GameController.js";
import { Renderer } from "../visuals/Renderer.js";

// Main Game Engine class
export class GameEngine{
    constructor(seed = undefined){
        // game engine setup
        // create rng with seed
        this.gameController = new GameController(seed);
        this.renderer = new Renderer('map-svg');
        this.gameController.attachRenderer(this.renderer);
        this.renderer.attachController(this.gameController);
    }

    async run(){
        // start the game engine
        console.log("Starting Game Engine...");

        // manual trigger to start the game for testing
        this.renderer.showConfig();

        // further game loop logic would go here
        console.log("Game Engine is running.");
    
    }
}

let gameEngine = new GameEngine();
await gameEngine.run();