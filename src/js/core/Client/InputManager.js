// handle UI input/interaction layer drawing

// BUILD_ROAD mode:
//  - allow user to click edges to build multiple roads, with preview of road placement
//  - Confirm: submit all selected roads to server and clear layer
//  - Cancel: clear layer (quit)
//  - Undo: remove last selected road
//  - Exception: no cancel during inital road building (setup phase)

// BUILD_SETTLEMENT mode:
//  - allow user to click one vertex to build a settlement
import { HEX_SIZE } from "../../constants/RenderingConstants.js";
import { HtmlUtils } from "../../utils/html-utils.js";
import { StatusCodes } from "../../constants/StatusCodes.js";
import { GameUtils } from "../../utils/game-utils.js";
import { HexUtils } from "../../utils/hex-utils.js";
import { BuildingPredictor } from "../../utils/building-predictor.js";


export class InputManager {
    constructor(gameClient) {
        this.gameClient = gameClient; // reference to the parent GameClient
        this.playerId = null; // the id of the player using this input manager
        this.gameMap = null; // a snapshot of the game map before input begins
        this.interactionLayer = null; // the interaction layer DOM element

        this.buildingPredictor = new BuildingPredictor(); // a helper class to predict building placements (before submit to server)

        this.currentMode = 'IDLE'; // IDLE, INITIAL_PLACEMENT, BUILD_ROAD, BUILD_SETTLEMENT, BUILD_CITY, TRADE, DISCARD, ROBBER, etc.

        // 
        this.elementIds = {
            btnRoll: 'btn-roll',
            btnBuildRoad: 'btn-build-road',
            btnBuildSettlement: 'btn-build-settlement',
            btnBuildCity: 'btn-build-city',
            btnBuyDevCard: 'btn-buy-dev-card',
            // btnCancel: 'btn-cancel',
            btnEndTurn: 'btn-end-turn',

            devCardsGroup: 'player-hands-devcards-container',

            interactionLayer: 'interaction-layer',
            interactionBtnConfirm: 'map-interaction-confirm-btn',
            interactionBtnCancel: 'map-interaction-cancel-btn',
            interactionBtnUndo: 'map-interaction-undo-btn',
        }

        // button onclick handlers
        this.onclickHandler = {
            btnRoll: (event) => {
                this.gameClient.btnRollOnClick(event);
            },
            btnEndTurn: (event) => {
                this.gameClient.btnEndTurnOnClick(event);
            },

        }



    }

    initalize() {// bind all interactable elements
        this.bindInteractionLayer();
        this.bindBtnHandlers();
        this.bindDevCardHandlers();
    }

    bindInteractionLayer() {
        console.log("Binding interaction layer:", this.elementIds.interactionLayer);
        this.interactionLayer = document.getElementById(this.elementIds.interactionLayer);
        if (!this.interactionLayer) {
            throw new Error("Interaction layer not found!");
        }
    }

    bindBtnHandlers() {
        this.interactionBtnGroup = {
            btnRoll: document.getElementById(this.elementIds.btnRoll),
            btnBuildRoad: document.getElementById(this.elementIds.btnBuildRoad),
            btnBuildSettlement: document.getElementById(this.elementIds.btnBuildSettlement),
            btnBuildCity: document.getElementById(this.elementIds.btnBuildCity),
            btnBuyDevCard: document.getElementById(this.elementIds.btnBuyDevCard),
            //btnCancel: document.getElementById(this.elementIds.btnCancel),
            btnEndTurn: document.getElementById(this.elementIds.btnEndTurn)
        };

        for (let [name, btn] of Object.entries(this.interactionBtnGroup)) {
            if (!btn) {
                throw new Error(`Button ${name} not found in btnGroup!`);
            }
        }
        this.deactivateAllBtns(); // start with all buttons deactivated
    }

    bindDevCardHandlers() {
        // bind dev card buttons here
        this.devCardsGroup = document.getElementById(this.elementIds.devCardsGroup);
        if (!this.devCardsGroup) {
            throw new Error("Dev cards layer not found!");
        }
    }

    /*--------------------------------------------Activate/Deactivate handler ------------------------------------------------------- */
    clearBtnHandlers() {
        for (let btn of Object.values(this.interactionBtnGroup)) {
            btn.onclick = null;
        }
    }

    activateBtn(name) {
        if (this.interactionBtnGroup[name]) {
            const btn = this.interactionBtnGroup[name];
            btn.onclick = this.onclickHandler[name];
            btn.disabled = false;
            btn.classList.remove('btn-disabled');
        } else {
            console.warn(`Button ${name} not found in btnGroup.`);
        }
    }

    deactivateBtn(name) {
        if (this.interactionBtnGroup[name]) {
            const btn = this.interactionBtnGroup[name];
            btn.disabled = true;
            btn.classList.add('btn-disabled');
        } else {
            console.warn(`Button ${name} not found in btnGroup.`);
        }
    }

    deactivateAllBtns() {
        for (let btn of Object.values(this.interactionBtnGroup)) {
            btn.disabled = true;
            btn.classList.add('btn-disabled');
        }
    }

    activateDevCards() {
        // enable dev card buttons
        this.devCardsGroup.onclick = (event) => {
            const cardType = event.target.dataset.cardType;
            if (cardType) {
                this.gameClient.submitPlayDevCard(cardType);
            }
        };
    }

    deactivateDevCards() {
        // disable dev card clicking
        this.devCardsGroup.onclick = null;
    }






    setMode(mode) {
        this.currentMode = mode;
    }

    clearInteractionLayer() {
        console.warn("Clearing interaction layer.");
        HtmlUtils.clearElementById(this.elementIds.interactionLayer);
    }


    createBtnGroup(mode) {
        // use binary code to create button group: 1 = present, 0 = absent
        // e.g., 111 = confirm, cancel, undo; 110 = confirm, cancel
        const width = 80;
        const height = 40;
        const spacing = 10;

        const x0 = 0;
        const y0 = document.getElementById('map-svg').getBoundingClientRect().height / 2 - height - spacing;


        let x = x0;
        let y = y0;
        let btnGroup = [];
        if ((mode & 1 << 2) >> 2 === 1) {
            // confirm button
            const confirmBtn = HtmlUtils.createSvgButton(x0, y0, width, height, "Confirm", () => {
                this.handleConfirmBtnClick.bind(this)();
            });
            confirmBtn.id = this.elementIds.interactionBtnConfirm;
            confirmBtn.classList.add('svg-btn-confirm');
            btnGroup.push(confirmBtn);
            x += width + spacing;
            y = y0;
        }

        if ((mode & 1 << 1) >> 1 === 1) {
            // cancel button
            const cancelBtn = HtmlUtils.createSvgButton(x, y, width, height, "Cancel", () => {
                this.handleCancelBtnClick.bind(this)();
            });
            cancelBtn.id = this.elementIds.interactionBtnCancel;
            cancelBtn.classList.add('svg-btn-cancel');
            btnGroup.push(cancelBtn);
            x += width + spacing;
            y = y0;
        }

        if ((mode & 1 << 0) === 1) {
            // undo button
            const undoBtn = HtmlUtils.createSvgButton(x, y, width, height, "Undo", () => {
                this.handleUndoBtnClick.bind(this)();
            });
            undoBtn.id = this.elementIds.interactionBtnUndo;
            undoBtn.classList.add('svg-btn-undo');
            btnGroup.push(undoBtn);
            x += width + spacing;
            y = y0;
        }
        return btnGroup;
    }


    /**
     * Helper function to draw from building predictor and update interaction layer
     * must have called getNextValidSpots() before calling this function
     * @param {BuildingPredictor} buildingPredictor
     * @returns 
     */
    _drawFromBuildingPredictor(buildingPredictor, skipPlacedBuildings = false, skipValidSpots = false) {
        if (!buildingPredictor.initialized) {
            console.error("BuildingPredictor not initialized. Cannot draw interaction layer.");
            return;
        }

        if (buildingPredictor.lastResult.result === null) {
            console.log("No valid spots to draw from BuildingPredictor.");
            return;
        }

        const buildingType = buildingPredictor.lastResult.type; // Set of valid settlement spot ids
        const validBuildingSpots = buildingPredictor.lastResult.result;    // Set of valid road spot ids
        const placedBuildings = buildingPredictor.buildStack;   // Array of placed buildings {type, coord}

        // clear interaction layer
        this.clearInteractionLayer();
        console.log("Start drawing interaction layer from BuildingPredictor.");

        // redraw valid spots
        if (!skipValidSpots && buildingType === 'SETTLEMENT' && validBuildingSpots.size > 0) {
            const validSettlementCoords = Array.from(validBuildingSpots).map(id => HexUtils.idToCoord(id));
            const settlementPlacementGroup = HtmlUtils.createSettlementPlacementGroup(validSettlementCoords, this.handleVertexClick.bind(this), { color: this.playerColor }, ["available-settlement"], HEX_SIZE);
            settlementPlacementGroup.classList.add('valid-settlement-group');
            this.interactionLayer.appendChild(settlementPlacementGroup);
        }

        if (!skipValidSpots && buildingType === 'ROAD' && validBuildingSpots.size > 0) {
            const validRoadCoords = Array.from(validBuildingSpots).map(id => HexUtils.idToCoord(id));
            const roadPlacementGroup = HtmlUtils.createRoadPlacementGroup(validRoadCoords, this.handleEdgeClick.bind(this), { color: this.playerColor }, ["available-road"], HEX_SIZE);
            this.interactionLayer.appendChild(roadPlacementGroup);
        }

        // redraw placed buildings
        if (!skipPlacedBuildings) {
            for (let building of placedBuildings) {
                if (building.type === 'SETTLEMENT') {
                    const settlementElement = HtmlUtils.createSettlementElement(building.coord, { color: this.playerColor }, ["placed-settlement"], HEX_SIZE);
                    this.interactionLayer.appendChild(settlementElement);
                } else if (building.type === 'ROAD') {
                    const roadElement = HtmlUtils.createRoadElement(building.coord, { color: this.playerColor }, ["placed-road"], HEX_SIZE);
                    this.interactionLayer.appendChild(roadElement);
                }
            }
        }
        return;
    }

    /*----------------------------------------------------------------Initial Placement Mode----------------------------------------------------------------*/
    clearInitialPlacementContext() {
        this.gameMap = null;
        this.playerColor = null;
        this.playerId = null;
        this.buildingPredictor.clear();
    }

    setInitialPlacementContext(playerId, gameMap, playerColor) {
        this.gameMap = gameMap;
        this.playerColor = playerColor;
        this.playerId = playerId;
        this.buildingPredictor.init(gameMap, playerId, "INITIAL_PLACEMENT");
    }


    activateInitialPlacementInteractionLayer(playerId, gameMap, playerColor) {
        this.setMode('INITIAL_PLACEMENT');
        console.log("Activating initial placement interaction layer for player:", playerId);

        if (!this.interactionLayer) {
            console.error("Interaction layer not found!");
            return;
        }

        // clear/reset interaction layer
        this.clearInteractionLayer();
        this.clearInitialPlacementContext();
        this.setInitialPlacementContext(playerId, gameMap, playerColor);

        // show all valid settlement spots for the player
        const res = this.buildingPredictor.getNextValidSpots();
        if (res.status !== StatusCodes.SUCCESS) {
            console.error("Failed to get valid settlement spots:", res);
            return;
        }

        // draw all elements from building predictor
        this._drawFromBuildingPredictor(this.buildingPredictor);


        // append button group
        const btnGroup = this.createBtnGroup(0b101); // confirm and undo only, no cancel during initial placement
        for (let btn of btnGroup) {
            this.interactionLayer.appendChild(btn);
        }

        // check btn state
        if (res.result === null) {
            document.getElementById(this.elementIds.interactionBtnConfirm).classList.remove('svg-btn-disabled');
        } else {
            document.getElementById(this.elementIds.interactionBtnConfirm).classList.add('svg-btn-disabled');
        }
    }


    /*----------------------------------------------------------------Settlement/City Building Mode----------------------------------------------------------------*/

    clearSettlementBuildingContext() {
        this.clickedVertex = [];
        this.numberOfSettlements = 0;
        this.gameMap = null;
        this.playerColor = null;
        this.playerId = null;
        this.placementPhase = null;
    }

    setSettlementBuildingContext(playerId, numberOfSettlements, placementPhase, gameMap, playerColor) {
        this.clickedVertex = [];
        this.gameMap = gameMap;
        this.playerColor = playerColor;
        this.playerId = playerId;
        this.placementPhase = placementPhase;
        this.numberOfSettlements = numberOfSettlements;
    }



    activateSettlementInteractionLayer(playerId, placementPhase, gameMap, playerColor) {
        console.log("Activating settlement interaction layer for player:", playerId, "phase:", placementPhase);
        if (!this.interactionLayer) {
            console.error("Interaction layer not found!");
            return;
        }

        // clear existing layer
        this.clearInteractionLayer();
        this.clearSettlementBuildingContext();
        this.setSettlementBuildingContext(playerId, 1, placementPhase, gameMap, playerColor);

        // show all valid settlement spots for the player
        const validSettlementSpots = GameUtils.getValidSettlementSpots(gameMap, null); // use playerId = null to show all valid spots

        // draw all elements from building predictor
        this._drawFromBuildingPredictor(this.buildingPredictor);

        // create button group
        let btnGroup = [];
        if (this.placementPhase === 'INITIAL_1') {
            // initial placement phase 1: only confirm button and undo (no cancel)
            btnGroup = this.createBtnGroup(0b101);
        } else {
            // normal settlement building: confirm, cancel, undo
            btnGroup = this.createBtnGroup(0b111);
        }
        for (let btn of btnGroup) {
            this.interactionLayer.appendChild(btn);
        }
        this.setMode('BUILD_SETTLEMENT');
    }



    handleVertexClick(event) {
        console.log("Vertex clicked:", event.target.dataset.id);
        if (this.currentMode !== 'BUILD_SETTLEMENT' && this.currentMode !== 'BUILD_CITY' && this.currentMode !== 'INITIAL_PLACEMENT') {
            console.warn("Ignoring vertex click, current mode:", this.currentMode);
            return; // ignore if not in build settlement mode
        }

        const settlementId = event.target.dataset.id;

        // add class to indicate selection
        if (event.target.classList.contains("placed-settlement")) {
            console.warn("Settlement already placed at:", settlementId);
            return;
        }

        // placed settlements
        // add to building predictor
        if (!this.buildingPredictor.build("SETTLEMENT", settlementId)) {
            console.error("Failed to add settlement to building predictor at:", settlementId);
        }

        // get the next valid spots
        const res = this.buildingPredictor.getNextValidSpots();
        if (res.status !== StatusCodes.SUCCESS) {
            console.error("Failed to get next valid spots after settlement placement:", res);
            return;
        }

        this.clearInteractionLayer();
        if (res.result === null) {
            // all buildings placed, wait for confirm
            console.log("All settlements placed, waiting for confirm.");
            // stop here, skip redraw valid spots
            this._drawFromBuildingPredictor(this.buildingPredictor, false, true);
        } else {
            // redraw interaction layer with new valid spots and placed buildings
            this._drawFromBuildingPredictor(this.buildingPredictor, false, false);
        }

        switch (this.currentMode) {
            case 'INITIAL_PLACEMENT': // initial placement mode, only confirm and undo buttons
                const btnGroup = this.createBtnGroup(0b101); // confirm and undo only, no cancel during initial placement
                for (let btn of btnGroup) {
                    this.interactionLayer.appendChild(btn);
                }
                // check btn state
                // if all buildings placed, enable confirm button
                if (res.result === null) {
                    document.getElementById(this.elementIds.interactionBtnConfirm).classList.remove('svg-btn-disabled');
                } else {
                    document.getElementById(this.elementIds.interactionBtnConfirm).classList.add('svg-btn-disabled');
                }
                break;
            case 'BUILD_SETTLEMENT':
            case 'BUILD_CITY': // normal settlement/city building mode, confirm, cancel, undo buttons
                const btnGroup2 = this.createBtnGroup(0b111); // confirm, cancel, undo
                for (let btn of btnGroup2) {
                    this.interactionLayer.appendChild(btn);
                }
                break;
            default:
                console.error("Unknown mode after settlement placement:", this.currentMode);
        }
    }


    /*----------------------------------------------------------------Road Building Mode----------------------------------------------------------------*/
    clearRoadBuildingContext() {
        this.clickedEdge = [];
        this.buildingPredictor.clear();
        this.numberOfRoads = 0;
        this.gameMap = null;
        this.playerColor = null;
        this.playerId = null;
    }

    /**
     * Set up parameters/context for road building mode
     * e.g. Player x (with color c (optional)) wants to build n roads in this gameMap
     * @param {integer} numberOfRoads 
     * @param {GameMap} gameMap - the current game map object
     * @param {string} playerColor - optional color for the player's roads default to 'rgba(0,255,0,0.5)'
     */
    setRoadBuildingContext(playerId, numberOfRoads, gameMap, playerColor = 'rgba(0,255,0,0.5)') {
        this.clickedEdge = []; // reset clicked edges
        this.buildingPredictor.init(gameMap, playerId, "ROAD_ONLY");
        this.numberOfRoads = numberOfRoads;
        this.gameMap = gameMap;
        this.playerColor = playerColor;
        this.playerId = playerId;
    }

    activateRoadBuildingInteractionLayer(playerId, numberOfRoads, gameMap, playerColor) {
        if (!this.interactionLayer) {
            console.error("Interaction layer not found!");
            return;
        }

        // clear existing layer
        this.clearInteractionLayer();
        this.clearRoadBuildingContext();
        this.setRoadBuildingContext(playerId, numberOfRoads, gameMap, playerColor); // example setup
        // show all valid road spots for the player
        const res = this.buildingPredictor.getNextValidSpots();
        if (res.status !== StatusCodes.SUCCESS) {
            console.error("Failed to get valid road spots:", res);
            return;
        }
        const validRoadSpots = res.result;
        //console.log("Valid road spots for player", playerId, ":", validRoadSpots);
        this._drawFromBuildingPredictor(this.buildingPredictor);
        const btnGroup = this.createBtnGroup(0b111);

        for (let btn of btnGroup) {
            this.interactionLayer.appendChild(btn);
        }
        this.setMode('BUILD_ROAD');
    }


    handleEdgeClick(event) {
        if (this.currentMode !== 'BUILD_ROAD' && this.currentMode !== 'INITIAL_PLACEMENT') {
            return; // ignore if not in build road mode
        }

        const roadId = event.target.dataset.id;

        // add class to indicate selection
        if (event.target.classList.contains("placed-road")) {
            console.warn("Road already placed at:", roadId);
            return;
        }

        // placed roads
        // add to building predictor
        if (!this.buildingPredictor.build("ROAD", roadId)) {
            console.error("Failed to add road to building predictor at:", roadId);
        }

        // get the next valid spots
        const res = this.buildingPredictor.getNextValidSpots();
        if (res.status !== StatusCodes.SUCCESS) {
            console.error("Failed to get next valid spots after road placement:", res);
            return;
        }

        this.clearInteractionLayer();
        if (res.result === null) {
            // all buildings placed, wait for confirm
            console.log("All settlements placed, waiting for confirm.");
            // stop here, skip redraw valid spots
            this._drawFromBuildingPredictor(this.buildingPredictor, false, true);
        } else {
            // redraw interaction layer with new valid spots and placed buildings
            this._drawFromBuildingPredictor(this.buildingPredictor, false, false);
        }

        switch (this.currentMode) {
            case 'INITIAL_PLACEMENT': // initial placement mode, only confirm and undo buttons
                const btnGroup = this.createBtnGroup(0b101); // confirm and undo only, no cancel during initial placement
                for (let btn of btnGroup) {
                    this.interactionLayer.appendChild(btn);
                }
                // check btn state
                // if all buildings placed, enable confirm button
                if (res.result === null) {
                    document.getElementById(this.elementIds.interactionBtnConfirm).classList.remove('svg-btn-disabled');
                } else {
                    document.getElementById(this.elementIds.interactionBtnConfirm).classList.add('svg-btn-disabled');
                }
                break;
            case 'BUILD_SETTLEMENT':
            case 'BUILD_CITY': // normal settlement/city building mode, confirm, cancel, undo buttons
                const btnGroup2 = this.createBtnGroup(0b111); // confirm, cancel, undo
                for (let btn of btnGroup2) {
                    this.interactionLayer.appendChild(btn);
                }
                break;
            default:
                console.error("Unknown mode after settlement placement:", this.currentMode);
        }

    }

    /*---------------------------------------------------------------Button Handlers----------------------------------------------------------------*/
    handleUndoBtnClick() {
        switch (this.currentMode) {
            case "INITIAL_PLACEMENT":
                // remove last selected building
                if (!this.buildingPredictor.rollback()) {
                    console.warn("No more buildings to undo in initial placement.");
                    return;
                }
                // reompuate valid spots
                const res = this.buildingPredictor.getNextValidSpots();
                if (res.status !== StatusCodes.SUCCESS) {
                    console.error("Failed to get next valid spots after undo:", res);
                    return;
                }
                // redraw interaction layer
                this.clearInteractionLayer();
                this._drawFromBuildingPredictor(this.buildingPredictor);

                // recreate button group
                const btnGroup = this.createBtnGroup(0b101);
                for (let btn of btnGroup) {
                    this.interactionLayer.appendChild(btn);
                }
                // check btn state
                if (res.result === null) {
                    document.getElementById(this.elementIds.interactionBtnConfirm).classList.remove('svg-btn-disabled');
                } else {
                    document.getElementById(this.elementIds.interactionBtnConfirm).classList.add('svg-btn-disabled');
                }
                break;
            case 'BUILD_ROAD':
                // remove last selected road
                if (this.clickedEdge.length > 0) {
                    this.clickedEdge.pop();
                    const res = this.buildingPredictor.rollbackLastRoad();
                    if (res.status !== StatusCodes.SUCCESS) {
                        console.error("Failed to rollback last road:", res);
                        return;
                    }
                    const validRoadSpots = res.result;

                    // redraw interaction layer
                    this.clearInteractionLayer();
                    this._drawFromBuildingPredictor(this.buildingPredictor);
                    const btnGroup = this.createBtnGroup(0b111);
                    for (let btn of btnGroup) {
                        this.interactionLayer.appendChild(btn);
                    }
                }
                break;
            case 'BUILD_SETTLEMENT':



            default:
                console.warn("Undo button clicked in unknown mode:", this.currentMode);
        }
    }

    handleCancelBtnClick() {
        switch (this.currentMode) {
            case 'BUILD_ROAD':
                // clear interaction layer
                this.clearRoadBuildingContext();
                this.clearInteractionLayer();
                break;
            default:
                console.warn("Cancel button clicked in unknown mode:", this.currentMode);
        }
    }

    handleConfirmBtnClick() {
        switch (this.currentMode) {
            case 'INITIAL_PLACEMENT':
                const buildStack = structuredClone(this.buildingPredictor.buildStack); // deep clone to avoid mutation after clear

                // clear interaction layer no matter success or fail at the server side
                // do this first to avoid async call so it clear after server response
                this.clearInitialPlacementContext();
                this.clearInteractionLayer();

                // submit the selected buildings to server/controller
                this.gameClient.submitInitialPlacement(buildStack);
                break;
            case 'DISCARD':
                // gather selected resources from modal
                const modalBody = document.querySelector('#resource-selection-modal-overlay #modal-body');
                const selectedCards = modalBody.querySelectorAll('.card-selected');
                const resourcesToDiscard = {};
                selectedCards.forEach(cardDiv => {
                    const type = cardDiv.dataset.type;
                    if (!resourcesToDiscard[type]) {
                        resourcesToDiscard[type] = 0;
                    }
                    resourcesToDiscard[type] += 1;
                });

                // remove the modal
                const modalOverlay = document.getElementById('resource-selection-modal-overlay');
                if (modalOverlay) {
                    modalOverlay.remove();
                } else {
                    console.warn("Resource selection modal overlay not found during discard confirm.");
                }

                // submit discard event to client
                this.gameClient.submitDiscardResources(resourcesToDiscard);
                break;

            case 'BUILD_ROAD':
                // submit the selected roads to server/controller
                this.controller.inputEvent({ type: 'BUILD_ROAD', playerId: this.playerId, roadCoords: this.clickedEdge });
                // clear interaction layer
                this.clearRoadBuildingContext();
                this.clearInteractionLayer();
                break;
            case 'BUILD_SETTLEMENT':
                // submit the selected settlement to server/controller
                this.controller.inputEvent({ type: 'BUILD_SETTLEMENT', vertexCoord: this.clickedVertex[0] });
                break;
            
            default:
                console.warn("Confirm button clicked in unknown mode:", this.currentMode);
        }
    }


    /*---------------------------------------------------------------Robber Mode----------------------------------------------------------------*/

    activateDiscardInteractionLayer(playerId, currentResources, numberToDiscard) {
        this.setMode('DISCARD');
        this.activateResourcesSelectionMode(
            currentResources,
            numberToDiscard,
            playerId ? `Player ${playerId} Select Resources to Discard` : `Select Resources to Discard`,
        );
    }


    /**
     * Let the player select cards to discard
     * @param {Object} resources resource type to count
     * @param {*} numToSelect number of cards to select
     * @param {*} msg message to display in modal title
     * @param {*} confirmEventName event name to emit when selection is confirmed
     */
    activateResourcesSelectionMode(resources, numToSelect, msg) {
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
        this._renderResourceCards(resources, modalBody, (clickedType, cardDiv) => {
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
        confirmBtn.onclick = this.handleConfirmBtnClick.bind(this);

        // append to main wrapper
        document.getElementById('main-wrapper').appendChild(clone);
    }


    /**
     * Generic helper to render resources into ANY container.
     * @param {Object} resources player object
     * @param {*} container the target container to render into
     * @param {*} onCardClick callback when a card is clicked (optional)
     */
    _renderResourceCards(resources, container, onCardClick = null) {
        container.innerHTML = ''; // clear existing content

        // resource resources
        for (const [type, amount] of Object.entries(resources)) {
            for (let i = 0; i < amount; i++) {
                const cardHtml = HtmlUtils.createResourceCardHtml(type);
                const cardDiv = cardHtml.querySelector('.card-container');
                if (onCardClick) {
                    cardDiv.onclick = () => onCardClick(type, cardDiv);
                }
                container.appendChild(cardHtml);
            }
        }
    }



    handleTileClick(tCoord) {
        if (this.currentMode !== 'ROBBER') {
            return; // ignore if not in robber mode
        }
        this.clickedTile.push(tCoord);
    }

















}