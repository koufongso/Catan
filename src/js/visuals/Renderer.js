import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";
import { HexUtils } from "../utils/hex-utils.js";
import { TEXTURE_PATHS } from "../constants/GameConstants.js";
import { TERRAIN_TYPES } from "../constants/TerrainTypes.js";
import { Player } from "../models/Player.js";
import { DEV_CARD_TYPES, PLAYERABLDE_DEVCARDS } from "../constants/DevCardTypes.js";
import { StatusCodes } from "../constants/StatusCodes.js";
import { DebugDashboard } from "./DebugDashboard.js";


// constants for hex geometry
const RAD30 = Math.PI / 6; // 30 degrees in radians
const RAD60 = Math.PI / 3; // 60 degrees in radians
const SQRT3 = Math.sqrt(3);
const SQRT3_HALF = SQRT3 / 2;
// take care of all UI rendering and user interactions
export class Renderer {
    constructor(controller, debugController) {
        // references to game controller and debug controller (for cheat commands)
        this.controller = controller;
        this.debugController = debugController;

        // debug dashboard showing game context
        this.debugdashboard = new DebugDashboard(debugController, this);

        // SVG setup
        this.hexSize = 50; // default hex this.hexSize


    }

    updateDebugDashboard(gameContext, logMessage = null) {
        if (this.debugdashboard) {
            this.debugdashboard.renderDebugHUD(gameContext, logMessage);
        }
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
        const circle = this.createHtmlCircleElement(x, y, this.hexSize / 2 * 0.9, ["token-circle", "token-number"]);
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
            // Shorten line for better aesthetics
            const shortenRatio = 0.5;
            const xStart = x0 + (x - x0) * shortenRatio;
            const yStart = y0 + (y - y0) * shortenRatio;

            const line = this.createHtmlLineElement(xStart, yStart, x, y, ["trading-post-line"]);
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
        const [x, y] = HexUtils.hexToPixel(robberTileCoord, this.hexSize);
        const circle = this.createHtmlCircleElement(x, y, this.hexSize / 2 * 0.9, ["token-circle"], "robber-token");
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

    isRequestSuccessful(res) {
        if (res.status !== StatusCodes.SUCCESS) {
            console.log("Renderer: response status:", res.status);
            if (res.error_message) {
                console.error("Error message:", res.error_message);
            }
            return false;
        }
        return true;
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
        diceBtn.onclick = async () => {
            const res = await this.controller.inputEvent({ type: 'ROLL_DICE' });

            if (!this.isRequestSuccessful(res)) {
                return;
            }
            // handle the result from controller
            // there are three possible scenarios: 
            // 1. normal roll (2-6,8-12): no interaction
            // 2. roll a 7: robber interaction
            //      2.1. game over (someone wins) -> interaction
            //      2.2. activate discard selection mode -> interaction
            //      2.3. actiave robber placement mode -> interaction
            this.renderInteractionHints(res.interaction);

            // update assets
            this.renderPlayerAssets(res.gameContext.players[res.gameContext.currentPlayerIndex], res.gameContext.turnNumber);

            // update debug dashboard
            this.updateDebugDashboard(res.gameContext, `Rolled a ${res.gameContext.lastRoll.sum}`);

        }

        // want to build road, first query valid spots
        const buildRoadBtn = clone.getElementById('build-road-btn');
        buildRoadBtn.onclick = async () => {
            const res = await this.controller.inputEvent({ type: 'QUERY_VALID_SPOTS', queryType: 'ROAD' });
            if (!this.isRequestSuccessful(res)) { // internal error, insufficient resources, wrong state, etc, nothing to do
                return;
            }

            // render valid road spots
            this.renderInteractionHints(res.interaction);
            this.updateDebugDashboard(res.gameContext, "Select a road placement spot.");
        }

        // want to build settlement, first query valid spots
        const buildSettlementBtn = clone.getElementById('build-settlement-btn');
        buildSettlementBtn.onclick = async () => {
            const res = await this.controller.inputEvent({ type: 'QUERY_VALID_SPOTS', queryType: 'SETTLEMENT' });
            if (!this.isRequestSuccessful(res)) {
                return;
            }
            // render valid settlement spots
            this.renderInteractionHints(res.interaction);
            this.updateDebugDashboard(res.gameContext, "Select a settlement placement spot.");
        }

        // want to build city, first query valid spots
        const buildCityBtn = clone.getElementById('build-city-btn');
        buildCityBtn.onclick = async () => {
            const res = await this.controller.inputEvent({ type: 'QUERY_VALID_SPOTS', queryType: 'CITY' });
            if (!this.isRequestSuccessful(res)) {
                return;
            }
            // render valid city spots
            this.renderInteractionHints(res.interaction);
            this.updateDebugDashboard(res.gameContext, "Select a city placement spot.");
        }

        // want to buy dev card, first show confirmation UI
        const buyDevCardBtn = clone.getElementById('buy-dev-card-btn');
        buyDevCardBtn.onclick = () => {
            this.activateBuyDevCardConfirmationUI(); // activate confirmation UI before emitting events
        }

        // want to end turn, send request to end turn (advance FSM)
        const endTurnBtn = clone.getElementById('end-turn-btn');
        endTurnBtn.onclick = async () => {
            const res = await this.controller.inputEvent({ type: 'END_TURN' });
            if (!this.isRequestSuccessful(res)) {
                return;
            }
            this.renderPlayerAssets(res.gameContext.players[res.gameContext.currentPlayerIndex], res.gameContext.turnNumber);
            this.updateDebugDashboard(res.gameContext, "Turn ended.");
        }

        // cancel interation layer elements (like road/settlement/city spots)
        const cancelBtn = clone.getElementById('cancel-btn');
        cancelBtn.onclick = () => {
            this.clearElementById('interaction-layer');
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

        clone.getElementById('start-game').onclick = async () => {
            // async due to loading map from json file
            // emit START_GAME event to controller, expect to recieve map, state, interaction data
            const res = await this.controller.inputEvent({
                type: 'START_GAME',
                mapSize: parseInt(document.getElementById('map-size').value),
                aiPlayers: parseInt(document.getElementById('ai-players').value),
                humanPlayers: parseInt(document.getElementById('human-players').value),
                seed: Date.now()
            });

            if (!this.isRequestSuccessful(res)) {
                return;
            }

            // render the main UI with the received data
            const map = res.gameContext.gameMap;
            this.renderMainUI(map.tiles, map.tradingPosts, map.robberCoord);

            // render interaction hints
            this.renderInteractionHints(res.interaction);

            // update debug dashboard
            this.updateDebugDashboard(res.gameContext, "Game Started");

        }

        // clear existing content and add the clone to main wrapper
        let wrapper = document.getElementById('main-wrapper');
        wrapper.innerHTML = '';
        wrapper.appendChild(clone);
    }

    renderInteractionHints(interaction) {
        if (!interaction) return;
        switch (interaction.action) {
            case 'HIGHLIGHT_SETTLEMENT_SPOTS':
                this.highlightValidSpots(interaction.data.validSettlementCoords, 'SETTLEMENT');
                break;
            case 'HIGHLIGHT_CITY_SPOTS':
                this.highlightValidSpots(interaction.data.validCityCoords, 'CITY');
                break;
            case 'HIGHLIGHT_ROAD_SPOTS':
                this.highlightValidSpots(interaction.data.validRoadCoords, 'ROAD');
                break
            case 'ACTIVATE_DISCARD_MODE':
                this.activateDiscardSelectionMode(interaction.data.resourceToDiscard, interaction.data.numberToDiscard);
                break;
            case 'ACTIVATE_ROBBER_PLACEMENT_MODE':
                this.activateRobberPlacementMode(interaction.data.robableTileCoords);
                break
            case 'ACTIVATE_ROB_SELECTION_MODE':
                this.activateRobSelectionMode(interaction.data.robableSettlementsCoords, interaction.data.robTileCoord);
                break;
            default:
                console.warn(`Unknown interaction action: ${interaction.action}`);
        }
    }

    renderGameOver(winners) {
        const temp = document.getElementById('game-over-template');
        const clone = temp.content.cloneNode(true);

        const winnerAnnouncement = clone.querySelector('#winner-announcement');
        winnerAnnouncement.textContent = `Winner: ${winners.map(p => p.name).join(', ')}`;

        // Append to body to ensure it covers the entire viewport
        document.body.appendChild(clone);
    }


    highlightValidSpots(coords, type) {
        switch (type) {
            case 'SETTLEMENT':
            case 'CITY':
                this.activateSettlementPlacementMode(coords, type);
                break;
            case 'ROAD':
                this.activateRoadPlacementMode(coords);
                break;

            default:
                console.warn(`Unknown highlight type: ${type}`);
        }
    }

    activateSettlementPlacementMode(availableVertexCoords, type) {
        const interactionLayer = this.clearElementById('interaction-layer');
        if (!interactionLayer) return;

        const setttlementPlacementGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        setttlementPlacementGroup.id = `${type}-placement-group`;
        interactionLayer.appendChild(setttlementPlacementGroup);
        interactionLayer.classList.add('placement-mode');

        // 2. Draw ONLY the available spots passed from the controller
        availableVertexCoords.forEach(vCoord => {
            const vertexId = HexUtils.coordToId(vCoord);
            const [x, y] = HexUtils.vertexToPixel(vCoord, this.hexSize);
            const circle = this.createHtmlCircleElement(x, y, 10, [`vertex-${type}-available`, 'hitbox']);
            circle.dataset.id = vertexId; // Store ID for the delegation
            setttlementPlacementGroup.appendChild(circle);
        });

        // 3. Single Event Listener (Event Delegation)
        // Remove existing listener first if necessary to prevent duplicates
        setttlementPlacementGroup.onclick = async (event) => {
            const target = event.target;
            if (target.classList.contains(`vertex-${type}-available`)) {
                this.removeElementById(`${type}-placement-group`);
                const vertexId = target.dataset.id;

                const res = await this.controller.inputEvent({
                    type: `BUILD_${type.toUpperCase()}`,
                    vertexId: vertexId
                });

                if (!this.isRequestSuccessful(res)) {
                    return;
                }

                // render the new settlement/city
                const settlementId = res.settlementId;
                const settlementLevel = res.settlementLevel;
                const color = res.playerColor;
                this.renderSettlement(settlementId, color, settlementLevel);

                this.renderPlayerAssets(res.gameContext.players[res.gameContext.currentPlayerIndex], res.gameContext.turnNumber);

                // highlight road placement
                this.renderInteractionHints(res.interaction);

                // update debug dashboards
                this.updateDebugDashboard(res.gameContext, `Built ${type} at vertex ${vertexId}`);
            }
        };
    }



    renderSettlement(vertexId, color, level) {
        // render a settlement at the given vertexId with the given color and level
        const vertexLayer = document.getElementById('settlement-layer');
        if (!vertexLayer) {
            console.error("Renderer: Vertex layer not found in SVG. Cannot render settlement.");
            return;
        }

        // create a circle element for the settlement
        const vCoord = HexUtils.idToCoord(vertexId);
        const [x, y] = HexUtils.vertexToPixel(vCoord, this.hexSize);
        const settlementCircle = this.createHtmlCircleElement(x, y, level === 1 ? 12 : 18, level === 1 ? ["settlement"] : ["city"]);
        settlementCircle.setAttribute("fill", color);
        settlementCircle.dataset.id = vertexId;
        vertexLayer.appendChild(settlementCircle);
    }

    /**
     * 
     * @param {Array} validEdgeCoords list of edge coordinates where roads can be placed
     * @returns 
     */
    activateRoadPlacementMode(validEdgeCoords) {
        const interactionLayer = this.clearElementById('interaction-layer');
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

            // Use your shortening logic for a better look
            const shortened = this.getShortenedLine(x1, y1, x2, y2, 0.2);
            const edgeLine = this.createHtmlLineElement(shortened.x1, shortened.y1, shortened.x2, shortened.y2, ["edge-road-available", "hitbox"]);
            edgeLine.dataset.id = edgeId;

            roadPlacementGroup.appendChild(edgeLine);
        });

        // EVENT DELEGATION: One listener for all roads
        roadPlacementGroup.onclick = async (event) => {
            const target = event.target;
            if (target.classList.contains('edge-road-available')) {
                this.removeElementById('road-placement-group');
                const res = await this.controller.inputEvent({
                    type: 'BUILD_ROAD',
                    edgeId: target.dataset.id
                });

                if (!this.isRequestSuccessful(res)) {
                    return;
                }

                // render the new roads
                const roadId = res.roadId;
                const color = res.playerColor;
                this.renderRoad(HexUtils.idToCoord(roadId), color);

                this.renderPlayerAssets(res.gameContext.players[res.gameContext.currentPlayerIndex], res.gameContext.turnNumber);

                // proceed to next interaction (initial settlement  placement 2)
                this.renderInteractionHints(res.interaction);

                // update debug dashboard
                this.updateDebugDashboard(res.gameContext, `Built road at edge ${roadId}. Select second settlement location.`);
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

    renderRoad(roadCoord, color) {
        // render a road at the given edgeCoord with the given color
        const roadLayer = document.getElementById('road-layer');
        if (!roadLayer) {
            console.error("Renderer: Road layer not found in SVG. Cannot render road.");
            return;
        }

        // get the two vertex coordinates from edgeCoord
        const [vCoord1, vCoord2] = HexUtils.getVerticesFromEdge(roadCoord);
        const roadId = HexUtils.coordToId(roadCoord);

        // create a line element for the road
        const [x1, y1] = HexUtils.vertexToPixel(vCoord1, this.hexSize);
        const [x2, y2] = HexUtils.vertexToPixel(vCoord2, this.hexSize);

        const shortened = this.getShortenedLine(x1, y1, x2, y2, 0.2);
        const roadLine = this.createHtmlLineElement(shortened.x1, shortened.y1, shortened.x2, shortened.y2, ["road", `road-${roadId}`]);
        roadLine.dataset.id = roadId;
        roadLine.style.stroke = `${color}`;
        roadLayer.appendChild(roadLine);
    }


    activateBuyDevCardConfirmationUI() {
        this.activateActionConfirmationUI({
            title: 'Buy Development Card',
            message: 'Are you sure you want to buy a Development Card for 1 Wheat, 1 Sheep, and 1 Ore?'
        }, 'BUY_DEV_CARD');
    }

    /**
     * Display a confirmation modal for actions that require user confirmation,
     * when confirm button is clicked, emit CONFIRM_ACTION event
     * when cancel button is clicked, emit CANCEL_ACTION event
     * @param {string} title - title of the confirmation modal
     * @param {string} message - message of the confirmation modal 
     */
    activateActionConfirmationUI({ title, message }, confirm_event_name) {
        {
            const temp = document.getElementById('universal-modal-template');
            const clone = temp.content.cloneNode(true);

            // 1. Inject the text
            if (title !== undefined) {
                clone.getElementById('modal-title').textContent = title;
            }

            if (message !== undefined) {
                clone.getElementById('modal-body').textContent = message;
            }

            const overlay = clone.querySelector('.modal-overlay');
            overlay.id = 'action-confirmation-modal-overlay';

            // 2. Add two buttons
            const btnsContainer = clone.getElementById('modal-btns');
            const confirmBtn = this.createHtmlButtonElement('Confirm', ['btn-primary'], 'action-confirm-btn');
            const cancelBtn = this.createHtmlButtonElement('Cancel', ['btn-cancel'], 'action-cancel-btn');

            btnsContainer.appendChild(confirmBtn);
            btnsContainer.appendChild(cancelBtn);

            // 3. Attach ListenersW
            confirmBtn.onclick = async () => {
                const res = await this.controller.inputEvent({ type: confirm_event_name });
                if (!this.isRequestSuccessful(res)) { // if action failed do nothing (buy dev card failed)
                    const overlay = document.getElementById('action-confirmation-modal-overlay')
                    overlay.querySelector('#modal-body').textContent = res.error_message || "Action failed.";
                    return;
                }

                this.deactivateActionConfirmationUI();

                // update player assets
                this.renderPlayerAssets(res.gameContext.players[res.gameContext.currentPlayerIndex], res.gameContext.turnNumber);
                this.updateDebugDashboard(res.gameContext, "Development Card purchased.");
            };

            cancelBtn.onclick = () => {
                this.deactivateActionConfirmationUI();
            };

            document.body.appendChild(clone);
        }
    }

    deactivateActionConfirmationUI() {
        this.removeElementById('action-confirmation-modal-overlay');
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
        this.__renderResources(player.getResources(), resourcesContainer);
    }

    /**
     * Generic helper to render resources into ANY container.
     * @param {Object} resources player object
     * @param {*} container the target container to render into
     * @param {*} onCardClick callback when a card is clicked (optional)
     */
    __renderResources(resources, container, onCardClick = null) {
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
        cardDiv.dataset.type = devCard.type;

        // check if the card is locked (bought this turn)
        if (devCard.isLocked(currentTurnNumber)) {
            cardDiv.classList.add('dev-card-locked'); // cannot be played this turn
        } else if (!devCard.isPlayed() && PLAYERABLDE_DEVCARDS.includes(devCard.type)) {
            // card can be played, pop up action menu on click

            cardDiv.classList.add('dev-card-playable');
            cardDiv.onclick = (event) => {
                // 1. remove existing menu if any
                this.removeElementById('card-action-menu');
                // 2. create new menu on click
                const actionMenuTemplate = document.getElementById('card-action-menu-template');
                if (!actionMenuTemplate) {
                    console.error("Card action menu template not found in DOM");
                    return;
                }

                const actionMenuClone = actionMenuTemplate.content.cloneNode(true);
                const actionMenu = actionMenuClone.querySelector('.card-popover');
                actionMenu.id = 'card-action-menu';
                document.body.appendChild(actionMenu);

                // position the menu near the clicked point
                const clientX = event.clientX
                const clientY = event.clientY;
                const rect = actionMenu.getBoundingClientRect();
                actionMenu.style.left = `${clientX}px`;
                actionMenu.style.top = `${clientY}px`;

                // attach event listeners to menu buttons
                const playBtn = actionMenu.querySelector('#play-dev-card-btn');

                switch (devCard.type) {
                    case DEV_CARD_TYPES.KNIGHT:
                        playBtn.onclick = async () => {
                            const res = await this.controller.inputEvent({type: 'ACTIVATE_KNIGHT'});

                            if (!this.isRequestSuccessful(res)) {
                                return;
                            }

                            actionMenu.remove();

                            // render updated player assets
                            this.renderPlayerAssets(res.gameContext.players[res.gameContext.currentPlayerIndex], res.gameContext.turnNumber);
                            this.renderInteractionHints(res.interaction);
                            this.updateDebugDashboard(res.gameContext, "Knight card played. Select a tile to move the robber.");
                        };
                        break;
                    case DEV_CARD_TYPES.YEAR_OF_PLENTY:
                        playBtn.onclick = async () => {
                            this.activateYearOfPlentyResourceSelection();
                            actionMenu.remove();
                        }
                        break;
                    default:
                        throw new Error(`Unhandled playable dev card type: ${devCard.type}`);
                }

                const cancelBtn = actionMenu.querySelector('#cancel-dev-card-btn');
                cancelBtn.onclick = () => {
                    actionMenu.remove();
                };
            }
        }

        return clone;
    }

    activateYearOfPlentyResourceSelection() {
        this.activateResourcesSelectionMode(
            {
                [RESOURCE_TYPES.BRICK]: 1,
                [RESOURCE_TYPES.ORE]: 1,
                [RESOURCE_TYPES.WOOL]: 1,
                [RESOURCE_TYPES.WHEAT]: 1,
                [RESOURCE_TYPES.LUMBER]: 1
            },
            2,
            'Select 2 Resources for Year of Plenty',
            'ACTIVATE_YEAR_OF_PLENTY'
        );
    }

    /**
     * Activate discard selection UI
     * @param {Object} resourcesToDiscard map of resource type to count
     * @param {*} numToDiscard number of cards to discard
     * @param {*} playerId player id (optional)
     */
    activateDiscardSelectionMode(resourcesToDiscard, numToDiscard, playerId = null) {
        this.activateResourcesSelectionMode(
            resourcesToDiscard,
            numToDiscard,
            playerId ? `Player ${playerId} Select Resources to Discard` : `Select Resources to Discard`,
            "CONFIRM_DISCARD"
        );
    }

    deactivateDiscardSelectionMode() {
        this.removeElementById('resource-selection-modal-overlay');
    }

    /**
     * Let the player select cards to discard
     * @param {Object} resources resource type to count
     * @param {*} numToSelect number of cards to select
     * @param {*} msg message to display in modal title
     * @param {*} confirmEventName event name to emit when selection is confirmed
     */
    activateResourcesSelectionMode(resources, numToSelect, msg, confirmEventName) {
        // render text (not implemented yet)
        // TODO: prompt/notify the player to discard cards

        // render player's hands with selectable cards (only show the resources for now)
        // grab the overlay template
        const modalWindowTemplate = document.getElementById('universal-modal-template');
        const clone = modalWindowTemplate.content.cloneNode(true);

        const overlay = clone.querySelector('.modal-overlay');
        overlay.id = 'resource-selection-modal-overlay';
        const modalCard = clone.querySelector('.modal-card');
        const numCardsToSelect = numToSelect;

        const modelTitle = modalCard.querySelector('#modal-title')
        modelTitle.textContent = `${msg} (0/${numCardsToSelect})`;

        // add confirm button (disable when not enough cards selected, enable when enough)
        const btns = clone.querySelector('#modal-btns');
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm Selection';
        confirmBtn.classList.add('btn-disabled');
        confirmBtn.disabled = true; // initially disabled
        btns.appendChild(confirmBtn);

        // render player's resource cards into the modal body
        const modalBody = modalCard.querySelector('#modal-body');
        this.__renderResources(resources, modalBody, (clickedType, cardDiv) => {
            // card clicked, first check how many are selected
            const selectedCards = modalBody.querySelectorAll('.card-selected');
            if (selectedCards.length >= numCardsToSelect && !cardDiv.classList.contains('card-selected')) {
                // already selected enough and trying to select more (is not selected yet)
                return;
            }

            // can be selected/deselected
            cardDiv.classList.toggle('card-selected');

            // update the title with current count
            const newSelectedCards = modalBody.querySelectorAll('.card-selected');
            modelTitle.textContent = `${msg} (${newSelectedCards.length}/${numCardsToSelect})`;

            // update the confirm button state
            confirmBtn.disabled = newSelectedCards.length < numCardsToSelect;
            if (confirmBtn.disabled) {
                confirmBtn.classList.add('btn-disabled');
                confirmBtn.classList.remove('btn-primary');
            } else {
                confirmBtn.classList.remove('btn-disabled');
                confirmBtn.classList.add('btn-primary');
            }
        });

        // send selected cards with action, this is action cannot be cancelled
        confirmBtn.onclick = async () => {
            const selectedCardsArray = Array.from(modalBody.querySelectorAll('.card-selected')).map(cardDiv => cardDiv.dataset.type);
            const res = await this.controller.inputEvent({ type: confirmEventName, selectedCards: selectedCardsArray });
            if (!this.isRequestSuccessful(res)) {
                throw new Error("Failed to process resource selection action."); // this should not happen in a normal flow
            }

            // clean up
            this.deactivateResourceSelectionMode();
            this.renderPlayerAssets(res.gameContext.players[res.gameContext.currentPlayerIndex], res.gameContext.turnNumber);

            // render next interaction if any
            this.renderInteractionHints(res.interaction);
            this.updateDebugDashboard(res.gameContext, "Resource selection processed.");

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
            hexHitbox.addEventListener('click', async (event) => {
                const res = await this.controller.inputEvent({ type: 'PLACE_ROBBER', tileId: tileId });
                if (!this.isRequestSuccessful(res)) {
                    throw new Error("Failed to place robber.");
                }

                // clean up
                this.deactivateRobberPlacementMode();

                // animate the robber moving to the new tile
                this.moveRobberToTile(hCoord);

                this.renderInteractionHints(res.interaction);

                // update debug dashboard
                this.updateDebugDashboard(res.gameContext, `Robber moved to tile ${tileId}`);

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

        // draw a mask to highlight the tile with robber
        const [robTileX, robTileY] = HexUtils.hexToPixel(robTileCoord, this.hexSize);
        const robTileHex = this.createPolygon(robTileCoord, 'robber-tile-mask', this.hexSize);
        robTileHex.classList.add('robber-tile-mask');
        robSelectionGroup.appendChild(robTileHex);


        // darw a "mask" over the valid settlements
        robableSettlementsCoords.forEach(vCoord => {
            const vertexId = HexUtils.coordToId(vCoord);
            const [x, y] = HexUtils.vertexToPixel(vCoord, this.hexSize);

            const robableCircle = this.createHtmlCircleElement(x, y, 20, ["robbable-settlement"]);
            robableCircle.dataset.vertexId = vertexId;
            robSelectionGroup.appendChild(robableCircle);

            // add click event listener to the hitbox
            robableCircle.addEventListener('click', async (event) => {
                const res = await this.controller.inputEvent({ type: 'ROB_PLAYER', vertexId: vertexId });
                if (!this.isRequestSuccessful(res)) {
                    throw new Error("Failed to rob player.");
                }
                this.deactivateRobSelectionMode();
                this.renderPlayerAssets(res.gameContext.players[res.gameContext.currentPlayerIndex], res.gameContext.turnNumber);
                this.updateDebugDashboard(res.gameContext, `Robbed player at settlement ${vertexId}`);
            });
        });
    }

    // code to deactivate elements
    /**
     * Helper to remove an element by id
     * @param {*} elementId 
     * @returns 
     */
    removeElementById(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        // clean up
        element.onclick = null;
        element.remove();
    }

    clearElementById(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.onclick = null;
        element.innerHTML = '';
        return element;
    }

    deactivateSettlementPlacementMode() {
        this.removeElementById('settlement-placement-group');
    }

    deactivateRobSelectionMode() {
        this.removeElementById('rob-selection-group');
    }

    deactivateRoadPlacementMode() {
        this.removeElementById('road-placement-group');
    }

    deactivateDiceRollMode() {
        this.removeElementById('dice-btn');
    }

    deactivateRobberPlacementMode() {
        this.removeElementById('robber-placement-group');
    }

    deactivateResourceSelectionMode() {
        this.removeElementById('resource-selection-modal-overlay');
    }


    // code to create circle elements
    createHtmlCircleElement(cx, cy, r, className = [], id = null) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        circle.setAttribute("r", r);

        className.forEach(cls => {
            circle.classList.add(cls);
        });

        if (id) {
            circle.id = id;
        }
        return circle;
    }

    // code to create line elements
    createHtmlLineElement(x1, y1, x2, y2, className = [], id = null) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);

        className.forEach(cls => {
            line.classList.add(cls);
        });

        if (id) {
            line.id = id;
        }
        return line;
    }

    createHtmlButtonElement(text, className = [], id = null) {
        const button = document.createElement("button");
        button.textContent = text;
        className.forEach(cls => {
            button.classList.add(cls);
        });
        if (id) {
            button.id = id;
        }
        return button;
    }

}