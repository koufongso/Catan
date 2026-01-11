import { GameMap } from "./map/game_map.js";
import { Tile } from "./map/tile.js";
import { ResourceType } from "./map/resource_type.js";
import { GameController } from "./game_controller.js";
import { HexVertex } from "./map/hex_grid_system/hex_vertex.js";
import { HexEdge } from "./map/hex_grid_system/hex_edge.js";

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

    renderInitialMap(gameMap) {
        // get the template for game container
        const temp = document.getElementById('game-template');
        const clone = temp.content.cloneNode(true); // Copy the template
        let layers = {
            tiles: clone.getElementById('tile-layer'),
            vertices: clone.getElementById('vertex-layer'),
            edges: clone.getElementById('edge-layer')
        };
        

        // draw all tiles
        gameMap.tiles.forEach(tile => {
            // draw pologon for each tile
            const hexPoly = this.createPolygon(
                tile.hex.coord, // [q,r,s]
                tile.resource,
                tile.hex.id,
                this.tileSize, // this.tileSize
            );
            layers.tiles.appendChild(hexPoly);

            // draw number token
            if (tile.numberToken !== null) {
                const [x, y] = this.hexCoordToPixel(tile.hex.coord, this.tileSize);

                if (tile.numberToken ===7){
                    return; // no number token for 7
                }

                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", x);
                circle.setAttribute("cy", y);
                circle.setAttribute("r", this.tileSize*0.3);
                const circleClass = (tile.numberToken === 6 || tile.numberToken === 8)
                    ? "number-token-circle high-probability"
                    : "number-token-circle";
                circle.setAttribute("class", circleClass);

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", x);
                text.setAttribute("y", y+2.5); // slight offset for vertical centering
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("class", "number-token");
                text.textContent = tile.numberToken;

                // highlight if it's a 6 or 8
                if (tile.numberToken === 6 || tile.numberToken === 8) {
                    text.setAttribute("class", "number-token high-probability");
                }

                layers.tiles.appendChild(circle);
                layers.tiles.appendChild(text);
            }
        });

        // draw the robber
        {
            const robberTile = gameMap.tiles.get(gameMap.robberTileId);
            if (robberTile) {
                const [x, y] = this.hexCoordToPixel(robberTile.hex.coord, this.tileSize);
                const robberImg = document.createElementNS("http://www.w3.org/2000/svg", "text");
                robberImg.setAttribute("href", "./src/assets/images/robber.png");
                robberImg.setAttribute("x", x );
                robberImg.setAttribute("y", y+2.5); // slight offset for vertical centering
                robberImg.setAttribute("text-anchor", "middle");
                robberImg.setAttribute("class", "robber");
                robberImg.textContent = "R"; // skull emoji as placeholder
                layers.tiles.appendChild(robberImg);
            }
        }

        // draw all trading posts
        //console.log("Rendering Trading Posts:");
        gameMap.tradingPosts.forEach(tp => {
            // hex center the trading post is located at
            const [x0, y0] = this.hexCoordToPixel(tp.coord, this.tileSize);

            // draw line from hex center to each vertex index
            for (let index of tp.indexList) {
                const angle = RAD60 * index + RAD30; // 30 degree offset
                const x = this.tileSize * Math.cos(angle) + x0;
                const y = -this.tileSize * Math.sin(angle) + y0; // negate it since SVG y-axis is inverted (down is positive)
                //console.log(`  Trading Post at hex ${tp.coord}, vertex index: ${index}, pixel: (${x},${y})`);
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                
                // better visual effect by shortening the line a bit
                const dir = [x-x0, y-y0];
                const len = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
                const shorten_ratio = 0.5;
                const x0_short = x0 + dir[0]*(shorten_ratio*this.tileSize/len);
                const y0_short = y0 + dir[1]*(shorten_ratio*this.tileSize/len);

                line.setAttribute("x1", x0_short);
                line.setAttribute("y1", y0_short);
                line.setAttribute("x2", x);
                line.setAttribute("y2", y);
                line.setAttribute("class", "trading-post-line");
                layers.tiles.appendChild(line);
            }
            
            // add trade ratio
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("class", "trading-post-label");
            let trade_str = "";
            text.setAttribute("x", x0);
            text.setAttribute("y", y0);
            for (let resource in tp.tradeList) {
                trade_str += `${resource.charAt(0).toUpperCase() + resource.slice(1)}:${tp.tradeList[resource]} `;
            }
            text.textContent = trade_str;
            layers.tiles.appendChild(text); 
        });

        // clear existing content and add the clone to main wrapper
        let wrapper = document.getElementById('main-wrapper');
        wrapper.innerHTML = '';
        wrapper.appendChild(clone);
    }

    vertexCoordToPixel(vertex, tileSize=this.tileSize) {
        // Important: the vertex coordinate is not the same as hex center coordinate
        // 1. get one of the adjacent hex coord
        let hex_coord = vertex.getAdjacentHexCoord()[0];
        
        let hex_idx = vertex.getHexIndex(hex_coord);// get the index of the hex around the vertex
        // skip sanity check here, hex_idx should be valid
        // 2. calculate pixel position based on hex center and hex index (0:12 o'clock,go clockwise)
        const [x0, y0] = this.hexCoordToPixel(hex_coord, tileSize);
        const angle = RAD60 * hex_idx + RAD30; // 30 degree offset
        const x = tileSize * Math.cos(angle) + x0;
        const y = -tileSize * Math.sin(angle) + y0; // negate it since SVG y-axis is inverted (down is positive)
        //console.log(`Vertex ${vertex.id} adjacent hex coord: ${hex_coord}, hex index: ${hex_idx}, hex pixel: (${x0},${y0}) , vertex pixel: (${x},${y})`);

        return [x, y];
    }


    hexCoordToPixel(coord, tileSize=this.tileSize) {
        // convert axial (q,r,s) to pixel (x,y)
        // reference: https://www.redblobgames.com/grids/hexagons/
        const x = tileSize * (SQRT3 * coord[0]  +  SQRT3_HALF * coord[1]);
        const y = tileSize * (1.5 * coord[1]); 
        return [x, y];
    }

    createPolygon(coord, resource, id, tileSize=this.tileSize) {
        let SVG_NS = "http://www.w3.org/2000/svg";
        const poly = document.createElementNS(SVG_NS, "polygon");
        // calculate points based on axial coordinates
        const points = [];
        const [x0, y0] = this.hexCoordToPixel(coord, tileSize);
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
            const vertexCoords = tile.hex.getVertexCoord(); // get all 6 vertex coords around the hex
            vertexCoords.forEach((vCoord, index) => {
                const vertexId = `${vCoord[0]},${vCoord[1]},${vCoord[2]}`;
                if (gameMap.settlements.has(vertexId) || document.querySelector(`circle[data-id='${vertexId}']`)){
                    return; // skip occupied vertices or already created ones
                }

                // create a circle element for the vertex
                const vertexCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                const [x, y] = this.vertexCoordToPixel(new HexVertex(vCoord), this.tileSize);
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
        const [x, y] = this.vertexCoordToPixel(new HexVertex(vCoord), this.tileSize);
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
        const vCoord = vertexId.split(",").map(Number);
        const vertex0 = new HexVertex(vCoord);
        const [x0, y0] = this.vertexCoordToPixel(vertex0, this.tileSize);
        vertex0.getAdjacentVertexCoord().forEach(vCoord1 => {
            const vertex1 = new HexVertex(vCoord1);
            console.log("vertex0:", vertex0);
            console.log("adjacent vertex coord:", vertex1);
            
            const edge = HexEdge.fromVertices(vertex0, vertex1);
            console.log("Adjacent edge:", edge);
            // check if the edge is already occupied
            const edgeId = edge.id;
            if (gameMap.roads.has(edgeId)){
                return; // skip occupied edges
            }
             
            // draw a line for each adjacent edge
            const edgeLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const [x1, y1] = this.vertexCoordToPixel(vertex1, this.tileSize);
            console.log("vertex0:", vertex0.coord, x0, y0);
            console.log("vertex1:", vertex1.coord, x1, y1);
            const dir = [x1 - x0, y1 - y0];
            const len = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
            const shorten_ratio = 0.2;
            const x0_short = x0 + dir[0]*(shorten_ratio*this.tileSize/len);
            const y0_short = y0 + dir[1]*(shorten_ratio*this.tileSize/len);
            const x1_short = x1 - dir[0]*(shorten_ratio*this.tileSize/len);
            const y1_short = y1 - dir[1]*(shorten_ratio*this.tileSize/len);
            edgeLine.setAttribute("x1", x0);
            edgeLine.setAttribute("y1", y0);
            edgeLine.setAttribute("x2", x1);
            edgeLine.setAttribute("y2", y1);
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
        const edgeCoord = edgeId.split(",").map(Number);
        const [vertex0, vertex1] = HexEdge.getVertexCoordsFromEdgeCoord(edgeCoord);

        // create a line element for the road
        const roadLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const [x0, y0] = this.vertexCoordToPixel(new HexVertex(vertex0), this.tileSize);
        const [x1, y1] = this.vertexCoordToPixel(new HexVertex(vertex1), this.tileSize);
        console.log("vertex0:", vertex0.coord, x0, y0);
        console.log("vertex1:", vertex1.coord, x1, y1);
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