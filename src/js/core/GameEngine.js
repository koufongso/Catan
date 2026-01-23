import { GameController } from "./GameController.js";
import { Renderer } from "../visuals/Renderer.js";
import { DebugController } from "../debug/DebugController.js";

// Main Game Engine class
export class GameEngine {s
    constructor(seed = undefined) {
        // game engine setup
        // visual components

        // create rng with seed
        this.gameController = new GameController(seed);
        this.debugController = new DebugController(this.gameController);
        this.renderer = new Renderer(this.gameController, this.debugController);
    }

    async run() {
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