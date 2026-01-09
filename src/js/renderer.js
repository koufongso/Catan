import { GameMap } from "./map/game_map.js";
import { Tile } from "./map/tile.js";
import { ResourceType } from "./map/resource_type.js";
import { GameController } from "./game_controller.js";

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
    }

    attachCOntroller(controller){
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
        
        const size = 60; // hex size

        // draw all tiles
        gameMap.tiles.forEach(tile => {
            // draw pologon for each tile
            const hexPoly = this.createPolygon(
                tile.hex.coord, // [q,r,s]
                tile.resource,
                tile.hex.id,
                size, // size
            );
            layers.tiles.appendChild(hexPoly);

            // draw number token
            if (tile.numberToken !== null) {
                const [x, y] = this.hexCoordToPixel(tile.hex.coord, size);

                if (tile.numberToken ===7){
                    return; // no number token for 7
                }

                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", x);
                circle.setAttribute("cy", y);
                circle.setAttribute("r", size*0.3);
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
                const [x, y] = this.hexCoordToPixel(robberTile.hex.coord, size);
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
            const [x0, y0] = this.hexCoordToPixel(tp.coord, size);

            // draw line from hex center to each vertex index
            for (let index of tp.indexList) {
                const angle = RAD60 * index + RAD30; // 30 degree offset
                const x = size * Math.cos(angle) + x0;
                const y = -size * Math.sin(angle) + y0; // negate it since SVG y-axis is inverted (down is positive)
                //console.log(`  Trading Post at hex ${tp.coord}, vertex index: ${index}, pixel: (${x},${y})`);
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                
                // better visual effect by shortening the line a bit
                const dir = [x-x0, y-y0];
                const len = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
                const shorten_ratio = 0.5;
                const x0_short = x0 + dir[0]*(shorten_ratio*size/len);
                const y0_short = y0 + dir[1]*(shorten_ratio*size/len);

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

        // add event listener for dice button
        const diceBtn = document.getElementById('dice-btn');
        diceBtn.onclick = () => {
            if (this.controller){
                this.controller.inputEvent({type: 'ROLL_DICE'});
            }else{
                console.error("Renderer: Controller not attached. Cannot handle dice roll.");
            }
        }
    }

    vertexCoordToPixel(vertex, size=50) {
        // Important: the vertex coordinate is not the same as hex center coordinate
        // 1. get one of the adjacent hex coord
        let hex_coord = vertex.getAdjacentHexCoord()[0];
        
        let hex_idx = vertex.getHexIndex(hex_coord);// get the index of the hex around the vertex
        // skip sanity check here, hex_idx should be valid
        // 2. calculate pixel position based on hex center and hex index (0:12 o'clock,go clockwise)
        const [x0, y0] = this.hexCoordToPixel(hex_coord, size);
        const angle = RAD60 * hex_idx + RAD30; // 30 degree offset
        const x = size * Math.cos(angle) + x0;
        const y = -size * Math.sin(angle) + y0; // negate it since SVG y-axis is inverted (down is positive)
        //console.log(`Vertex ${vertex.id} adjacent hex coord: ${hex_coord}, hex index: ${hex_idx}, hex pixel: (${x0},${y0}) , vertex pixel: (${x},${y})`);

        return [x, y];
    }


    hexCoordToPixel(coord, size=50) {
        // convert axial (q,r,s) to pixel (x,y)
        // reference: https://www.redblobgames.com/grids/hexagons/
        const x = size * (SQRT3 * coord[0]  +  SQRT3_HALF * coord[1]);
        const y = size * (1.5 * coord[1]);
        return [x, y];
    }

    createPolygon(coord, resource, id, size=50) {
        let SVG_NS = "http://www.w3.org/2000/svg";
        const poly = document.createElementNS(SVG_NS, "polygon");
        // calculate points based on axial coordinates
        const points = [];
        const [x0, y0] = this.hexCoordToPixel(coord, size);
        for (let i = 0; i < 6; i++) {
            const angle = RAD60 * i + RAD30; // 30 degree offset
            const x = size * Math.cos(angle) + x0;
            const y = - size * Math.sin(angle) + y0; // negate it since SVG y-axis is inverted (down is positive)
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
                <p>Players Status:</p>
                <ul>
                    ${gameContext.players.map(player => `<li>Player ${player.id}: ${player.name} (${player.type}) - Resources: ${JSON.stringify(player.resources)}</li>`).join('')}
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
}