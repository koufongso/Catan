import { GameMap } from "./map/GameMap.js";
import { Tile } from "./map/Tile.js";
import { ResourceType } from "./map/ResourceType.js";
import { GameController } from "./GameController.js";
import { HexUtils } from "./utils/hex-utils.js";


// constants for hex geometry
const RAD30 = Math.PI / 6; // 30 degrees in radians
const RAD60  = Math.PI / 3; // 60 degrees in radians
const SQRT3 = Math.sqrt(3);
const SQRT3_HALF = SQRT3 / 2;
// take care of all UI rendering and user interactions
export class Renderer {
    constructor(svgId) {
        this.svg = document.getElementById(svgId);
        this.controller = null;   
        this.tileSize = 50; // default hex this.tileSize
    }

    attachController(controller){
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

    renderInitialMap(gameMap) {
        const { clone, layers } = this.setupTemplate();

        gameMap.tiles.forEach(tile => {
            this.drawTile(layers.tiles, tile);
            this.drawToken(layers.tiles, tile);
        });

        gameMap.tradingPosts.forEach(tp => {
            this.drawTradingPost(layers.tiles, tp);
        });

        this.drawRobber(layers.tiles, gameMap.tiles.get(gameMap.robberTileId));
        this.updateDOM(clone);
    }


    createPolygon(coord, resource, id, tileSize=this.tileSize) {
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
        if (!this.controller){
            console.error("Renderer: Controller not attached. Cannot proceed with configuration.");
            return;
        }

        clone.getElementById('start-game').onclick = () => {
            this.controller.inputEvent({type: 'START_GAME', 
                mapSize: parseInt(document.getElementById('map-size').value),
                aiPlayers: parseInt(document.getElementById('ai-players').value),
                humanPlayers: parseInt(document.getElementById('human-players').value),
                seed: Date.now()});
        }
        
        // clear existing content and add the clone to main wrapper
        let wrapper = document.getElementById('main-wrapper');
        wrapper.innerHTML = '';
        wrapper.appendChild(clone);
    }

    renderDebugHUD(gameContext) {
        const debugDashboard = document.getElementById('debug-dashboard');
        // add new HUD content
        const newLog = document.createElement('div');
        newLog.innerHTML = (`
            <div>
                <p>Timestamp: ${new Date().toLocaleTimeString()}</p>
                <p>Total Players: ${gameContext.totalPlayers}</p>
                <p>Human Players: ${gameContext.humanPlayers}</p>
                <p>AI Players: ${gameContext.aiPlayers}</p>
                <p>Seed: ${gameContext.seed}</p>
                <p>Current Turn: ${gameContext.turnNumber}</p>
                <p>Current State: ${gameContext.currentState}</p>
                <p>Settlements</p>
                <ul>
                    ${Array.from(gameContext.gameMap.settlements.entries()).map(([coord, settlement]) => `<li>Coord ${coord}: Owner ${settlement.owner}</li>`).join('')}
                </ul>
                <p>Roads</p><ul>
                    ${Array.from(gameContext.gameMap.roads.entries()).map(([coord, road]) => `<li>Coord ${coord}: Owner ${road.owner}</li>`).join('')}
                </ul>
                <p>Current Robber: ${gameContext.gameMap.robberTileId}</p>
                <p>Players Status:</p>
                    <ul>
                    ${gameContext.players.map(player => `
                        <li>
                        <strong>Player ${player.id}:</strong>
                        ${Array.from(player.resources).map(([type, amount]) => 
                            `<span> ${type}: ${amount} </span>`
                        ).join(' | ')}
                        </li>
                    `).join('')}
                    </ul>
                <p>Current Player: Player index ${gameContext.currentPlayerIndex} - ${gameContext.players[gameContext.currentPlayerIndex].name}</p>
                <p>Dice Last Roll: ${gameContext.dice.lastRoll}</p>
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

    activateSettlementPlacementMode(gameMap) {
        // add event listeners to all available settlement vertices
        // get the settlement layer
        const vertexLayer = document.getElementById('vertex-layer');
        if (!vertexLayer) {
            console.error("Renderer: Vertex layer not found in SVG. Cannot activate settlement placement mode.");
            return;
        }

        gameMap.tiles.forEach(tile => {
            // create vertex elements tha is not yet created and not yet occupied (contained in gameMap.settlements)
            const vCoordList = HexUtils.getVertexFromHex(tile.coord); // get all 6 vertex coords around the hex
            vCoordList.forEach((vCoord, index) => {
                const vertexId = HexUtils.coordToId(vCoord);
                if (gameMap.settlements.has(vertexId) || document.querySelector(`circle[data-id='${vertexId}']`)){
                    return; // skip occupied vertices or already created ones
                }

                // create a circle element for the vertex
                const vertexCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                const [x, y] = HexUtils.vertexToPixel(vCoord, this.tileSize);
                vertexCircle.setAttribute("cx", x);
                vertexCircle.setAttribute("cy", y);
                vertexCircle.setAttribute("r", 10);
                vertexCircle.setAttribute("class", "vertex-settlement-available hitbox");
                vertexCircle.dataset.id = vertexId;

                // add click event listener
                vertexCircle.addEventListener('click', (event) => {
                    console.log(`Vertex ${vertexId} clicked for settlement placement.`);
                    // send input event to controller
                    if (this.controller){
                        this.controller.inputEvent({type: 'PLACE_SETTLEMENT', vertexId: vertexId});
                    }else{
                        console.error("Renderer: Controller not attached. Cannot send PLACE_SETTLEMENT event.");
                    }
                });
                vertexLayer.appendChild(vertexCircle);
            });// end forEach vertex coord

        });// end forEach tile
    }

    deactivateSettlementPlacementMode() {
        // remove event listeners from all settlement vertices
        const vertexLayer = document.getElementById('vertex-layer');
        if (!vertexLayer) {
            console.error("Renderer: Vertex layer not found in SVG. Cannot deactivate settlement placement mode.");
            return;
        }

        // get all vertex-settlement-available elements
        const availableVertices = vertexLayer.querySelectorAll('.vertex-settlement-available');
        // remove them from the SVG
        availableVertices.forEach(vertex => {
            vertex.remove();
        }); 
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

    activateRoadPlacementMode(gameMap, vertexId) {
        // get the edge layer
        const edgeLayer = document.getElementById('edge-layer');
        if (!edgeLayer) {
            console.error("Renderer: Edge layer not found in SVG. Cannot activate road placement mode.");
            return;
        }

        // for performance, first check if vertexId is provided,
        // if so, only highlight edges connected to that vertex 
        const vCoord0 = HexUtils.idToCoord(vertexId);
        const [x0, y0] = HexUtils.vertexToPixel(vCoord0, this.tileSize);
        HexUtils.getAdjVerticesFromVertex(vCoord0).forEach(vCoord1 => {
            console.log("vertex0:", vCoord0);
            console.log("adjacent vertex coord:", vCoord1);
            
            const edge = HexUtils.getEdgeFromVertices(vCoord0, vCoord1);
            console.log("Adjacent edge:", edge);
            // check if the edge is already occupied
            const edgeId = HexUtils.coordToId(edge);
            if (gameMap.roads.has(edgeId)){
                return; // skip occupied edges
            }
             
            // draw a line for each adjacent edge
            const edgeLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const [x1, y1] = HexUtils.vertexToPixel(vCoord1, this.tileSize);
            console.log("vertex0:", vCoord0, x0, y0);
            console.log("vertex1:", vCoord1, x1, y1);
            const dir = [x1 - x0, y1 - y0];
            const len = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
            const shorten_ratio = 0.2;
            const x0_short = x0 + dir[0]*(shorten_ratio*this.tileSize/len);
            const y0_short = y0 + dir[1]*(shorten_ratio*this.tileSize/len);
            const x1_short = x1 - dir[0]*(shorten_ratio*this.tileSize/len);
            const y1_short = y1 - dir[1]*(shorten_ratio*this.tileSize/len);
            edgeLine.setAttribute("x1", x0_short);
            edgeLine.setAttribute("y1", y0_short);
            edgeLine.setAttribute("x2", x1_short);
            edgeLine.setAttribute("y2", y1_short);
            edgeLine.setAttribute("class", "edge-road-available hitbox");
            edgeLine.setAttribute("data-id", edgeId);
            edgeLine.style.strokeWidth = "8px";
            edgeLine.style.stroke="rgba(0, 255, 0, 0)";
            edgeLine.dataset.id = edgeId;

            // add click event listener
            edgeLine.addEventListener('click', (event) => {
                console.log(`edge ${edgeId} clicked for road placement.`);
                // send input event to controller
                if (this.controller){
                    this.controller.inputEvent({type: 'PLACE_ROAD', edgeId: edgeId});
                }else{
                    console.error("Renderer: Controller not attached. Cannot send PLACE_ROAD event.");
                }
            });

            edgeLayer.appendChild(edgeLine);
        });// end forEach adjacent edges
    };

    deactivateRoadPlacementMode() {
        // remove event listeners from all road edges
        const edgeLayer = document.getElementById('edge-layer');
        if (!edgeLayer) {
            console.error("Renderer: Edge layer not found in SVG. Cannot deactivate road placement mode.");
            return;
        }

        // get all edge-road-available elements      
        const availableEdges = edgeLayer.querySelectorAll('.edge-road-available');
        // remove them from the SVG
        availableEdges.forEach(edge => {
            edge.remove();
        });
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
        const len = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
        const shorten_ratio = 0.2;
        const x0_short = x0 + dir[0]*(shorten_ratio*this.tileSize/len);
        const y0_short = y0 + dir[1]*(shorten_ratio*this.tileSize/len);
        const x1_short = x1 - dir[0]*(shorten_ratio*this.tileSize/len);
        const y1_short = y1 - dir[1]*(shorten_ratio*this.tileSize/len);
        roadLine.setAttribute("x1", x0_short);
        roadLine.setAttribute("y1", y0_short);
        roadLine.setAttribute("x2", x1_short);
        roadLine.setAttribute("y2", y1_short);
        roadLine.setAttribute("class", "road");
        roadLine.setAttribute("data-id", edgeId);
        roadLine.style.strokeWidth = "8px";
        roadLine.style.stroke=`${color}`;
        roadLine.dataset.id = edgeId;
        edgeLayer.appendChild(roadLine);
    }
}