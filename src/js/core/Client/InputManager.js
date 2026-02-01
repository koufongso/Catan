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
import { RoadBuildingPredictor } from "../../utils/road-building-predictor.js";
import { StatusCodes } from "../../constants/StatusCodes.js";
import { GameUtils } from "../../utils/game-utils.js";
import { HexUtils } from "../../utils/hex-utils.js";
import { BuildingPredictor } from "../../utils/building-predictor.js";


export class InputManager {
    constructor(gameClient) {
        this.gameClient = gameClient; // reference to the parent GameClient
        this.playerId = null; // the id of the player using this input manager
        this.gameMap = null; // a snapshot of the game map before input begins
        this.interactionLayerId = 'interaction-layer'; // the id of the interaction layer canvas
        this.interactionLayer = document.getElementById(this.interactionLayerId);

        this.buildingPredictor = new BuildingPredictor(); // a helper class to predict building placements (before submit to server)

        this.currentMode = 'IDLE'; // IDLE, INITIAL_PLACEMENT, BUILD_ROAD, BUILD_SETTLEMENT, BUILD_CITY, TRADE, DISCARD, ROBBER, etc.

        // btn id
        this.btnConfirmId = 'map-interaction-confirm-btn';
        this.btnCancelId = 'map-interaction-cancel-btn';
        this.btnUndoId = 'map-interaction-undo-btn';
    }

    getInteractionLayer() {
        return document.getElementById(this.interactionLayerId);
    }

    setMode(mode) {
        this.currentMode = mode;
    }

    clearInteractionLayer() {
        console.warn("Clearing interaction layer.");
        HtmlUtils.clearElementById(this.interactionLayerId);
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
            confirmBtn.id = this.btnConfirmId;
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
            cancelBtn.id = this.btnCancelId;
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
            undoBtn.id = this.btnUndoId;
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
    _drawFromBuildingPredictor(buildingPredictor) {
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
        if (buildingType === 'SETTLEMENT' && validBuildingSpots.size > 0) {
            const validSettlementCoords = Array.from(validBuildingSpots).map(id => HexUtils.idToCoord(id));
            const settlementPlacementGroup = HtmlUtils.createSettlementPlacementGroup(validSettlementCoords, this.handleVertexClick.bind(this), { color: this.playerColor }, ["available-settlement"], HEX_SIZE);
            settlementPlacementGroup.classList.add('valid-settlement-group');
            this.interactionLayer.appendChild(settlementPlacementGroup);
        }

        if (buildingType === 'ROAD' && validBuildingSpots.size > 0) {
            const validRoadCoords = Array.from(validBuildingSpots).map(id => HexUtils.idToCoord(id));
            const roadPlacementGroup = HtmlUtils.createRoadPlacementGroup(validRoadCoords, this.handleEdgeClick.bind(this), { color: this.playerColor }, ["available-road"], HEX_SIZE);
            this.interactionLayer.appendChild(roadPlacementGroup);
        }

        // redraw placed buildings
        for (let building of placedBuildings) {
            if (building.type === 'SETTLEMENT') {
                const settlementElement = HtmlUtils.createSettlementElement(building.coord, { color: this.playerColor }, ["placed-settlement"], HEX_SIZE);
                this.interactionLayer.appendChild(settlementElement);
            } else if (building.type === 'ROAD') {
                const roadElement = HtmlUtils.createRoadElement(building.coord, { color: this.playerColor }, ["placed-road"], HEX_SIZE);
                this.interactionLayer.appendChild(roadElement);
            }
        }
        console.log("Drew interaction layer from BuildingPredictor.");
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

        this.interactionLayer = this.getInteractionLayer();
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
            document.getElementById(this.btnConfirmId).classList.remove('svg-btn-disabled');
        } else {
            document.getElementById(this.btnConfirmId).classList.add('svg-btn-disabled');
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
        this.interactionLayer = this.getInteractionLayer();
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

        if (res.result === null) {
            // all buildings placed, wait for confirm
            console.log("All settlements placed, waiting for confirm.");
            return;
        }

        // redraw interaction layer with new valid spots and placed buildings
        this.clearInteractionLayer();
        this._drawFromBuildingPredictor(this.buildingPredictor);

        switch (this.currentMode) {
            case 'INITIAL_PLACEMENT': // initial placement mode, only confirm and undo buttons
                const btnGroup = this.createBtnGroup(0b101); // confirm and undo only, no cancel during initial placement
                for (let btn of btnGroup) {
                    this.interactionLayer.appendChild(btn);
                }
                // check btn state
                // if all buildings placed, enable confirm button
                if (res.result === null) {
                    document.getElementById(this.btnConfirmId).classList.remove('svg-btn-disabled');
                } else {
                    document.getElementById(this.btnConfirmId).classList.add('svg-btn-disabled');
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
        this.interactionLayer = this.getInteractionLayer();
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


        // redraw interaction layer with new valid spots and placed buildings
        this.clearInteractionLayer();
        this._drawFromBuildingPredictor(this.buildingPredictor);

        switch (this.currentMode) {
            case 'INITIAL_PLACEMENT': // initial placement mode, only confirm and undo buttons
                const btnGroup = this.createBtnGroup(0b101); // confirm and undo only, no cancel during initial placement
                for (let btn of btnGroup) {
                    this.interactionLayer.appendChild(btn);
                }
                // check btn state
                // if all buildings placed, enable confirm button
                if (res.result === null) {
                    document.getElementById(this.btnConfirmId).classList.remove('svg-btn-disabled');
                } else {
                    document.getElementById(this.btnConfirmId).classList.add('svg-btn-disabled');
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
                if(!this.buildingPredictor.rollback()){
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
                    document.getElementById(this.btnConfirmId).classList.remove('svg-btn-disabled');
                } else {
                    document.getElementById(this.btnConfirmId).classList.add('svg-btn-disabled');
                }
                break;
            case 'BUILD_ROAD':
                // remove last selected road
                if (this.clickedEdge.length > 0) {
                    this.clickedEdge.pop();
                    const res = this.roadBuildingPredictor.rollbackLastRoad();
                    if (res.status !== StatusCodes.SUCCESS) {
                        console.error("Failed to rollback last road:", res);
                        return;
                    }
                    const validRoadSpots = res.result;

                    // redraw interaction layer
                    this.clearInteractionLayer();
                    this._drawFromBuildingPredictor(this.roadBuildingPredictor);
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
    handleTileClick(tCoord) {
        if (this.currentMode !== 'ROBBER') {
            return; // ignore if not in robber mode
        }
        this.clickedTile.push(tCoord);
    }

















}