import { HexUtils } from "../utils/hex-utils.js";
import { HtmlUtils } from "../utils/html-utils.js";
import { RoadBuildingPredictor } from "../utils/road-building-predictor.js";
import { StatusCodes } from "../constants/StatusCodes.js";

// manage rendering of interactive map elements (e.g. road placement highlights)
export class MapInteractionRenderer {
    constructor() {
        this.interactionLayerId = 'interaction-layer';
        this.interactionLayer = this.getInteractionLayer();
        this.roadBuildingPredictor = new RoadBuildingPredictor();
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
        if (cancelHandler === null) { // default: clear UI
            cancelHandler = () => {
                this.clear();
            }
        }
        this.interactionLayer.appendChild(cancelBtn);

        return { confirmBtn: confirmBtn, cancelBtn: cancelBtn };
    }


    renderInteractionUI(action, args) {
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

        switch (action) {
            case 'BUILD_ROAD':
                this.renderInteractionUIRoadBuilding(args);
                break;

            default:
                console.warn(`Unknown map interaction action: ${action}`);
        }
    }

    /**
     * 
     * @param {*} args should contain {gameMap, numberOfRoads, currentPlayerId}
     */
    renderInteractionUIRoadBuilding(args) {
        console.log("Rendering road building interaction UI with args:", args);
        const numberOfRoads = args.numberOfRoads || Infinity;
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
            () => {
                // finalize road placements
                const placedRoads = [...this.roadBuildingPredictor.selectedRoadStack];
                this.roadBuildingPredictor.clear();
                this.clear();
            },
            // cancel handler
            () => {
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
        const roadPlacementGroup =  HtmlUtils.createRoadPlacementGroup(validRoadCoords, (e) => {
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
            const roadElement = HtmlUtils.createRoadElement(roadCoord, { color: currentPlaterColor  });
            roadElement.classList.remove('available-road');
            roadElement.classList.add('placed-road');
            roadPlacementGroup.appendChild(roadElement);
        });

        return roadPlacementGroup;
    }

}