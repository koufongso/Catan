import { RESOURCE_TYPES } from "../../constants/ResourceTypes.js";
import { StatusCodes } from "../../constants/StatusCodes.js";
import { Player } from "../../models/Player.js";
import { DevCard } from "../../models/devCards/DevCard.js";

export class DebugDashboard {

    constructor(debugController) {
        this.debugController = debugController;

        this.resourceIcons = {
            brick: '🧱',
            lumber: '🌲',
            wool: '🐑',
            wheat: '🌾',
            ore: '⛏️',
        };

        this.devCardIcons = {
            knight: '🛡️',
            victory_point: '⭐',
            road_building: '🛣️',
            monopoly: '💰',
            year_of_plenty: '🌽',
        };

        this.initDebugConsole();
    }


    initDebugConsole() {
        console.log("Initializing Debug Dashboard UI components.");
        this.input = document.getElementById('debug-input');
        this.submit = document.getElementById('debug-submit');
        this.debugWrapper = document.getElementById('debug-wrapper');
        this.debugBtn = document.getElementById('debug-toggle-btn');

        const handleCommand = () => {
            const commandText = this.input.value.trim();
            if (commandText) {
                const res = this.debugController.execute(commandText);
                this.input.value = ''; // Clear after use
            }
        };

        this.submit.addEventListener('click', handleCommand);

        // Add "Ctrl+Enter" support for the textarea
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCommand();
            }
        });

        // add toggle button

        const toggleDebug = () => {
            console.log("Toggling Debug Dashboard visibility.");
            console.log("this.debugWrapper:", this.debugWrapper);
            this.debugWrapper.classList.toggle('hidden');
        }

        // Click listener
        this.debugBtn.addEventListener('click', toggleDebug);       
        // Keyboard listener (Tilde/Backtick key)
        window.addEventListener('keydown', (e) => {
            if (e.key === '`') { // The key below ESC
                e.preventDefault();
                toggleDebug();
            }
        });
    }


    getResourceIcon(type) {
        if (!type) return '❓';
        const key = type.toLowerCase();
        // Return the icon if found, otherwise return the first letter capitalized
        return this.resourceIcons[key] || type.charAt(0).toUpperCase();
    }

    getDevCardIcon(type) {
        if (!type) return '❓';
        const key = type.toLowerCase();
        return this.devCardIcons[key] || type.charAt(0).toUpperCase();
    }

    renderDebugHUD(gameContext, logMessage = null) {
        const debugDashboard = document.getElementById('debug-dashboard');
        const newLog = document.createElement('div');
        newLog.className = 'debug-entry';

        // dice roll info
        let diceInfo = '';
        if (gameContext.lastRoll) {
            const { values, sum } = gameContext.lastRoll;
            diceInfo = `
                    <span class="dice-tag">
                        🎲 (${values.join(' + ')}) = <strong>${sum}</strong>
                    </span>
                `;
        }

        // 1. Define the resources we want to track in the header
        const resourceList = Object.values(RESOURCE_TYPES);
        const headerHtml = `
            <div class="res-grid-row header">
                <span class="cell-id">ID</span>
                <span class="cell-val">VP</span>
                ${resourceList.map(type => `
                    <span class="cell-val">${this.getResourceIcon(type)}</span>
                `).join('')}
                <span class="cell-val">🃏</span>
            </div>
        `;

        const bankHtml = `    
        <div id="bank-resources" class="player-debug-wrapper">
            <div class="res-grid-row">
                <span class="cell-id">Bank</span>
                <span class="cell-val">--</span> 
                ${resourceList.map(type => {
            const amount = gameContext.bankResources[type] || 0;
            return `<span class="cell-val ${amount > 0 ? 'has-res' : 'is-zero'}">${amount}</span>`;
        }).join('')}
            </div>
        </div>`


        // player info table
        const playersHtml = gameContext.players.map((p, idx) => {
            const playerInstance = new Player(p); // create a Player instance from raw data
            const isCurrent = idx === gameContext.currentPlayerIndex;
            const totalVP = playerInstance.getVictoryPoints();
            const devCardCount = playerInstance.devCards.length;

            // prepare dev card summary
            const devCardSummary = playerInstance.devCards.reduce((acc, card) => {
                if (!(card instanceof DevCard)) {
                    card = new DevCard(card); // convert raw card data to DevCard instance if needed
                }
                // Group by type
                if (!acc[card.type]) acc[card.type] = { count: 0, playable: 0, played: 0, locked: 0 };
                acc[card.type].count++;
                console.log(`Processing card for player ${playerInstance.id}:`, card);
                if (card.isPlayable(gameContext.turnNumber)) { // track playable cards (not played and not bought this turn)
                    acc[card.type].playable++;
                }
                if (card.isPlayed()) { // track played cards
                    acc[card.type].played++;
                }
                if (card.isLocked(gameContext.turnNumber)) { // track locked cards
                    acc[card.type].locked++;
                }

                return acc;
            }, {});

            // create HTML for dev card summary
            const devCardsHtml = Object.entries(devCardSummary).map(([type, data]) => {
                // Only show the badge if the player has at least one of this type
                return `
                    <div class="dev-card-badge">
                        <span class="card-icon-main">${this.getDevCardIcon(type)}</span>
                        <div class="badge-stats">
                            <span class="stat-item}">👁️${data.played}</span>
                            <span class="stat-item}">🔒${data.locked}</span>
                            <span class="stat-item}">✔️${data.playable}</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `
            <div class="player-debug-wrapper">
                <div class="res-grid-row ${isCurrent ? 'current-player' : ''}" 
                    onclick="this.parentElement.classList.toggle('expanded')"
                    style="cursor: pointer;">
                    <span class="cell-id" style="color: ${playerInstance.color}">
                        ${isCurrent ? '▶' : '&nbsp;'} P${playerInstance.id}
                    </span>
                    <span class="cell-val has-res">${totalVP}</span> 
                    ${resourceList.map(type => {
                const amount = playerInstance.resources[type] || 0;
                return `<span class="cell-val ${amount > 0 ? 'has-res' : 'is-zero'}">${amount}</span>`;
            }).join('')}
                    <span class="cell-val ${devCardCount > 0 ? 'has-cards' : 'is-zero'}">${devCardCount}</span>
                </div>
                
                <div class="debug-details">
                    <div class="dev-card-inventory">
                        ${playerInstance.devCards.length > 0 ? devCardsHtml : '<small>No cards</small>'}
                    </div>
                </div>
            </div>
            `;
        }).join('');

        newLog.innerHTML = `
        <div class="debug-header">
            <span>${new Date().toLocaleTimeString()}</span>
            <strong>${gameContext.currentState}</strong>
        </div>
        <div>${diceInfo}</div>
        <div class="debug-table">
            ${headerHtml}
            ${bankHtml}
            ${playersHtml}
        </div>
        <div class="debug-log-message">${logMessage ? `💬 ${logMessage}` : ''}</div>
        `;

        debugDashboard.prepend(newLog);
        if (debugDashboard.children.length > 10) debugDashboard.lastChild.remove();
    }
}