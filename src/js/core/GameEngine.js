import { GameController } from "./GameController.js";
import { Renderer } from "../visuals/Renderer.js";
import { DebugDashboard } from "../visuals/DebugDashboard.js";

// Main Game Engine class
export class GameEngine {
    constructor(seed = undefined) {
        // game engine setup
        // create rng with seed
        this.gameController = new GameController(seed);
        this.renderer = new Renderer('map-svg');
        this.debug = new DebugDashboard();

        // link components
        this.gameController.attachRenderer(this.renderer);
        this.gameController.attachDebug(this.debug);
        this.renderer.attachController(this.gameController);
    }

    async run() {
        // start the game engine
        console.log("Starting Game Engine...");

        this.initDebugConsole();

        // manual trigger to start the game for testing
        this.renderer.showConfig();

        // further game loop logic would go here
        console.log("Game Engine is running.");

    }

    initDebugConsole() {
        const input = document.getElementById('debug-input');
        const submit = document.getElementById('debug-submit');

        const handleCommand = () => {
            const commandText = input.value.trim();
            if (commandText) {
                this.executeCheat(commandText);
                input.value = ''; // Clear after use
            }
        };

        submit.addEventListener('click', handleCommand);

        // Add "Ctrl+Enter" support for the textarea
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCommand();
            }
        });

        // add toggle button
        const debugWrapper = document.getElementById('debug-wrapper');
        const debugBtn = document.getElementById('debug-toggle-btn');

        function toggleDebug() {
            debugWrapper.classList.toggle('hidden');
        }

        // Click listener
        debugBtn.addEventListener('click', toggleDebug);

        // Keyboard listener (Tilde/Backtick key)
        window.addEventListener('keydown', (e) => {
            if (e.key === '`') { // The key below ESC
                e.preventDefault();
                toggleDebug();
            }
        });
    }

    executeCheat(commandText) {
        this.gameController.executeCheat(commandText);
    }
}

let gameEngine = new GameEngine();
await gameEngine.run();