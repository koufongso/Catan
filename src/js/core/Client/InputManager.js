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
import { GameRules } from "../../logic/GameRules.js";
import { HtmlUtils } from "../../utils/HtmlUtils.js";;
import { HexUtils } from "../../utils/HexUtils.js";
import { BuildingPredictor } from "../../utils/BuildingPredictor.js";

import { StatusCodes } from "../../constants/StatusCodes.js";
import { DEV_CARD_TYPES } from "../../constants/DevCardTypes.js";

export class InputManager {
    constructor(gameClient) {
        this.gameClient = gameClient; // reference to the parent GameClient
        this.playerId = null; // the id of the player using this input manager
        this.gameMap = null; // a snapshot of the game map before input begins
        this.interactionLayer = null; // the interaction layer DOM element

        this.buildingPredictor = new BuildingPredictor(); // a helper class to predict building placements (before submit to server)

        this.currentMode = 'IDLE'; // IDLE, INITIAL_PLACEMENT, BUILD_ROAD, BUILD_SETTLEMENT, BUILD_CITY, TRADE, DISCARD, ROBBER, etc.
        this.validMode = ['IDLE', 'INITIAL_PLACEMENT', 'BUILD_ROAD', 'BUILD_SETTLEMENT', 'BUILD_CITY', 'TRADE', 'DISCARD', 'ROBBER'];

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

            // overlay modal ids
            overlayContainer: 'overlay-container',
        }

        // button onclick handlers
        this.onclickHandler = {
            btnRoll: (event) => {
                this.gameClient.btnRollOnClick(event);
            },
            btnEndTurn: (event) => {
                this.gameClient.btnEndTurnOnClick(event);
            },
            btnBuildRoad: (event) => {
                this.gameClient.btnBuildRoadOnClick(event);
            },
            btnBuildSettlement: (event) => {
                this.gameClient.btnBuildSettlementOnClick(event);
            },
            btnBuildCity: (event) => {
                this.gameClient.btnBuildCityOnClick(event);
            },
            btnBuyDevCard: (event) => {
                this.gameClient.btnBuyDevCardOnClick(event);
            }
        }

        this.interactionElementRegister = []; // keep track of all dynamically created elements and their handlers for easier cleanup when switching modes


    }

    initalize() {// bind all interactable elements
        this._bindInteractionLayer();
        this._bindBtnHandlers();
        this._bindDevCardHandlers();
    }

    _bindInteractionLayer() {
        console.log("Binding interaction layer:", this.elementIds.interactionLayer);
        this.interactionLayer = document.getElementById(this.elementIds.interactionLayer);
        if (!this.interactionLayer) {
            throw new Error("Interaction layer not found!");
        }
    }

    _bindBtnHandlers() {
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

    _bindDevCardHandlers() {
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
            const cardContainer = event.target.closest('.card-container');
            if (cardContainer) {
                const cardType = cardContainer.dataset.type;
                if (cardType) {
                    this.gameClient.handleActivateDevCard(cardType);
                }
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

    _clearInteractionLayer() {
        console.warn("Clearing interaction layer.");
        HtmlUtils.clearElementById(this.elementIds.interactionLayer);
        HtmlUtils.clearElementById(this.elementIds.overlayContainer);
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
                this._handleConfirmBtnClick.bind(this)();
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
                this._handleCancelBtnClick.bind(this)();
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
                this._handleUndoBtnClick.bind(this)();
            });
            undoBtn.id = this.elementIds.interactionBtnUndo;
            undoBtn.classList.add('svg-btn-undo');
            btnGroup.push(undoBtn);
            x += width + spacing;
            y = y0;
        }
        return btnGroup;
    }

    _enableConfirmBtn() {
        const confirmBtn = document.getElementById(this.elementIds.interactionBtnConfirm);
        if (confirmBtn) {
            confirmBtn.classList.remove('svg-btn-disabled');
        } else {
            console.warn("Confirm button not found during tile selection in robber placement.");
        }
        return;
    }

    _disableConfirmBtn() {
        const confirmBtn = document.getElementById(this.elementIds.interactionBtnConfirm);
        if (confirmBtn) {
            confirmBtn.classList.add('svg-btn-disabled');
        } else {
            console.warn("Confirm button not found during tile selection in robber placement.");
        }
        return;
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

        // console.log("Drawing from BuildingPredictor with context:", {
        //     buildingType,
        //     validBuildingSpots,
        //     placedBuildings
        // });
        // clear interaction layer
        this._clearInteractionLayer();
        // console.log("Start drawing interaction layer from BuildingPredictor.");

        // redraw valid spots
        // settlement
        if (!skipValidSpots && buildingType === 'SETTLEMENT' && validBuildingSpots.size > 0) {
            const validSettlementCoords = Array.from(validBuildingSpots).map(id => HexUtils.idToCoord(id));
            const settlementPlacementGroup = HtmlUtils.createSettlementPlacementGroup(validSettlementCoords, this._handleVertexClick.bind(this), { color: this.playerColor }, ["available-settlement"], HEX_SIZE);
            settlementPlacementGroup.classList.add('valid-settlement-group');
            this.interactionLayer.appendChild(settlementPlacementGroup);
        }

        // city
        if (!skipValidSpots && buildingType === 'CITY' && validBuildingSpots.size > 0) {
            const validSettlementCoords = Array.from(validBuildingSpots).map(id => HexUtils.idToCoord(id));
            const settlementPlacementGroup = HtmlUtils.createSettlementPlacementGroup(validSettlementCoords, this._handleVertexClick.bind(this), { color: this.playerColor }, ["available-city"], HEX_SIZE);
            settlementPlacementGroup.classList.add('valid-settlement-group');
            this.interactionLayer.appendChild(settlementPlacementGroup);
        }

        // road
        if (!skipValidSpots && buildingType === 'ROAD' && validBuildingSpots.size > 0) {
            const validRoadCoords = Array.from(validBuildingSpots).map(id => HexUtils.idToCoord(id));
            const roadPlacementGroup = HtmlUtils.createRoadPlacementGroup(validRoadCoords, this._handleEdgeClick.bind(this), { color: this.playerColor }, ["available-road"], HEX_SIZE);
            this.interactionLayer.appendChild(roadPlacementGroup);
        }

        // redraw placed buildings
        if (!skipPlacedBuildings) {
            for (let building of placedBuildings) {
                switch (building.type) {
                    case 'SETTLEMENT':
                        const settlementElement = HtmlUtils.createSettlementElement(building.coord, { color: this.playerColor }, ["placed-settlement"], HEX_SIZE);
                        this.interactionLayer.appendChild(settlementElement);
                        break;
                    case 'CITY':
                        const cityElement = HtmlUtils.createSettlementElement(building.coord, { color: this.playerColor }, ["placed-city"], HEX_SIZE, 12);
                        this.interactionLayer.appendChild(cityElement);
                        break;
                    case 'ROAD':
                        const roadElement = HtmlUtils.createRoadElement(building.coord, { color: this.playerColor }, ["placed-road"], HEX_SIZE);
                        this.interactionLayer.appendChild(roadElement);
                        break;
                    default:
                        console.warn("Unknown building type in building stack:", building.type);
                }
            }
        }
        return;
    }

    /*----------------------------------------------------------------Initial Placement Mode----------------------------------------------------------------*/
    _clearInitialPlacementContext() {
        this.gameMap = null;
        this.playerColor = null;
        this.playerId = null;
        this.buildingPredictor.clear();
    }

    _setInitialPlacementContext(playerId, gameMap, playerColor) {
        this.gameMap = gameMap;
        this.playerColor = playerColor;
        this.playerId = playerId;
        this.buildingPredictor.init(gameMap, playerId, "INITIAL_PLACEMENT");
    }


    activateInitialPlacementMode(playerId, gameMap, playerColor) {
        this.setMode('INITIAL_PLACEMENT');
        console.log("Activating initial placement interaction layer for player:", playerId);

        if (!this.interactionLayer) {
            console.error("Interaction layer not found!");
            return;
        }

        // clear/reset interaction layer
        this._clearInteractionLayer();
        this._clearInitialPlacementContext();
        this._setInitialPlacementContext(playerId, gameMap, playerColor);

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
        this._disableConfirmBtn(); // disable confirm button until player makes a valid selection

        // check btn state
        if (res.result === null) {
            this._enableConfirmBtn();
        }
    }



    /*---------------------------------------------------------------- Building Mode----------------------------------------------------------------*/
    _clearBuildingContext() {
        this.buildingPredictor.clear();
        this.gameMap = null;
        this.playerColor = null;
        this.playerId = null;
    }

    /**
     * Set up parameters/context for building mode
     * e.g. Player x (with color c (optional)) wants to build n roads in this gameMap
     * @param {integer} numberOfRoads 
     * @param {GameMap} gameMap - the current game map object
     * @param {string} playerColor - optional color for the player's roads default to 'rgba(0,255,0,0.5)'
     */
    _setBuildingContext(playerId, gameMap, playerColor = 'rgba(0,255,0,0.5)', mode) {
        let predictorMode = null;
        let maxRoads = 0;
        let maxSettlements = 0;
        let maxCities = 0;
        switch (mode) {
            case 'DEV_CARD_ROAD_BUILDING':
                maxRoads = 2;
                predictorMode = "ROAD_ONLY";
                break;
            case 'BUILD_ROAD':
                maxRoads = 1000; // set a high value (effectly unlimited)
                predictorMode = "ROAD_ONLY";
                break;
            case 'BUILD_SETTLEMENT':
                maxSettlements = 1000; // set a high value (effectly unlimited)
                predictorMode = "SETTLEMENT_ONLY";
                break;
            case 'BUILD_CITY':
                maxCities = 1000; // set a high value (effectly unlimited)
                predictorMode = "CITY_ONLY";
                break;
            default:
                throw new Error("Invalid building mode for setting building context:", mode);
        }
        this.buildingPredictor.init(gameMap, playerId, predictorMode, maxRoads, maxSettlements, maxCities);
        this.gameMap = gameMap;
        this.playerColor = playerColor;
        this.playerId = playerId;
    }

    activateBuildingMode(playerId, gameMap, playerColor, mode) {
        if (!this.interactionLayer) {
            console.error("Interaction layer not found!");
            return;
        }
        const validModes = ['BUILD_ROAD', 'BUILD_SETTLEMENT', 'BUILD_CITY', 'DEV_CARD_ROAD_BUILDING'];
        if (!validModes.includes(mode)) {
            console.error("Invalid building mode:", mode);
            return;
        }

        this.setMode(mode);
        // clear existing layer
        this._clearInteractionLayer();
        this._clearBuildingContext();
        this._setBuildingContext(playerId, gameMap, playerColor, mode); // example setup

        // show all valid road spots for the player
        const res = this.buildingPredictor.getNextValidSpots();
        if (res.status !== StatusCodes.SUCCESS) {
            console.error("Failed to get valid road spots:", res);
            return;
        }

        // draw all elements from building predictor
        this._drawFromBuildingPredictor(this.buildingPredictor);

        const btnGroup = this.createBtnGroup(0b111);

        for (let btn of btnGroup) {
            this.interactionLayer.appendChild(btn);
        }

        this._disableConfirmBtn(); // disable confirm button until player makes a valid selection
    }




    /*---------------------------------------------------------------Button Handlers----------------------------------------------------------------*/
    _handleUndoBtnClick() {
        let res = null;
        let btnGroup = null;
        switch (this.currentMode) {
            case "INITIAL_PLACEMENT":
                // remove last selected building
                if (!this.buildingPredictor.rollback()) {
                    console.warn("No more buildings to undo in initial placement.");
                    return;
                }
                // recompute valid spots
                res = this.buildingPredictor.getNextValidSpots();
                if (res.status !== StatusCodes.SUCCESS) {
                    console.error("Failed to get next valid spots after undo:", res);
                    return;
                }
                // redraw interaction layer
                this._clearInteractionLayer();
                this._drawFromBuildingPredictor(this.buildingPredictor);

                // recreate button group
                btnGroup = this.createBtnGroup(0b101);
                for (let btn of btnGroup) {
                    this.interactionLayer.appendChild(btn);
                }

                this._disableConfirmBtn();
                // check btn state
                if (res.result === null) {
                    this._enableConfirmBtn();
                }
                break;
            case 'DEV_CARD_ROAD_BUILDING':
            case 'BUILD_ROAD':
            case 'BUILD_SETTLEMENT':
            case 'BUILD_CITY':
                // remove last selected building
                if (!this.buildingPredictor.rollback()) {
                    console.warn("No more buildings to undo in initial placement.");
                    return;
                }
                // recompute valid spots
                res = this.buildingPredictor.getNextValidSpots();
                if (res.status !== StatusCodes.SUCCESS) {
                    console.error("Failed to get next valid spots after undo:", res);
                    return;
                }
                // redraw interaction layer
                this._clearInteractionLayer();
                this._drawFromBuildingPredictor(this.buildingPredictor);

                // recreate button group
                btnGroup = this.createBtnGroup(0b111);
                for (let btn of btnGroup) {
                    this.interactionLayer.appendChild(btn);
                }
                this._disableConfirmBtn(); // disable confirm button until player makes a new selection after undo

                break;
            case 'ROBBER_PLACEMENT':
            case 'ACTIVATE_DEV_CARD_KNIGHT':
                if (this.robStack.length === 2) {
                    // back to select settlement for robbing
                    this.robStack.pop();
                    // removed all robber settlement masks
                    const maskedSettlements = document.querySelectorAll('.robber-settlement-mask');
                    maskedSettlements.forEach(elem => {
                        elem.classList.remove('robber-settlement-mask');
                        elem.classList.add('robbable-settlement');
                    });
                } else if (this.robStack.length === 1) {
                    // back to select tile for robber placement
                    this.robStack.pop();
                    // remove all settlement masks and add back robbable tile masks
                    const allrobbableSettlement = document.querySelectorAll('.robbable-settlement');
                    allrobbableSettlement.forEach(elem => {
                        elem.remove();
                    });

                    // removed all robber tile masks                    
                    const maskedSettlements = document.querySelectorAll('.robber-tile-mask');
                    maskedSettlements.forEach(elem => {
                        elem.classList.remove('robber-tile-mask');
                        elem.classList.add('robbable-tile');
                    });

                } else {
                    console.warn("No more selections to undo in robber placement mode.");
                }

                // disable confirm button until player selects a settlement to rob again
                this._disableConfirmBtn();

                break;
            default:
                console.warn("Undo button clicked in unknown mode:", this.currentMode);
        }
    }

    _handleCancelBtnClick() {
        switch (this.currentMode) {
            case 'DEV_CARD_ROAD_BUILDING':
            case 'BUILD_ROAD':
            case 'BUILD_SETTLEMENT':
            case 'BUILD_CITY':
            case 'ROBBER_PLACEMENT':
            case 'ACTIVATE_DEV_CARD_KNIGHT':
            case 'ACTIVATE_DEV_CARD_YOP':
                // clear interaction layer
                this._clearBuildingContext();
                this._clearInteractionLayer();
                break;
            default:
                console.warn("Cancel button clicked in unknown mode:", this.currentMode);
        }
    }

    _handleConfirmBtnClick() {
        switch (this.currentMode) {
            case 'INITIAL_PLACEMENT':
                const buildStack = structuredClone(this.buildingPredictor.buildStack); // deep clone to avoid mutation after clear

                // clear interaction layer no matter success or fail at the server side
                // do this first to avoid async call so it clear after server response
                this._clearInitialPlacementContext();
                this._clearInteractionLayer();

                // submit the selected buildings to server/controller
                this.gameClient.submitInitialPlacement(buildStack);
                break;
            case 'DISCARD':
                // gather selected resources from modal
                const resourcesToDiscard = this._getSelectedResourcesFromModal();
                this._clearInteractionLayer();
                // submit discard event to client
                this.gameClient.submitDiscardResources(resourcesToDiscard);
                break;
            case 'ACTIVATE_DEV_CARD_YOP':
                // gather selected resources from modal
                const selectedResources = this._getSelectedResourcesFromModal();
                this._clearInteractionLayer();
                this.gameClient.submitActivateDevCard(DEV_CARD_TYPES.YEAR_OF_PLENTY, { selectedResources });
                break;
            case 'DEV_CARD_ROAD_BUILDING':
                var buildStackCopy = structuredClone(this.buildingPredictor.buildStack); // deep clone to avoid mutation after clear
                // clear before submit to avoid async issue where player can continue to modify the build stack after clicking confirm but before server response
                this._clearBuildingContext();
                this._clearInteractionLayer();
                this.gameClient.submitActivateDevCard(DEV_CARD_TYPES.ROAD_BUILDING, { buildStack: buildStackCopy });
                break;
            case 'BUILD_ROAD':
            case 'BUILD_SETTLEMENT':
            case 'BUILD_CITY':
                var buildStackCopy = structuredClone(this.buildingPredictor.buildStack); // deep clone to avoid mutation after clear
                // clear before submit to avoid async issue where player can continue to modify the build stack after clicking confirm but before server response
                this._clearBuildingContext();
                this._clearInteractionLayer();
                // submit the selected roads to server/controller
                this.gameClient.submitBuild(buildStackCopy, this.currentMode);
                break;
            case 'ROBBER_PLACEMENT':
                var robStackCopy = structuredClone(this.robStack); // deep clone to avoid mutation after clear
                this._clearRobberPlacementContext();
                this._clearInteractionLayer();
                this.gameClient.submitRobberPlacement(robStackCopy, 'ROBBER_PLACEMENT');
                break;
            case 'ACTIVATE_DEV_CARD_KNIGHT':
                var robStackCopy = structuredClone(this.robStack); // deep clone to avoid mutation after clear
                this._clearRobberPlacementContext();
                this._clearInteractionLayer();
                this.gameClient.submitActivateDevCard(DEV_CARD_TYPES.KNIGHT, { robStack: robStackCopy });
                break;

            default:
                console.warn("Confirm button clicked in unknown mode:", this.currentMode);
        }
    }

    _getSelectedResourcesFromModal() {
        const modalBody = document.querySelector('#resource-selection-modal-overlay #modal-body');
        const selectedCards = modalBody.querySelectorAll('.card-selected');
        const selectedResources = {};
        selectedCards.forEach(cardDiv => {
            const type = cardDiv.dataset.type;
            if (!selectedResources[type]) {
                selectedResources[type] = 0;
            }
            selectedResources[type] += 1;
        });
        return selectedResources;
    }


    /*---------------------------------------------------------------Robber Mode----------------------------------------------------------------*/

    activateDiscardMode(playerId, currentResources, numberToDiscard) {
        this.setMode('DISCARD');
        this._activateResourcesSelectionMode(
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
    _activateResourcesSelectionMode(resources, numToSelect, msg, allowCancel = false) {
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

        // add cancel button if allowed
        if (allowCancel) {
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.classList.add('btn-cancel');
            cancelBtn.onclick = this._handleCancelBtnClick.bind(this);
            btns.appendChild(cancelBtn);
        }

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
        confirmBtn.onclick = this._handleConfirmBtnClick.bind(this);

        const overlayContainer = document.getElementById(this.elementIds.overlayContainer);
        overlayContainer.appendChild(overlay);
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


    _clearRobberPlacementContext() {
        this.gameMap = null;
        this.playerId = null;
        this.robbableTiles = null;
        this.robStack = [];
    }

    _setRobberPlacementContext(playerId, gameMap) {
        this.playerId = playerId;
        this.gameMap = gameMap;
        this.playerId = playerId;
        this.robbableTiles = GameRules.getRobbableTiles(gameMap);
        this.robStack = []; // use a simple stack to keep track of the current highlighted tile and player (if any)
        this.robbableSettlementIds = []; // keep track of the currently highlighted robbable settlements for easy cleanup when user change tile selection
    }

    /**
     * Activate the interaction layer for robber placement mode, which includes two phases:
     * 1. Select a tile to move the robber to (highlight the valid tiles and add click handlers)
     * 2. If there are players to rob on that tile, select a player to rob (highlight the robbable players and add click handlers)
     * @param {*} playerId 
     * @param {*} gameMap 
     * @param {*} mode 'ROBBER_PLACEMENT' or 'ACTIVATE_DEV_CARD_KNIGHT'
     * @param {*} allowCancel 
     */
    activateRobberPlacementMode(playerId, gameMap, mode, allowCancel = false) {
        this._setRobberPlacementContext(playerId, gameMap); // set up context first (robbable tiles, etc.)
        this.setMode(mode);

        // phase 1: click on a tile to move the robber there, highlight the robbable players on that tile (if any)
        // group for easier cleanup later
        this.robTileSelectionGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.robTileSelectionGroup.id = 'rob-tile-selection-group';
        this.interactionLayer.appendChild(this.robTileSelectionGroup);

        // create "virtual" hitboxes over the valid tiles and add event listeners
        this.robbableTiles.forEach(tile => {
            const hCoord = tile.coord;
            const tileId = HexUtils.coordToId(hCoord);
            const hexHitbox = HtmlUtils.createSvgPolygon(hCoord, ['robbable-tile'], tileId, HEX_SIZE);
            hexHitbox.dataset.tileId = tileId;
            this.robTileSelectionGroup.appendChild(hexHitbox);
        });

        this.robTileSelectionGroup.onclick = this._handleTileClick.bind(this);

        // create button group for confirm and undo (no cancel during robber placement)
        let btnGroup = [];
        if (allowCancel) {
            btnGroup = this.createBtnGroup(0b111);
        } else {
            btnGroup = this.createBtnGroup(0b101);
        }

        for (let btn of btnGroup) {
            this.interactionLayer.appendChild(btn);
        }

        this._disableConfirmBtn();
    }


    _highlightRobbablePlayers(tileId) {
        // get the players that can be robbed on this tile
        this.robSettlementSelectionGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.robSettlementSelectionGroup.id = 'rob-settlement-selection-group';
        this.interactionLayer.appendChild(this.robSettlementSelectionGroup);

        this.robbableSettlementIds.forEach(settlementId => {
            const settlementCoord = HexUtils.idToCoord(settlementId);
            const [x, y] = HexUtils.vertexToPixel(settlementCoord, HEX_SIZE);

            const robableCircle = HtmlUtils.createSvgCircle(x, y, 20, ["robbable-settlement"], null);
            robableCircle.dataset.id = settlementId; // use dataset to store the settlement id to avoid id conflict in setttlement layer
            this.robSettlementSelectionGroup.appendChild(robableCircle);
        });

        this.robSettlementSelectionGroup.onclick = this._handleVertexClick.bind(this);
    };




    /*---------------------------------------- basic element click handlers for building mode (road/settlement/city) -------------------------------------------------------*/
    _handleVertexClick(event) {
        console.log("Vertex clicked:", event.target.dataset.id);

        switch (this.currentMode) {
            case 'INITIAL_PLACEMENT':
            case 'BUILD_SETTLEMENT':
            case 'BUILD_CITY':
                this._handleVertexClickBuildSettlement(event);
                break;
            case 'ROBBER_PLACEMENT':
            case 'ACTIVATE_DEV_CARD_KNIGHT':
                this._handleVertexClickRob(event);
                break;
            default:
                return; // ignore if not in settlement building mode
        }
    }

    _handleVertexClickRob(event) {
        if (this.robStack.length === 2) {
            return; // already selected a vertex for robbing, ignore further clicks
        }
        const vertexId = event.target.dataset.id;
        this.robStack.push({ type: 'SETTLEMENT', id: vertexId });

        // highlight the selected vertex
        event.target.classList.add('robber-settlement-mask');

        // enable confirm button if we have selected a settlement to rob
        if (this.robStack.length === 2) {
            this._enableConfirmBtn();
        } else {
            // otherwise, wait for player to select a settlement to rob before enabling confirm button
            console.error("Unexpected state: wrong number of selected elements for robbing:", this.robStack);
            this._disableConfirmBtn();
        }

    }

    _handleVertexClickBuildSettlement(event) {
        const settlementId = event.target.dataset.id;
        // add class to indicate selection
        if (event.target.classList.contains("placed-settlement")) {
            console.warn("Settlement already placed at:", settlementId);
            return;
        }

        // placed settlements
        // add to building predictor
        switch (this.currentMode) {
            case 'INITIAL_PLACEMENT':
            case 'BUILD_SETTLEMENT':
                if (!this.buildingPredictor.build("SETTLEMENT", settlementId)) {
                    console.error("Failed to add settlement to building predictor at:", settlementId);
                }
                break;
            case 'BUILD_CITY':
                if (!this.buildingPredictor.build("CITY", settlementId)) {
                    console.error("Failed to add city to building predictor at:", settlementId);
                }
                break;
            default:
                console.error("Unknown mode during vertex click settlement building:", this.currentMode);
        }

        // get the next valid spots
        const res = this.buildingPredictor.getNextValidSpots();
        if (res.status !== StatusCodes.SUCCESS) {
            console.error("Failed to get next valid spots after settlement placement:", res);
            return;
        }

        this._clearInteractionLayer();
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
                this._disableConfirmBtn();
                // check btn state
                // if all buildings placed, enable confirm button
                if (res.result === null) {
                    this._enableConfirmBtn();
                }
                break;
            case 'BUILD_SETTLEMENT':
            case 'BUILD_CITY': // normal settlement/city building mode, confirm, cancel, undo buttons
                const btnGroup2 = this.createBtnGroup(0b111); // confirm, cancel, undo
                for (let btn of btnGroup2) {
                    this.interactionLayer.appendChild(btn);
                }
                this._enableConfirmBtn(); // enable confirm button in normal building mode after 1 valid click
                break;
            default:
                console.error("Unknown mode after settlement placement:", this.currentMode);
        }
    }


    _handleTileClick(event) {
        if (this.currentMode !== 'ROBBER_PLACEMENT' && this.currentMode !== 'ACTIVATE_DEV_CARD_KNIGHT') {
            return; // ignore if not in robber placement mode
        }

        if (this.robStack.length > 0) {
            // if there is already a selection, ignore further clicks until user undo the selection
            return;
        }

        // click a tile to move the robber
        const tileId = event.target.dataset.tileId;
        const tileCoord = HexUtils.idToCoord(tileId);
        console.log("Robber tile clicked:", tileId);

        this.robStack.push({ type: 'TILE', id: tileId }); // push the selected tile to the stack

        // highlight the selected tile (can be undone)
        event.target.classList.remove('robbable-tile');
        event.target.classList.add('robber-tile-mask');

        // highlight the robable player
        this.robbableSettlementIds = GameRules.getRobbableSettlementIds(this.playerId, tileId, this.gameMap);
        if (this.robbableSettlementIds.length === 0) {
            this._enableConfirmBtn(); // if no players to rob, enable confirm button immediately
        } else {
            this._disableConfirmBtn(); // otherwise, wait for player to select a settlement to rob before enabling confirm button
        }
        this._highlightRobbablePlayers(tileId);
    }


    _handleEdgeClick(event) {
        // ealry return if not in road building mode
        const validMode = ['BUILD_ROAD', 'BUILD_SETTLEMENT', 'BUILD_CITY', 'INITIAL_PLACEMENT', 'DEV_CARD_ROAD_BUILDING'];
        if (!validMode.includes(this.currentMode)) {
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
            console.warn("Failed to add road to building predictor at:", roadId);
        }

        // get the next valid spots
        const res = this.buildingPredictor.getNextValidSpots();
        if (res.status !== StatusCodes.SUCCESS) {
            console.warn("Failed to get next valid spots after road placement:", res);
            return;
        }

        this._clearInteractionLayer();
        if (res.result === null) {
            // all buildings placed, wait for confirm
            console.log("All buildings placed, waiting for confirm.");
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
                this._disableConfirmBtn();
                // check btn state
                // if all buildings placed, enable confirm button
                if (res.result === null) {
                    this._enableConfirmBtn();
                }
                break;
            case 'DEV_CARD_ROAD_BUILDING':
                const btnGroup3 = this.createBtnGroup(0b111); // confirm, cancel, undo
                for (let btn of btnGroup3) {
                    this.interactionLayer.appendChild(btn);
                }
                this._disableConfirmBtn(); // disable confirm button until player makes a valid selection
                if (res.result === null) {
                    this._enableConfirmBtn(); // click on road is already a valid selection, enable confirm button right away
                }
                break;
            case 'BUILD_ROAD':
            case 'BUILD_SETTLEMENT':
            case 'BUILD_CITY': // normal settlement/city building mode, confirm, cancel, undo buttons
                const btnGroup2 = this.createBtnGroup(0b111); // confirm, cancel, undo
                for (let btn of btnGroup2) {
                    this.interactionLayer.appendChild(btn);
                }
                this._enableConfirmBtn(); // click on road is already a valid selection, enable confirm button right away
                break;
            default:
                console.error("Unknown mode after settlement placement:", this.currentMode);
        }

    }

    /* ---------------------------------------- Year of Plenty Dev Card Resource Selection Mode ---------------------------------------*/
    activateYOPSelectionMode() {
        // reuse 
        this.setMode('ACTIVATE_DEV_CARD_YOP');
        const yopConfig = GameRules.getYearOfPlentyConfig();
        this._activateResourcesSelectionMode(yopConfig.RESOURCE_OPTIONS, yopConfig.NUMER_OF_RESOURCES_TO_SELECT, `Select ${yopConfig.NUMER_OF_RESOURCES_TO_SELECT} Resources for Year of Plenty`, true);
    }
}