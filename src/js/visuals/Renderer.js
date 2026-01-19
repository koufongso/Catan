import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";
import { HexUtils } from "../utils/hex-utils.js";
import { TEXTURE_PATHS } from "../constants/GameConstants.js";
import { TERRAIN_TYPES } from "../constants/TerrainTypes.js";
import { Player } from "../models/Player.js";


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
        this.hexSize = 50; // default hex this.hexSize
    }

    attachController(controller) {
        this.controller = controller;
    }


    drawHex(tileLayer, tile) {
        const hexPoly = this.createPolygon(
            tile.coord,
            tile.id,
            this.hexSize
        );
        // set styling
        hexPoly.setAttribute("fill", `url(#pattern-${tile.terrainType.toLowerCase()})`);
        hexPoly.setAttribute("class", `hex-tile`);
        tileLayer.appendChild(hexPoly);
    }

    drawToken(layer, tile) {
        // skip if no token or token is 7 (robber)
        if (tile.numberToken === null || tile.numberToken === 7) return;

        const [x, y] = HexUtils.hexToPixel(tile.coord, this.hexSize);

        // The White Circle
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", this.hexSize / 2 * 0.9);
        circle.setAttribute("class", `token-circle token-number`);
        circle.setAttribute("fill", `url(#pattern-number-${tile.numberToken})`);

        layer.appendChild(circle);
    }

    drawTradingPost(layer, tp) {
        const [x0, y0] = HexUtils.hexToPixel(tp.coord, this.hexSize);
        const RAD60 = Math.PI / 3;
        const RAD30 = Math.PI / 6;

        // Draw the visual connection lines to the vertices
        tp.indexList.forEach(index => {
            const angle = RAD60 * index + RAD30;
            const x = this.hexSize * Math.cos(angle) + x0;
            const y = -this.hexSize * Math.sin(angle) + y0;

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
        console.log("Drawing robber at:", robberTileCoord);
        const [x, y] = HexUtils.hexToPixel(robberTileCoord, this.hexSize);

        // Create a group to center the image/text easily
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("id", "robber-token");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", this.hexSize / 2 * 0.9);
        circle.setAttribute("class", "token-circle");
        circle.setAttribute("fill", `url(#pattern-robber)`);
        layer.appendChild(circle);
    }

    setupTemplate() {
        const temp = document.getElementById('game-template');
        if (!temp) throw new Error("Game template not found in DOM");

        const clone = temp.content.cloneNode(true);

        // Group the layers into a clean object
        const layers = {
            defs: clone.getElementById('defs-layer'),
            static: clone.getElementById('static-layer'),
            settlement: clone.getElementById('settlement-layer'),
            road: clone.getElementById('road-layer'),
            robber: clone.getElementById('robber-layer')
        };

        return { clone, layers };
    }

    updateDOM(clone) {
        const wrapper = document.getElementById('main-wrapper');
        wrapper.innerHTML = ''; // clear existing content
        wrapper.appendChild(clone); // add the new one
    }

    setupPatterns(layer) {
        // create defs element
        let defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

        // pattern definitions for each tile type
        for (const [type, path] of Object.entries(TEXTURE_PATHS.TERRAINS)) {
            const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
            console.log("Creating pattern for:", type, path);
            pattern.setAttribute("id", `pattern-${type.toLowerCase()}`);
            pattern.setAttribute("patternContentUnits", "objectBoundingBox");
            pattern.setAttribute("width", "1");
            pattern.setAttribute("height", "1");

            const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
            image.setAttributeNS("http://www.w3.org/1999/xlink", "href", path);
            image.setAttribute("x", "0");
            image.setAttribute("y", "0");
            image.setAttribute("width", "1");
            image.setAttribute("height", "1");
            image.setAttribute("preserveAspectRatio", "xMidYMid slice");

            pattern.appendChild(image);
            defs.appendChild(pattern);
        }

        // patterns definition for robber token
        const robberPattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
        robberPattern.setAttribute("id", `pattern-robber`);
        robberPattern.setAttribute("patternContentUnits", "objectBoundingBox");
        robberPattern.setAttribute("width", "1");
        robberPattern.setAttribute("height", "1");

        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttributeNS("http://www.w3.org/1999/xlink", "href", TEXTURE_PATHS.TOKENS.ROBBER);
        
        image.setAttribute("x", "0");
        image.setAttribute("y", "0");
        image.setAttribute("width", "1");
        image.setAttribute("height", "1");
        image.setAttribute("preserveAspectRatio", "xMidYMid slice");
        robberPattern.appendChild(image);
        defs.appendChild(robberPattern);

        // patern for number token
        for (const [number, path] of Object.entries(TEXTURE_PATHS.TOKENS.NUMBERS)) {
            const tokenPattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
            tokenPattern.setAttribute("id", `pattern-number-${number}`);
            tokenPattern.setAttribute("patternContentUnits", "objectBoundingBox");
            tokenPattern.setAttribute("width", "1");
            tokenPattern.setAttribute("height", "1");

            const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
            image.setAttributeNS("http://www.w3.org/1999/xlink", "href", path);
            image.setAttribute("x", "0");
            image.setAttribute("y", "0");
            image.setAttribute("width", "1");
            image.setAttribute("height", "1");
            image.setAttribute("preserveAspectRatio", "xMidYMid slice");
            tokenPattern.appendChild(image);
            defs.appendChild(tokenPattern);
        }

        layer.appendChild(defs);
    }

    renderMainUI(tiles, tradingPosts, robberCoord) {
        const { clone, layers } = this.setupTemplate();

        // set up defs for patterns
        this.setupPatterns(layers.defs);

        // draw tiles
        tiles.forEach(t => {
            this.drawHex(layers.static, t);
            this.drawToken(layers.static, t);
        });

        // draw trading posts
        tradingPosts.forEach(tp => {
            this.drawTradingPost(layers.static, tp);
        });

        // draw robber
        this.drawRobber(layers.robber, robberCoord);

        // add action buttons event listeners
        const diceBtn = clone.getElementById('dice-btn');
        diceBtn.onclick = () => {
            this.emitInputEvent('ROLL_DICE', {});
        }

        const buildRoadBtn = clone.getElementById('build-road-btn');
        buildRoadBtn.onclick = () => {
            this.emitInputEvent('BUILD_ROAD', {});
        }

        const buildSettlementBtn = clone.getElementById('build-settlement-btn');
        buildSettlementBtn.onclick = () => {
            this.emitInputEvent('BUILD_SETTLEMENT', {});
        }

        const buildCityBtn = clone.getElementById('build-city-btn');
        buildCityBtn.onclick = () => {
            this.emitInputEvent('BUILD_CITY', {});
        }

        const buyDevCardBtn = clone.getElementById('buy-dev-card-btn');
        buyDevCardBtn.onclick = () => {
            this.emitInputEvent('BUY_DEV_CARD', {});
        }

        const endTurnBtn = clone.getElementById('end-turn-btn');
        endTurnBtn.onclick = () => {
            this.emitInputEvent('END_TURN', {});
        }

        const cancelBtn = clone.getElementById('cancel-btn');
        cancelBtn.onclick = () => {
            this.emitInputEvent('CANCEL_ACTION', {});
        }

        this.updateDOM(clone);
    }


    /**
     * Create a hex polygon SVG element (this will only set points and id, no styling)
     * @param {*} coord 
     * @param {*} id 
     * @param {*} hexSize 
     * @returns {SVGPolygonElement} the created polygon element
     */
    createPolygon(coord, id, hexSize = this.hexSize) {
        let SVG_NS = "http://www.w3.org/2000/svg";
        const poly = document.createElementNS(SVG_NS, "polygon");
        // calculate points based on axial coordinates
        const points = [];
        const [x0, y0] = HexUtils.hexToPixel(coord, hexSize);
        const renderHexSize = 0.94 * hexSize; // slightly smaller for better visuals
        for (let i = 0; i < 6; i++) {
            const angle = RAD60 * i + RAD30; // 30 degree offset
            const x = renderHexSize * Math.cos(angle) + x0;
            const y = - renderHexSize * Math.sin(angle) + y0; // negate it since SVG y-axis is inverted (down is positive)
            points.push(`${x},${y}`);
        }
        poly.setAttribute("points", points.join(" "));

        // set id
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

    renderGameOver(winners) {
        const temp = document.getElementById('game-over-template');
        const clone = temp.content.cloneNode(true);

        const winnerAnnouncement = clone.querySelector('#winner-announcement');
        winnerAnnouncement.textContent = `Winner: ${winners.map(p => p.name).join(', ')}`;

        // Append to body to ensure it covers the entire viewport
        document.body.appendChild(clone);
    }

    activateSettlementPlacementMode(availableVertexCoords) {
        const interactionLayer = document.getElementById('interaction-layer');
        if (!interactionLayer) return;

        const setttlementPlacementGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        setttlementPlacementGroup.id = 'settlement-placement-group';
        interactionLayer.appendChild(setttlementPlacementGroup);
        interactionLayer.classList.add('placement-mode');

        // 2. Draw ONLY the available spots passed from the controller
        availableVertexCoords.forEach(vCoord => {
            const vertexId = HexUtils.coordToId(vCoord);
            const [x, y] = HexUtils.vertexToPixel(vCoord, this.hexSize);

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", y);
            circle.setAttribute("r", 10);
            circle.setAttribute("class", "vertex-settlement-available hitbox");
            circle.dataset.id = vertexId; // Store ID for the delegation

            setttlementPlacementGroup.appendChild(circle);
        });

        // 3. Single Event Listener (Event Delegation)
        // Remove existing listener first if necessary to prevent duplicates
        setttlementPlacementGroup.onclick = (event) => {
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



    renderSettlement(vertexId, color, level) {
        console.log(`Rendering settlement at ${vertexId} with color ${color} and level ${level}`);
        // render a settlement at the given vertexId with the given color and level
        const vertexLayer = document.getElementById('settlement-layer');
        if (!vertexLayer) {
            console.error("Renderer: Vertex layer not found in SVG. Cannot render settlement.");
            return;
        }

        // create a circle element for the settlement
        const settlementCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const vCoord = HexUtils.idToCoord(vertexId);
        const [x, y] = HexUtils.vertexToPixel(vCoord, this.hexSize);
        settlementCircle.setAttribute("cx", x);
        settlementCircle.setAttribute("cy", y);
        settlementCircle.setAttribute("r", level === 1 ? 12 : 18);
        settlementCircle.setAttribute("fill", color);
        settlementCircle.dataset.id = vertexId;
        settlementCircle.setAttribute("class", level === 1 ? "settlement" : "city");
        vertexLayer.appendChild(settlementCircle);
    }

    /**
     * 
     * @param {Array} validEdgeCoords list of edge coordinates where roads can be placed
     * @returns 
     */
    activateRoadPlacementMode(validEdgeCoords) {
        const interactionLayer = document.getElementById('interaction-layer');
        if (!interactionLayer) return;

        const roadPlacementGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        roadPlacementGroup.id = 'road-placement-group';
        interactionLayer.appendChild(roadPlacementGroup);
        interactionLayer.classList.add('placement-mode');

        validEdgeCoords.forEach(eCoord => {
            // Get the two vertex endpoints for this edge
            const edgeId = HexUtils.coordToId(eCoord);
            const [v1Coord, v2Coord] = HexUtils.getVerticesFromEdge(eCoord);
            const [x1, y1] = HexUtils.vertexToPixel(v1Coord, this.hexSize);
            const [x2, y2] = HexUtils.vertexToPixel(v2Coord, this.hexSize);

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
            roadPlacementGroup.appendChild(edgeLine);
        });

        // EVENT DELEGATION: One listener for all roads
        roadPlacementGroup.onclick = (event) => {
            const target = event.target;
            if (target.classList.contains('edge-road-available')) {
                this.emitInputEvent('PLACE_ROAD', { edgeId: target.dataset.id });
            }
        };
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
        const edgeLayer = document.getElementById('road-layer');
        if (!edgeLayer) {
            console.error("Renderer: Edge layer not found in SVG. Cannot render road.");
            return;
        }

        // get the two vertex coordinates from edgeId
        const eCoord = HexUtils.idToCoord(edgeId);
        const [vCoord0, vCoord1] = HexUtils.getVerticesFromEdge(eCoord);

        // create a line element for the road
        const roadLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const [x0, y0] = HexUtils.vertexToPixel(vCoord0, this.hexSize);
        const [x1, y1] = HexUtils.vertexToPixel(vCoord1, this.hexSize);
        console.log("vertex0:", vCoord0, x0, y0);
        console.log("vertex1:", vCoord1, x1, y1);
        const dir = [x1 - x0, y1 - y0];
        const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
        const shorten_ratio = 0.2;
        const x0_short = x0 + dir[0] * (shorten_ratio * this.hexSize / len);
        const y0_short = y0 + dir[1] * (shorten_ratio * this.hexSize / len);
        const x1_short = x1 - dir[0] * (shorten_ratio * this.hexSize / len);
        const y1_short = y1 - dir[1] * (shorten_ratio * this.hexSize / len);
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


    activateDiceRollMode() {
        const diceBtn = document.getElementById('dice-btn');
        if (!diceBtn) {
            console.error("Renderer: Dice button not found in HTML. Cannot activate dice roll mode.");
            return;
        }
        diceBtn.classList.add('btn-active');
        diceBtn.onclick = () => {
            this.emitInputEvent('ROLL_DICE', {});
        }
    }


    activateActionBtnMode() {
        // build
        const actionBtn = document.getElementById('action-btn');
    }


    /**
     * Display a confirmation modal for actions that require user confirmation,
     * when confirm button is clicked, emit CONFIRM_ACTION event
     * when cancel button is clicked, emit CANCEL_ACTION event
     * @param {string} title - title of the confirmation modal
     * @param {string} message - message of the confirmation modal 
     */
    activateActionConfirmationUI({ title, message }) {
        const temp = document.getElementById('action-confirm-template');
        const clone = temp.content.cloneNode(true);

        // 1. Inject the text
        clone.getElementById('confirm-title').textContent = title;
        clone.getElementById('confirm-message').textContent = message;

        // 2. Wrap the element so we can remove it later
        const overlay = clone.getElementById('confirm-modal');

        // 3. Attach Listeners
        clone.getElementById('action-confirm-btn').onclick = () => {
            overlay.remove();
            this.emitInputEvent('CONFIRM_ACTION', {});
        };

        clone.getElementById('action-cancel-btn').onclick = () => {
            overlay.remove();
            this.emitInputEvent('CANCEL_ACTION', {});
        };

        document.body.appendChild(clone);
    }


    /**
     * Render the card
     * @param {Object} resources  {[RESOURCE_TYPES]: amount}, ...}
     * @param {Array} devCards list of dev card types
     */
    renderPlayerAssets(player, currentTurnNumber) {
        this.renderPlayerResourceCards(player);
        this.renderPlayerDevCards(player, currentTurnNumber);
    }

    /**
     * Render the resource cards in player's hand (regular hand display)
     * @param {*} player 
     */
    renderPlayerResourceCards(player) {
        const resourcesContainer = document.getElementById('player-hands-resources-container');
        this.__renderPlayerResources(player, resourcesContainer);
    }

    /**
     * Generic helper to render resources into ANY container.
     * @param {Player} player player object
     * @param {*} container the target container to render into
     * @param {*} onCardClick callback when a card is clicked (optional)
     */
    __renderPlayerResources(player, container, onCardClick = null) {
                const resources = player.getResources();
        container.innerHTML = ''; // clear existing content

        // resource resources
        for (const [type, amount] of Object.entries(resources)) {
            for (let i = 0; i < amount; i++) {
                const cardHtml = this.createResourceCardHtml(type);
                const cardDiv = cardHtml.querySelector('.card-container');
                if (onCardClick) {
                    cardDiv.onclick = () => onCardClick(type, cardDiv);
                }
                container.appendChild(cardHtml);
            }
        }
    }

    renderPlayerDevCards(player, currentTurnNumber) {
        const devCards = player.getDevCards();
        const devCardsContainer = document.getElementById('player-hands-devcards-container');
        const usedDevCardsContainer = document.getElementById('player-used-devcards-container');
        devCardsContainer.innerHTML = '';
        usedDevCardsContainer.innerHTML = ''; // clear existing content

        // used dev cards
        devCards.forEach(card => {
            if (card.isPlayed()) {
                const cardHtml = this.createDevCardHtml(card, currentTurnNumber);
                usedDevCardsContainer.appendChild(cardHtml);
            }
        });

        // dev cards
        console.log("Rendering dev cards:", devCards);
        devCards.forEach(card => {
            if (card.isPlayed()) {
                return; // skip played cards
            }
            const cardHtml = this.createDevCardHtml(card, currentTurnNumber);
            devCardsContainer.appendChild(cardHtml);
        });
    }


    /**
     * Create a resource card HTML element
     * @param {RESOURCE_TYPES} type 
     */
    createResourceCardHtml(type) {
        const template = document.getElementById('card-template');
        const clone = template.content.cloneNode(true);
        const cardDiv = clone.querySelector('.card-container');
        cardDiv.dataset.type = type;
        const img = clone.querySelector('.card-image');

        img.src = TEXTURE_PATHS.CARDS[type];
        img.alt = `${type} Card`;
        cardDiv.classList.add('resource-card');
        return clone;
    }

    /**
     * Create a dev card HTML element
     * @param {DevCard} devCard a dev card object
     * @param {number} currentTurnNumber the current turn number (use to check if dev card is locked)
     */
    createDevCardHtml(devCard, currentTurnNumber) {
        const template = document.getElementById('card-template');
        const clone = template.content.cloneNode(true);
        const cardDiv = clone.querySelector('.card-container');
        const img = clone.querySelector('.card-image');

        img.src = TEXTURE_PATHS.CARDS[devCard.type];
        img.alt = `${devCard.type} Dev Card`;
        cardDiv.classList.add('dev-card');
        console.log("current turn number:", currentTurnNumber, "dev card:", devCard);
        if (devCard.isLocked(currentTurnNumber)) {
            cardDiv.classList.add('dev-card-locked'); // cannot be played this turn
        }

        return clone;
    }

    /**
     * Let the player select cards to discard
     * @param {*} player 
     */
    activateDiscardSelectionMode(player) {
        // render text (not implemented yet)
        // TODO: prompt/notify the player to discard cards

        // render player's hands with selectable cards (only show the resources for now)
        // grab the overlay template
        const modalWindowTemplate = document.getElementById('universal-modal-template');
        const clone = modalWindowTemplate.content.cloneNode(true);

        const overlay = clone.querySelector('.modal-overlay');
        overlay.id = 'discard-modal-overlay';
        const modalCard = clone.querySelector('.modal-card');
        const numCardsToDiscard = Math.floor(player.getTotalResourceCount() / 2);

        const modelTitle = modalCard.querySelector('#modal-title')
        modelTitle.textContent = `${player.name}: Select ${numCardsToDiscard} Cards to Discard (0/${numCardsToDiscard})`;
        
        // add confirm button (disable when not enough cards selected, enable when enough)
        const btns = clone.querySelector('#modal-btns');
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm Discard';
        confirmBtn.classList.add('btn-disabled');
        confirmBtn.disabled = true; // initially disabled
        btns.appendChild(confirmBtn);

        // render player's resource cards into the modal body
        const modalBody  = modalCard.querySelector('#modal-body');
        this.__renderPlayerResources(player, modalBody, (clickedType, cardDiv) => {
            // card clicked, first check how many are selected
            const selectedCards = modalBody.querySelectorAll('.discard-selected');
            if (selectedCards.length >= numCardsToDiscard && !cardDiv.classList.contains('discard-selected')) {
                // already selected enough and trying to select more (is not selected yet)
                return;
            }

            // can be selected/deselected
            cardDiv.classList.toggle('discard-selected');

            // update the title with current count
            const newSelectedCards = modalBody.querySelectorAll('.discard-selected');
            modelTitle.textContent = `${player.name}:Select ${numCardsToDiscard} Cards to Discard (${newSelectedCards.length}/${numCardsToDiscard})`;

            // update the confirm button state
            confirmBtn.disabled = newSelectedCards.length < numCardsToDiscard;
            if (confirmBtn.disabled) {
                confirmBtn.classList.add('btn-disabled');
                confirmBtn.classList.remove('btn-primary');
            } else {
                confirmBtn.classList.remove('btn-disabled');
                confirmBtn.classList.add('btn-primary');
            }
        });

        // send all selected cards when confirm is clicked
        confirmBtn.onclick = () => {
            const selectedCardsArray = Array.from(modalBody.querySelectorAll('.discard-selected')).map(cardDiv => cardDiv.dataset.type);
            this.emitInputEvent('CONFIRM_DISCARD', { selectedCards: selectedCardsArray });
        };
        // append to main wrapper
        document.getElementById('main-wrapper').appendChild(clone);
    }


    activateRobberPlacementMode(robbableTileCoords) {

        // get the tile layer
        const tileLayer = document.getElementById('interaction-layer');
        if (!tileLayer) return;

        // group for easier cleanup later
        const robberPlacementGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        robberPlacementGroup.id = 'robber-placement-group';
        tileLayer.appendChild(robberPlacementGroup);

        // create "virtual" hitboxes over the valid tiles and add event listeners
        robbableTileCoords.forEach(hCoord => {
            const tileId = HexUtils.coordToId(hCoord);
            const hexHitbox = this.createPolygon(hCoord, tileId, this.hexSize);
            hexHitbox.dataset.tileId = tileId;
            hexHitbox.classList.add('robbable-tile'); // this should highlight the tile visually
            robberPlacementGroup.appendChild(hexHitbox);

            // add click event listener to the hitbox
            hexHitbox.addEventListener('click', (event) => {
                this.emitInputEvent('PLACE_ROBBER', { tileId: tileId });
            });
        });
    }


    moveRobberToTile(tileCoord) {

        // animate the robber moving to the new tile
        const robberLayer = document.getElementById('robber-layer');
        if (!robberLayer) {
            throw new Error("Robber layer not found in SVG");
        }
        
        const circle = robberLayer.querySelector('#robber-token');
        
        if (!circle) {
            throw new Error("Robber token not found in SVG");
        }

        const [newX, newY] = HexUtils.hexToPixel(tileCoord, this.hexSize);

        const animation = circle.animate(
        [
            // Keyframes
            { cx: circle.getAttribute('cx'), cy: circle.getAttribute('cy') }, // Start point 
            { cx: newX, cy: newY } // End point
        ],
        {
            // Timing options
            duration: 1000, // seconds
            iterations: 1, // Run once
            fill: 'both', // Keep the final state after animation
            easing: 'ease-in-out'
        }
        );

        animation.onfinish = () => {
            // ensure final position is set
            circle.setAttribute('cx', newX);
            circle.setAttribute('cy', newY);
        }

        // start the animation
        animation.play();
    }


    activateRobSelectionMode(robableSettlementsCoords, robTileCoord) {
        const interactionLayer = document.getElementById('interaction-layer');
        if (!interactionLayer) return;

        const robSelectionGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        robSelectionGroup.id = 'rob-selection-group';
        interactionLayer.appendChild(robSelectionGroup);
        interactionLayer.classList.add('placement-mode');

        // draw a mask to hightlight the tile with robber
        const [robTileX, robTileY] = HexUtils.hexToPixel(robTileCoord, this.hexSize);
        const robTileHex = this.createPolygon(robTileCoord, 'robber-tile-mask', this.hexSize);
        robTileHex.classList.add('robber-tile-mask');
        robSelectionGroup.appendChild(robTileHex);


        // darw a "mask" over the valid settlements
        robableSettlementsCoords.forEach(vCoord => {
            const vertexId = HexUtils.coordToId(vCoord);
            const [x, y] = HexUtils.vertexToPixel(vCoord, this.hexSize);

            const robableCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            robableCircle.setAttribute("cx", x);
            robableCircle.setAttribute("cy", y);
            robableCircle.setAttribute("r", 20);
            robableCircle.classList.add("robbable-settlement");
            robableCircle.dataset.id = vertexId;


            robableCircle.dataset.vertexId = vertexId;
            robSelectionGroup.appendChild(robableCircle);

            // add click event listener to the hitbox
            robableCircle.addEventListener('click', (event) => {
                this.emitInputEvent('ROB_PLAYER', { vertexId: vertexId });
            });
        });
    }


    // code to deactivate elements
    /**
     * Helper to remove an element by id
     * @param {*} elementId 
     * @returns 
     */
    removeElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        // clean up
        element.onclick = null;
        element.remove();
    }

    deactivateSettlementPlacementMode() {
        this.removeElement('settlement-placement-group');
    }   

    deactivateRobSelectionMode() {
        this.removeElement('rob-selection-group');
    }

    deactivateRoadPlacementMode() {
        this.removeElement('road-placement-group');
    }

    deactivateDiceRollMode() {
        this.removeElement('dice-btn');
    }

    deactivateRobberPlacementMode() {
        this.removeElement('robber-placement-group');
    }

    deactivateDiscardSelectionMode() {
        this.removeElement('discard-modal-overlay');
    }

}