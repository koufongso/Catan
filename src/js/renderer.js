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
        this.layers = {
            tiles: document.getElementById('tile-layer'),
            vertices: document.getElementById('vertex-layer'),
            edges: document.getElementById('edge-layer')
        };
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

        // draw all settlements (trading posts)
        console.log("Rendering Settlements with Trading Posts:");
        gameMap.settlements.forEach(settlement => {
            if (settlement.tradeList.length !== 0) {
                // has a trading post, draw it (at the outter edge of the hex)
                const [x, y] = this.vertexCoordToPixel(settlement.vertex, size);
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

                // draw in follwoing the direction outward from center of hex
                const origin = this.hexCoordToPixel([0,0,0], size);
                const dir_x = x - origin[0];
                const dir_y = y - origin[1];
                circle.setAttribute("cx", x);
                circle.setAttribute("cy", y);
                circle.setAttribute("r", 10);
                circle.setAttribute("class", "trading-post");
                layers.vertices.appendChild(circle);
            }
        });

        // clear existing content and add the clone to main wrapper
        let wrapper = document.getElementById('main-wrapper');
        wrapper.innerHTML = '';
        wrapper.appendChild(clone);
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
        console.log(`Vertex ${vertex.id} adjacent hex coord: ${hex_coord}, hex index: ${hex_idx}, hex pixel: (${x0},${y0}) , vertex pixel: (${x},${y})`);

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
}