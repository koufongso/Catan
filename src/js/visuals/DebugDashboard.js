import { ResourceType } from "../constants/ResourceType.js";

export class DebugDashboard {

    resourceIcons = {
        brick: '🧱',
        lumber: '🌲',
        wool: '🐑',
        wheat: '🌾',
        ore: '⛏️',
    };

    getResourceIcon(type) {
        if (!type) return '❓';
        const key = type.toLowerCase();
        // Return the icon if found, otherwise return the first letter capitalized
        return this.resourceIcons[key] || type.charAt(0).toUpperCase();
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
        const resourceTypes = [ResourceType.BRICK, ResourceType.LUMBER, ResourceType.WOOL, ResourceType.WHEAT, ResourceType.ORE];

        const headerHtml = `
            <div class="res-grid-row header">
                <span class="cell-id">ID</span>
                <span class="cell-val">VP</span>
                ${resourceTypes.map(type => `
                    <span class="cell-val">${this.getResourceIcon(type)}</span>
                `).join('')}
            </div>
        `;


        const playersHtml = gameContext.players.map(p => {
            const totalVP = p.getVictoryPoints(); // Assuming you have this logic
            return `
            <div class="res-grid-row">
                <span class="cell-id" style="color: ${p.color}">P${p.id}</span>
                <span class="cell-val has-res">${totalVP}</span> ${resourceTypes.map(type => {
                const amount = p.resources[type] || 0;
                return `<span class="cell-val ${amount > 0 ? 'has-res' : 'is-zero'}">${amount}</span>`;
            }).join('')}
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
            ${playersHtml}
        </div>
        <div class="debug-log-message">${logMessage ? `💬 ${logMessage}` : ''}</div>
        `;

        debugDashboard.prepend(newLog);
        if (debugDashboard.children.length > 10) debugDashboard.lastChild.remove();
    }
}