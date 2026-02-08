import { RESOURCE_TYPES } from "../../constants/ResourceTypes.js";
import { HexUtils } from "../../utils/hex-utils.js";
import { TEXTURE_PATHS } from "../../constants/RenderingConstants.js";
import { TERRAIN_TYPES } from "../../constants/TerrainTypes.js";
import { Player } from "../../models/Player.js";
import { DEV_CARD_TYPES, PLAYERABLDE_DEVCARDS } from "../../constants/DevCardTypes.js";
import { StatusCodes } from "../../constants/StatusCodes.js";
import { DebugDashboard } from "../debug/DebugDashboard.js";
import { GameUtils } from "../../utils/game-utils.js";
import { HtmlUtils } from "../../utils/html-utils.js";
import { StatusCodesUtils } from "../../utils/status-code-utils.js";
import { HEX_SIZE } from "../../constants/RenderingConstants.js";

// constants for hex geometry
const RAD30 = Math.PI / 6; // 30 degrees in radians
const RAD60 = Math.PI / 3; // 60 degrees in radians
const SQRT3 = Math.sqrt(3);
const SQRT3_HALF = SQRT3 / 2;
// take care of all UI rendering and user interactions
export class GameRenderer {
    constructor() {
        // references to game controller and debug controller (for cheat commands)

        // debug dashboard showing game context
        // this.debugdashboard = new DebugDashboard(debugController, this);

        // SVG setup
        this.hexSize = HEX_SIZE; // default hex this.hexSize

        this.gameMap = null; // a client-side copy of the game map for rendering

        this.isRobberAnimating = false; // flag to indicate if robber animation is in progress
    }

    /**
     * Draw the game UI components and set up the DOM
     */
    initializeUI() {
        const wrapper = document.getElementById('main-wrapper');
        if (wrapper.innerHTML.trim() === "") { // only initialize if empty
            wrapper.innerHTML = ''; // clear existing content
            const temp = document.getElementById('game-template');
            if (!temp) throw new Error("Game template not found in DOM");
            const clone = temp.content.cloneNode(true);
            wrapper.appendChild(clone); // add the new one
        }

        // Group the layers into a clean object
        this.layers = {
            defs: document.getElementById('defs-layer'),
            static: document.getElementById('static-layer'),
            settlement: document.getElementById('settlement-layer'),
            road: document.getElementById('road-layer'),
            robber: document.getElementById('robber-layer')
        };

        console.log("Game UI initialized with layers:", this.layers);
    }


    /**
     * Draw the static board elements (hexes, tokens, trading posts)
     * @param {*} gameMap 
     */
    drawStaticBoard(gameMap) {
        this.setupPatterns(this.layers.defs);

        // Draw Hexes and Tokens once
        for (const tile of Object.values(gameMap.tiles)) {
            this.drawHex(this.layers.static, tile);
            this.drawToken(this.layers.static, tile);
        }

        for (const tp of Object.values(gameMap.tradingPosts)) {
            this.drawTradingPost(this.layers.static, tp);
        }
    }

    /**
     * Draw the dynamic game state (robber, buildings, etc.)
     * @param {*} gameMap 
     * @param {*} playerId current player (viewing the UI) 
     */
    refreshGameState(gameContext, playerId) {
        const playerColors = {};
        for (let player of gameContext.players) {
            playerColors[player.id] = player.color;
        }
        const gameMap = gameContext.gameMap;
        // Clear dynamic layers if needed
        this.layers.settlement.innerHTML = '';
        this.layers.road.innerHTML = '';
        this.layers.robber.innerHTML = '';

        this.drawRobber(this.layers.robber, gameMap.robberCoord);
        this.drawExistingBuildings(gameMap, playerColors);

        // draw current player hands, dev cards, resources, etc.
        // find the current player
        for (const p of gameContext.players) {
            if (p.id === playerId) {
                const playerInstance = new Player(p); // create a Player instance from raw data   
                this.renderPlayerAssets(playerInstance, gameContext.turnNumber);
            }
        }
    }


    drawExistingBuildings(gameMap, playerColors = {}) {

        for (const settlement of Object.values(gameMap.settlements)) {
            const settlementElement = HtmlUtils.createSettlementElement(settlement.coord, { color: playerColors[settlement.ownerId] }, ["settlement"], this.hexSize);
            this.layers.settlement.appendChild(settlementElement);
        }

        for (const road of Object.values(gameMap.roads)) {
            const roadElement = HtmlUtils.createRoadElement(road.coord, { color: playerColors[road.ownerId] }, ["road"], this.hexSize);
            this.layers.road.appendChild(roadElement);
        }
    }


    drawHex(tileLayer, tile) {
        const hexPoly = HtmlUtils.createSvgPolygon(
            tile.coord,
            [], // no additional classes for now, styling is done through patterns
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
        const circle = HtmlUtils.createSvgCircle(x, y, this.hexSize / 2 * 0.9, ["token-circle", "token-number"]);
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

            const line = HtmlUtils.createSvgLine(xStart, yStart, x, y, ["trading-post-line"]);
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
        const circle = HtmlUtils.createSvgCircle(x, y, this.hexSize / 2 * 0.9, ["token-circle"], "robber-token");
        circle.setAttribute("fill", `url(#pattern-robber)`);
        layer.appendChild(circle);
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





    renderGameOver(winners) {
        const temp = document.getElementById('game-over-template');
        const clone = temp.content.cloneNode(true);

        const winnerAnnouncement = clone.querySelector('#winner-announcement');
        winnerAnnouncement.textContent = `Winner: ${winners.map(p => p.name).join(', ')}`;

        // Append to body to ensure it covers the entire viewport
        document.body.appendChild(clone);
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
                if (!StatusCodesUtils.isRequestSuccessful(res)) { // if action failed do nothing (buy dev card failed)
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
        HtmlUtils.removeElementById('action-confirmation-modal-overlay');
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
                HtmlUtils.removeElementById('card-action-menu');
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
                            const res = await this.controller.inputEvent({ type: 'ACTIVATE_KNIGHT' });

                            if (!StatusCodesUtils.isRequestSuccessful(res)) {
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
                [RESOURCE_TYPES.BRICK]: 2,
                [RESOURCE_TYPES.ORE]: 2,
                [RESOURCE_TYPES.WOOL]: 2,
                [RESOURCE_TYPES.WHEAT]: 2,
                [RESOURCE_TYPES.LUMBER]: 2
            },
            2,
            'Select 2 Resources for Year of Plenty',
            'ACTIVATE_YEAR_OF_PLENTY'
        );
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
            if (!StatusCodesUtils.isRequestSuccessful(res)) {
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


    animateMoveRobberToTile(tileCoord) {
        return new Promise((resolve, reject) => {
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

            animation.onfinish = (() => {
                // ensure final position is set
                circle.setAttribute('cx', newX);
                circle.setAttribute('cy', newY);
            });

            // start the animation
            animation.play();
            console.log("Robber movement animation started.");
        });
    }
}