import { GameMap } from "./map/game_map.js";
import { Tile } from "./map/tile.js";
import { ResourceType } from "./map/resource_type.js";
import { GameController } from "./game_controller.js";

// constants for hex geometry
const RAD30 = Math.PI / 6; // 30 degrees in radians
const RAD60  = Math.PI / 3; // 60 degrees in radians
const SQRT3 = Math.sqrt(3);
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
        

        // draw all tiles
        gameMap.tiles.forEach(tile => {
            // draw pologon for each tile
            const hexPoly = this.createPolygon(
                tile.hex.coord, // [q,r,s]
                tile.resource,
                tile.hex.id,
                70, // size
            );
            layers.tiles.appendChild(hexPoly);

            // draw number token
            if (tile.numberToken !== null) {
                const [x, y] = this.coordToPixel(tile.hex.coord, 50);

                if (tile.numberToken ===7){
                    return; // no number token for 7
                }

                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", x);
                circle.setAttribute("cy", y);
                circle.setAttribute("r", 18);
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

        // clear existing content and add the clone to main wrapper
        let wrapper = document.getElementById('main-wrapper');
        wrapper.innerHTML = '';
        wrapper.appendChild(clone);
    }

    coordToPixel(coord, size=50) {
        const x = (SQRT3 * size * (coord[0] + coord[2]/2));
        const y = (1.5 * size * coord[2]);
        return [x, y];
    }

    createPolygon(coord, resource, id, size=50) {
        let SVG_NS = "http://www.w3.org/2000/svg";
        const poly = document.createElementNS(SVG_NS, "polygon");
        // calculate points based on axial coordinates
        const points = [];
        const [x0, y0] = this.coordToPixel(coord, size);
        for (let i = 0; i < 6; i++) {
            const angle = RAD60 * i + RAD30; // 30 degree offset
            const x = size * Math.cos(angle) + x0;
            const y = size * Math.sin(angle) + y0;
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