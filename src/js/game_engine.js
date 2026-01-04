import { GameController } from "./game_controller.js";
import { Renderer } from "./renderer.js";

// Main Game Engine class
export class GameEngine{
    constructor(){
        // game engine setup
        this.gameController = new GameController();
        this.renderer = new Renderer('map-svg');
        this.gameController.attachRenderer(this.renderer);
        this.renderer.attachCOntroller(this.gameController);
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