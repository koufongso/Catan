import { GameMap } from "./map/GameMap.js";
import { Tile } from "./map/Tile.js";
import { ResourceType } from "./map/ResourceType.js";
import { GameController } from "./GameController.js";
import { HexUtils } from "./utils/hex-utils.js";


// constants for hex geometry
const RAD30 = Math.PI / 6; // 30 degrees in radians
const RAD60 = Math.PI / 3; // 60 degrees in radians
const SQRT3 = Math.sqrt(3);
const SQRT3_HALF = SQRT3 / 2;
// take care of all UI rendering and user interactions
export class Renderer {
    constructor(svgId) {
        this.svg = document.getElementById(svgId);
        this.controller = null;
        this.tileSize = 50; // default hex this.tileSize
    }

    attachController(controller) {
        this.controller = controller;
    }


    drawTile(layer, tile) {
        const hexPoly = this.createPolygon(
            tile.coord,
            tile.resource,
            tile.id,
            this.tileSize
        );
        layer.appendChild(hexPoly);
    }

    drawToken(layer, tile) {
        // skip if no token or token is 7 (robber)
        if (tile.numberToken === null || tile.numberToken === 7) return;

        const [x, y] = HexUtils.hexToPixel(tile.coord, this.tileSize);
        const isHighProb = (tile.numberToken === 6 || tile.numberToken === 8);

        // Create Group for the token to keep SVG organized
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "token-group");

        // The White Circle
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", this.tileSize * 0.3);
        circle.setAttribute("class", `number-token-circle ${isHighProb ? 'high-probability' : ''}`);

        // The Text
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y + 2.5);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("class", `number-token ${isHighProb ? 'high-probability' : ''}`);
        text.textContent = tile.numberToken;

        group.appendChild(circle);
        group.appendChild(text);
        layer.appendChild(group);
    }

    drawTradingPost(layer, tp) {
        const [x0, y0] = HexUtils.hexToPixel(tp.coord, this.tileSize);
        const RAD60 = Math.PI / 3;
        const RAD30 = Math.PI / 6;

        // Draw the visual connection lines to the vertices
        tp.indexList.forEach(index => {
            const angle = RAD60 * index + RAD30;
            const x = this.tileSize * Math.cos(angle) + x0;
            const y = -this.tileSize * Math.sin(angle) + y0;

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

            // Shorten line for better aesthetics
            const shortenRatio = 0.5;
            const xStart = x0 + (x - x0) * shortenRatio;
            const yStart = y0 + (y - y0) * shortenRatio;

            line.setAttribute("x1", xStart);
            line.setAttribute("y1", yStart);
            line.setAttribute("x2", x);
            line.setAttribute("y2", y);
            line.setAttribute("class", "trading-post-line");
            layer.appendChild(line);
        });

        // Add the resource label (e.g., "Brick:2")
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", x0);
        label.setAttribute("y", y0);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("class", "trading-post-label");

        label.textContent = Object.entries(tp.tradeList)
            .map(([res, val]) => `${res[0].toUpperCase()}:${val}`)
            .join(" ");

        layer.appendChild(label);
    }

    drawRobber(layer, robberTileCoord) {
        if (!robberTileCoord) return;

        const [x, y] = HexUtils.hexToPixel(robberTileCoord, this.tileSize);
        const size = this.tileSize * 0.8; // Adjust size as needed

        // Create a group to center the image/text easily
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "robber-group");

        // Use <image> for the .png file
        const robberImg = document.createElementNS("http://www.w3.org/2000/svg", "image");
        robberImg.setAttributeNS("http://www.w3.org/1999/xlink", "href", "./src/assets/images/robber.png");

        // Center the image over the hex (SVG images draw from top-left)
        robberImg.setAttribute("x", x - size / 2);
        robberImg.setAttribute("y", y - size / 2);
        robberImg.setAttribute("width", size);
        robberImg.setAttribute("height", size);
        robberImg.setAttribute("class", "robber-icon");

        // Optional: Keep the "R" text as a fallback or label
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y + 5);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("class", "robber-label");
        text.textContent = "R";

        group.appendChild(robberImg);
        group.appendChild(text);
        layer.appendChild(group);
    }

    setupTemplate() {
        const temp = document.getElementById('game-template');
        if (!temp) throw new Error("Game template not found in DOM");

        const clone = temp.content.cloneNode(true);

        // Group the layers into a clean object
        const layers = {
            tiles: clone.getElementById('tile-layer'),
            vertices: clone.getElementById('vertex-layer'),
            edges: clone.getElementById('edge-layer')
        };

        return { clone, layers };
    }

    updateDOM(clone) {
        const wrapper = document.getElementById('main-wrapper');
        wrapper.innerHTML = ''; // clear existing content
        wrapper.appendChild(clone); // add the new one
    }

    renderInitialMap(tiles, tradingPosts, robberTileCoord) {
        const { clone, layers } = this.setupTemplate();

        tiles.forEach(tile => {
            this.drawTile(layers.tiles, tile);
            this.drawToken(layers.tiles, tile);
        });

        tradingPosts.forEach(tp => {
            this.drawTradingPost(layers.tiles, tp);
        });

        this.drawRobber(layers.tiles, robberTileCoord);
        this.updateDOM(clone);
    }



    createPolygon(coord, resource, id, tileSize = this.tileSize) {
        let SVG_NS = "http://www.w3.org/2000/svg";
        const poly = document.createElementNS(SVG_NS, "polygon");
        // calculate points based on axial coordinates
        const points = [];
        const [x0, y0] = HexUtils.hexToPixel(coord, tileSize);
        for (let i = 0; i < 6; i++) {
            const angle = RAD60 * i + RAD30; // 30 degree offset
            const x = tileSize * Math.cos(angle) + x0;
            const y = - tileSize * Math.sin(angle) + y0; // negate it since SVG y-axis is inverted (down is positive)
            points.push(`${x},${y}`);
        }
        poly.setAttribute("points", points.join(" "));

        // set class based on resource type for styling
        poly.setAttribute("class", `hex-tile ${resource.toLowerCase()}`);
        poly.dataset.id = id;

        return poly;
    }

    // show game configuration UI
    showConfig() {
        const temp = document.getElementById('config-template');
        const clone = temp.content.cloneNode(true); // Copy the template

        // Add logic to the new buttons before adding to DOM
        if (!this.controller) {
            console.error("Renderer: Controller not attached. Cannot proceed with configuration.");
            return;
        }

        clone.getElementById('start-game').onclick = () => {
            this.controller.inputEvent({
                type: 'START_GAME',
                mapSize: parseInt(document.getElementById('map-size').value),
                aiPlayers: parseInt(document.getElementById('ai-players').value),
                humanPlayers: parseInt(document.getElementById('human-players').value),
                seed: Date.now()
            });
        }

        // clear existing content and add the clone to main wrapper
        let wrapper = document.getElementById('main-wrapper');
        wrapper.innerHTML = '';
        wrapper.appendChild(clone);
    }


    resourceIcons = {
        brick: '🧱',
        wood:  '🌲',
        sheep:  '🐑',
        wheat: '🌾',
        rock:   '⛏️',
        desert: '🌵',
        any:   '❓'  // Useful for 3:1 generic ports
    };

    getResourceIcon(type) {
        if (!type) return '❓';
        const key = type.toLowerCase();
        // Return the icon if found, otherwise return the first letter capitalized
        return this.resourceIcons[key] || type.charAt(0).toUpperCase();
    }

    renderDebugHUD(gameContext) {
        const debugDashboard = document.getElementById('debug-dashboard');
        const newLog = document.createElement('div');
        newLog.className = 'debug-entry';

        // 1. Define the resources we want to track in the header
        const resourceTypes = ['BRICK', 'WOOD', 'SHEEP', 'WHEAT', 'ROCK'];

        const headerHtml = `
            <div class="res-grid-row header">
                <span class="cell-id">ID</span>
                ${resourceTypes.map(type => `
                    <span class="cell-val">${this.getResourceIcon(type)}</span>
                `).join('')}
            </div>
        `;

        const playersHtml = gameContext.players.map(p => `
            <div class="res-grid-row">
                <span class="cell-id" style="color: ${p.color}">P${p.id}</span>
                ${resourceTypes.map(type => {
                    const amount = p.resources.get(type) || 0;
                    return `<span class="cell-val ${amount > 0 ? 'has-res' : 'is-zero'}">${amount}</span>`;
                }).join('')}
            </div>
        `).join('');

        newLog.innerHTML = `
        <div class="debug-header">
            <span>${new Date().toLocaleTimeString()}</span>
            <strong>${gameContext.currentState}</strong>
        </div>
        <div class="debug-table">
            ${headerHtml}
            ${playersHtml}
        </div>
        `;

        debugDashboard.prepend(newLog);
        if (debugDashboard.children.length > 10) debugDashboard.lastChild.remove();
    }

    renderDebugHUDLog(message) {
        const debugDashboard = document.getElementById('debug-dashboard');
        // add new HUD content
        const newLog = document.createElement('div');
        newLog.innerHTML = (`
            <div>
                <p>Timestamp: ${new Date().toLocaleTimeString()}</p>
                <p>${message}</p>
            </div>
            <br>
        `);
        debugDashboard.prepend(newLog);

        // limit the number of logs to 10
        if (debugDashboard.children.length > 10) {
            // Removing the oldest (last) child is very fast
            debugDashboard.lastChild.remove();
        }
    }

    activateSettlementPlacementMode(availableVertexCoords) {
        const vertexLayer = document.getElementById('vertex-layer');
        if (!vertexLayer) return;

        vertexLayer.classList.add('placement-mode');

        // 2. Draw ONLY the available spots passed from the controller
        availableVertexCoords.forEach(vCoord => {
            const vertexId = HexUtils.coordToId(vCoord);
            const [x, y] = HexUtils.vertexToPixel(vCoord, this.tileSize);

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", y);
            circle.setAttribute("r", 10);
            circle.setAttribute("class", "vertex-settlement-available hitbox");
            circle.dataset.id = vertexId; // Store ID for the delegation

            vertexLayer.appendChild(circle);
        });

        // 3. Single Event Listener (Event Delegation)
        // Remove existing listener first if necessary to prevent duplicates
        vertexLayer.onclick = (event) => {
            const target = event.target;
            if (target.classList.contains('vertex-settlement-available')) {
                const vertexId = target.dataset.id;
                this.emitInputEvent('PLACE_SETTLEMENT', { vertexId });
            }
        };
    }

    // Helper to clean up the controller calls
    emitInputEvent(type, data) {
        if (this.controller) {
            this.controller.inputEvent({ type, ...data });
        }
    }

    deactivateSettlementPlacementMode() {
        const vertexLayer = document.getElementById('vertex-layer');
        if (!vertexLayer) return;
        // clean up
        console.log(vertexLayer)

        vertexLayer.onclick = null;
        vertexLayer.querySelectorAll('.vertex-settlement-available').forEach(spot => vertexLayer.removeChild(spot));
        vertexLayer.classList.remove('placement-mode');
    }

    renderSettlement(vertexId, color, level) {
        // render a settlement at the given vertexId with the given color and level
        const vertexLayer = document.getElementById('vertex-layer');
        if (!vertexLayer) {
            console.error("Renderer: Vertex layer not found in SVG. Cannot render settlement.");
            return;
        }

        // create a circle element for the settlement
        const settlementCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const vCoord = vertexId.split(",").map(Number);
        const [x, y] = HexUtils.vertexToPixel(vCoord, this.tileSize);
        settlementCircle.setAttribute("cx", x);
        settlementCircle.setAttribute("cy", y);
        settlementCircle.setAttribute("r", level === 1 ? 12 : 18);
        settlementCircle.setAttribute("fill", color);
        settlementCircle.dataset.id = vertexId;
        settlementCircle.setAttribute("class", level === 1 ? "settlement" : "city");
        vertexLayer.appendChild(settlementCircle);
    }

    // Inside Renderer.js
    activateRoadPlacementMode(validEdgeCoords) {
        const edgeLayer = document.getElementById('edge-layer');
        if (!edgeLayer) return;

        edgeLayer.classList.add('placement-mode');

        validEdgeCoords.forEach(eCoord => {
            // Get the two vertex endpoints for this edge
            const edgeId = HexUtils.coordToId(eCoord);
            const [v1Coord, v2Coord] = HexUtils.getVerticesFromEdge(eCoord);
            const [x1, y1] = HexUtils.vertexToPixel(v1Coord, this.tileSize);
            const [x2, y2] = HexUtils.vertexToPixel(v2Coord, this.tileSize);

            const edgeLine = document.createElementNS("http://www.w3.org/2000/svg", "line");

            // Use your shortening logic for a better look
            const shortened = this.getShortenedLine(x1, y1, x2, y2, 0.2);

            edgeLine.setAttribute("x1", shortened.x1);
            edgeLine.setAttribute("y1", shortened.y1);
            edgeLine.setAttribute("x2", shortened.x2);
            edgeLine.setAttribute("y2", shortened.y2);

            edgeLine.setAttribute("class", "edge-road-available hitbox");
            edgeLine.dataset.id = edgeId;

            // Styling moved to CSS classes where possible
            edgeLine.style.strokeWidth = "12px"; // Slightly thicker for easier clicking
            edgeLine.style.stroke = "rgba(0, 255, 0, 0)"; // need this to show the hitbox
            edgeLayer.appendChild(edgeLine);
        });

        // EVENT DELEGATION: One listener for all roads
        edgeLayer.onclick = (event) => {
            const target = event.target;
            if (target.classList.contains('edge-road-available')) {
                this.emitInputEvent('PLACE_ROAD', { edgeId: target.dataset.id });
            }
        };
    }

    deactivateRoadPlacementMode() {
        const edgeLayer = document.getElementById('edge-layer');
        if (!edgeLayer) return;

        // clean up
        console.log(edgeLayer)
        edgeLayer.onclick = null;
        edgeLayer.querySelectorAll('.edge-road-available').forEach(spot => edgeLayer.removeChild(spot));
        edgeLayer.classList.remove('placement-mode');
    }

    // Helper to keep math clean
    getShortenedLine(x1, y1, x2, y2, ratio) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const offset_x = dx * ratio;
        const offset_y = dy * ratio;
        return {
            x1: x1 + offset_x,
            y1: y1 + offset_y,
            x2: x2 - offset_x,
            y2: y2 - offset_y
        };
    }

    renderRoad(edgeId, color) {
        // render a road at the given edgeId with the given color
        const edgeLayer = document.getElementById('edge-layer');
        if (!edgeLayer) {
            console.error("Renderer: Edge layer not found in SVG. Cannot render road.");
            return;
        }

        // get the two vertex coordinates from edgeId
        const eCoord = HexUtils.idToCoord(edgeId);
        const [vCoord0, vCoord1] = HexUtils.getVerticesFromEdge(eCoord);

        // create a line element for the road
        const roadLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const [x0, y0] = HexUtils.vertexToPixel(vCoord0, this.tileSize);
        const [x1, y1] = HexUtils.vertexToPixel(vCoord1, this.tileSize);
        console.log("vertex0:", vCoord0, x0, y0);
        console.log("vertex1:", vCoord1, x1, y1);
        const dir = [x1 - x0, y1 - y0];
        const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
        const shorten_ratio = 0.2;
        const x0_short = x0 + dir[0] * (shorten_ratio * this.tileSize / len);
        const y0_short = y0 + dir[1] * (shorten_ratio * this.tileSize / len);
        const x1_short = x1 - dir[0] * (shorten_ratio * this.tileSize / len);
        const y1_short = y1 - dir[1] * (shorten_ratio * this.tileSize / len);
        roadLine.setAttribute("x1", x0_short);
        roadLine.setAttribute("y1", y0_short);
        roadLine.setAttribute("x2", x1_short);
        roadLine.setAttribute("y2", y1_short);
        roadLine.setAttribute("class", "road");
        roadLine.setAttribute("data-id", edgeId);
        roadLine.style.strokeWidth = "8px";
        roadLine.style.stroke = `${color}`;
        roadLine.dataset.id = edgeId;
        edgeLayer.appendChild(roadLine);
    }
}