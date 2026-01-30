export class MenuUI {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.setupListeners();

        // default settings
        this.gameConfig = {
            playerName: 'Player 1',
            numHumanPlayers: 1,
            numAIPlayers: 1,
            numTotalPlayers: 2,
        }

        console.log(`Default player name: ${this.gameConfig.playerName}`);
    }

    setupListeners() {
        // Listen for the Start Game button click
        const startButton = document.getElementById('btn-start-game');
        startButton.addEventListener('click', () => this.onStartGame());
    }

    getConfigInfo() {
        const playerNameInput = document.getElementById('input-player-name');
        const numAIPlayersInput = document.getElementById('num-ai-players');
        this.gameConfig.playerName = playerNameInput.value;
        this.gameConfig.numAIPlayers = parseInt(numAIPlayersInput.value);
        this.gameConfig.numTotalPlayers = this.gameConfig.numHumanPlayers + this.gameConfig.numAIPlayers;
    }

    onStartGame() {
        this.getConfigInfo();
        this.gameEngine.startGame(this.gameConfig);
    }
}