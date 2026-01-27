import { HexUtils } from "../utils/hex-utils.js";
import { HtmlUtils } from "../utils/html-utils.js";
import { RoadBuildingPredictor } from "../utils/road-building-predictor.js";
import { StatusCodes } from "../constants/StatusCodes.js";
import { GameUtils } from "../utils/game-utils.js";
import { StatusCodesUtils } from "../utils/status-code-utils.js";

// manage rendering of interactive map elements (e.g. road placement highlights)
export class MapInteractionRenderer {
    constructor(controller) {
        this.interactionLayerId = 'interaction-layer';
        this.interactionLayer = this.getInteractionLayer();
        this.roadBuildingPredictor = new RoadBuildingPredictor();
        this.controller = controller; // to communicate user actions back to controller (this can be replaced by request middleware later)
    }

    getInteractionLayer() {
        return document.getElementById('interaction-layer');
    }

    createButtonGroup(action, confirmHandler, cancelHandler = null) {
        const width = 80;
        const halfWidth = width / 2;
        const height = 40;
        const padding = 10;

        // position of the top, center of the button group
        const anchorX = 0;
        const anchorY = document.getElementById('map-svg').getBoundingClientRect().height / 2 - height - padding;

        const confirmBtn = HtmlUtils.createSvgButton(anchorX - halfWidth - padding, anchorY, width, height, "Confirm", confirmHandler);
        confirmBtn.id = 'map-interaction-confirm-btn';
        confirmBtn.classList.add('svg-btn-primary');
        this.interactionLayer.appendChild(confirmBtn);

        const cancelBtn = HtmlUtils.createSvgButton(anchorX + halfWidth + padding, anchorY, width, height, "Cancel", cancelHandler);
        cancelBtn.id = 'map-interaction-cancel-btn';
        cancelBtn.classList.add('svg-btn-cancel');
        if (cancelHandler === null) {
            cancelBtn.classList.add('svg-btn-disabled');
            cancelBtn.disabled = true;
        }
        this.interactionLayer.appendChild(cancelBtn);


        return { confirmBtn: confirmBtn, cancelBtn: cancelBtn };
    }


    renderInteractionUI(interaction) {
        // clear previous
        if (!this.interactionLayer) {
            // try to get it again
            this.interactionLayer = this.getInteractionLayer();
            if (!this.interactionLayer) {
                console.error("Interaction layer not found in DOM");
                return;
            }
        }

        this.clear();

        switch (interaction.action) {
            case 'BUILD_ROAD':
                this.renderInteractionUIRoadBuilding(
                    {
                        currentPlayerId: interaction.data.currentPlayerId,
                        currentPlayerColor: interaction.data.currentPlayerColor,
                        gameMap: interaction.data.gameMap,
                        enforced: interaction.data.enforced // if null, it's initial placement, no cancel
                    });
                break;
            case 'BUILD_SETTLEMENT':
                // to be implemented
                this.renderInteractionUISettlementBuilding({
                    currentPlayerId: interaction.data.currentPlayerId,
                    currentPlayerColor: interaction.data.currentPlayerColor,
                    gameMap: interaction.data.gameMap,
                    enforced: interaction.data.enforced, // if null, it's initial placement, no cancel
                    noCancel: interaction.data.noCancel // if true, disable cancel button (user must place settlement)
                });
                break;
            default:
                console.warn(`Unknown map interaction action: ${interaction.action}`);
        }
    }

    /**
     * 
     * @param {*} args should contain {gameMap, numberOfRoads, currentPlayerId}
     */
    renderInteractionUIRoadBuilding(args) {
        console.log("Rendering road building interaction UI with args:", args);
        const numberOfRoads = args.numberOfRoads || 1;
        const currentPlayerId = args.currentPlayerId;
        const currentPlaterColor = args.currentPlayerColor || 'rgba(0, 255, 0, 0.7)';
        this.roadBuildingPredictor.init(args.gameMap); //initialize predictor with current map
        const res = this.roadBuildingPredictor.getNextValidRoadSpots(currentPlayerId);
        if (res.status !== StatusCodes.SUCCESS) {
            console.error("Failed to get valid road spots:", res.error_message);
            return;
        }

        // setup confirm button, canel button handlers
        const buttonGroup = this.createButtonGroup(
            'BUILD_ROAD',
            // confirm handler
            async (e) => {
                // finalize road placements
                // get all the placed roads from predictor
                const roadCoords = this.roadBuildingPredictor.selectedRoadStack;
                if (roadCoords.length === 0) {
                    console.warn("No roads placed to confirm");
                    return;
                }
                console.log("Confirming road placements:", roadCoords);
                const res = await this.controller.inputEvent(
                    {
                        type: 'BUILD_ROAD',
                        roadCoords: roadCoords, // note: roadCoords are in order of placement
                        playerId: currentPlayerId
                    });

                // only clear if success
                if (!StatusCodesUtils.isRequestSuccessful(res)) {
                    console.log("Road placement failed:", res.error_message);
                    return;
                }

                // finalize road placements
                res.roadCoords.forEach(roadCoord => {
                    HtmlUtils.renderRoad(roadCoord, res.playerColor);
                });
                // clear predictor state
                this.roadBuildingPredictor.clear();
                // clear interaction UI
                this.clear();

                // check if there are any interaction actions to render next
                if (res.interaction) {
                    this.renderInteractionUI(res.interaction);
                }


            },
            // cancel handler
            (e) => {
                // rollback all placed roads
                this.roadBuildingPredictor.clear();
                this.clear();
            });

        const confirmBtn = buttonGroup.confirmBtn;

        confirmBtn.classList.add('svg-btn-disabled');
        const validRoadCoords = res.result;
        const roadPlacementGroup = this._interativeRoadBuildingRendering(validRoadCoords, currentPlaterColor, numberOfRoads, currentPlayerId, confirmBtn);
        this.interactionLayer.appendChild(roadPlacementGroup);
    }

    clear() {
        HtmlUtils.clearElementById(this.interactionLayerId);
    }

    // private helper for interactive road building rendering
    // return a road placement group element for a given set of road coords
    _interativeRoadBuildingRendering(validRoadCoords, currentPlaterColor, numberOfRoads, currentPlayerId, confirmBtn) {
        const roadPlacementGroup = HtmlUtils.createRoadPlacementGroup(validRoadCoords, (e) => {
            // click road: 

            // case 1: selected road, check if we can rollback
            if (e.target.classList.contains('placed-road')) {
                console.log("Case 1: clicked on already placed road, attempting rollback");
                // rollback last road
                const roadId = e.target.dataset.id;
                const roadCoord = HexUtils.idToCoord(roadId);

                const lastRoadCoord = this.roadBuildingPredictor.peek();
                if (lastRoadCoord && HexUtils.areCoordsEqual(roadCoord, lastRoadCoord)) {
                    this.roadBuildingPredictor.rollbackLastRoad();
                    e.target.classList.toggle('placed-road');
                    // after rollback, disable confirm button
                    confirmBtn.classList.toggle('svg-btn-disabled', true);
                    e.target.classList.remove('placed-road');
                    e.target.classList.add('available-road');

                    // recompute valid road spots for next placement
                    const res = this.roadBuildingPredictor.getNextValidRoadSpots(currentPlayerId);
                    if (res.status !== StatusCodes.SUCCESS) {
                        console.error("Failed to get valid road spots:", res.error_message);
                        return;
                    }
                    // re-render valid road spots
                    HtmlUtils.removeElementById('road-placement-group');
                    console.log("Re-rendering valid road spots after rollback");
                    const newValidRoadCoords = res.result;
                    const newRoadPlacementGroup = this._interativeRoadBuildingRendering(newValidRoadCoords, currentPlaterColor, numberOfRoads, currentPlayerId, confirmBtn);
                    this.interactionLayer.appendChild(newRoadPlacementGroup);

                } else {
                    console.warn("Can only rollback the last placed road");
                }
            } else {
                console.log("Case 2: clicked on unselected road, attempting to place new road");

                // case 2: unselected road, try to place new road
                // first check if we can still place more roads
                const newRoadCount = this.roadBuildingPredictor.selectedRoadStack.length;
                if (newRoadCount >= numberOfRoads) {
                    console.warn("Already placed maximum number of roads");
                    return;
                }

                // can place more roads
                // 1. add road to predictor
                const roadId = e.target.dataset.id;
                const roadCoord = HexUtils.idToCoord(roadId);
                const selectRes = this.roadBuildingPredictor.selectRoad(currentPlayerId, roadCoord);
                if (selectRes.status !== StatusCodes.SUCCESS) {
                    console.error("Invalid road placement:", selectRes.error_message);
                    return;
                }

                // 2. add class attribute (to indicate placed)
                e.target.classList.remove('available-road');
                e.target.classList.add('placed-road');

                // 3. if reached max, activate confirm button, else deactivate
                const newRoadCountAfter = this.roadBuildingPredictor.selectedRoadStack.length;


                if (newRoadCountAfter >= numberOfRoads) {
                    confirmBtn.disabled = false;
                    confirmBtn.classList.toggle('svg-btn-disabled', false);
                } else {
                    confirmBtn.classList.toggle('svg-btn-disabled', true);
                    // recompute valid road spots for next placement
                    const res = this.roadBuildingPredictor.getNextValidRoadSpots(currentPlayerId);
                    if (res.status !== StatusCodes.SUCCESS) {
                        console.error("Failed to get valid road spots:", res.error_message);
                        return;
                    }
                    // re-render valid road spots
                    HtmlUtils.removeElementById('road-placement-group');
                    console.log("Re-rendering valid road spots after placement");
                    const newValidRoadCoords = res.result;
                    const newRoadPlacementGroup = this._interativeRoadBuildingRendering(newValidRoadCoords, currentPlaterColor, numberOfRoads, currentPlayerId, confirmBtn);
                    this.interactionLayer.appendChild(newRoadPlacementGroup);
                }
            }
        }, { color: currentPlaterColor });

        console.log("Created road placement group for interactive road building UI:", roadPlacementGroup);
        // before return, set all placed road since the placed road is no longer in the validRoadCoords
        this.roadBuildingPredictor.selectedRoadStack.forEach(roadCoord => {
            const roadId = HexUtils.coordToId(roadCoord);
            const roadElement = HtmlUtils.createRoadElement(roadCoord, { color: currentPlaterColor });
            roadElement.classList.remove('available-road');
            roadElement.classList.add('placed-road');
            roadPlacementGroup.appendChild(roadElement);
        });

        return roadPlacementGroup;
    }


    renderInteractionUISettlementBuilding(args) {
        console.log("Rendering road building interaction UI with args:", args);
        const maxSettlements = args.numberOfSettlements || 1;
        const currentPlayerId = args.currentPlayerId;
        const currentPlaterColor = args.currentPlayerColor || 'rgba(0, 255, 0, 0.7)';
        const validSettlementCoords = GameUtils.getValidSettlementCoords(args.gameMap, args.enforced ? currentPlayerId : null);

        // setup confirm button, canel button handlers
        const cancelHandler = null;
        if (!args.noCancel) {
            // allow cancel
            cancelHandler = () => {
                this.clear();
            }
        }

        const buttonGroup = this.createButtonGroup(
            'BUILD_SETTLEMENT',
            // confirm handler
            async (e) => {
                // query all placed settlements
                const placedSettlementElements = this.interactionLayer.querySelectorAll('.placed-settlement');
                if (placedSettlementElements.length === 0) {
                    console.warn("No settlements placed to confirm");
                    return;
                }

                if (placedSettlementElements.length > maxSettlements) {
                    console.warn("More settlements placed than allowed to confirm");
                    return;
                }

                // right now just hard code 1 settlement placement
                const vertexId = placedSettlementElements[0].dataset.id;
                const res = await this.controller.inputEvent({
                    type: 'BUILD_SETTLEMENT',
                    vertexId: vertexId,
                    playerId: currentPlayerId
                });

                // only clear if success
                if (!StatusCodesUtils.isRequestSuccessful(res)) {
                    console.log("Settlement placement failed:", res.error_message);
                    return;
                }

                // finalize settlement placements
                HtmlUtils.renderSettlement(res.settlementCoord, res.playerColor, 1);
                // clear interaction UI
                this.clear();

                // check if there are any interaction actions to render next
                if (res.interaction) {
                    this.renderInteractionUI(res.interaction);
                }
            },
            // cancel handler
            cancelHandler
        );


        // create settlement placement group
        const settlementPlacementGroup = HtmlUtils.createSettlementPlacementGroup(validSettlementCoords,
            (e) => {
                // click settlement: get vertexId       
                const vertexId = e.target.dataset.id;


                if (e.target.classList.contains('placed-settlement')) {
                    //case 1: click already placed settlement, rollback
                    e.target.classList.remove('placed-settlement');
                    e.target.classList.add('available-settlement');
                } else {
                    // case 2: click available settlement, try to place new settlement
                    // check if max reached
                    // for settlement placement, only allow one placement at a time
                    const numberOfSettlementsPlaced = this.interactionLayer.querySelectorAll('.placed-settlement').length;
                    if (numberOfSettlementsPlaced >= maxSettlements) {
                        console.warn("Already placed maximum number of settlements");
                        return;
                    }

                    // can add settlement
                    // change class to placed
                    e.target.classList.remove('available-settlement');
                    e.target.classList.add('placed-settlement');
                }
            },
            { color: currentPlaterColor });

        this.interactionLayer.appendChild(settlementPlacementGroup);
    }

}