import { HexUtils } from "../utils/hex-utils.js";
import { SVG_NAMESPACE, HEX_SIZE } from "../constants/RenderingConstants.js";

export const HtmlUtils = Object.freeze({

    // --- DOM MANIPULATION ---

    /**
     * Safely removes an element from the DOM and clears listeners.
     */
    removeElementById(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.onclick = null; // Break circular references/listeners
        element.remove();
    },

    /**
     * Clears the children of an element but keeps the parent.
     * Useful for clearing a layer without deleting the layer itself.
     */
    clearElementById(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return null;

        element.onclick = null;
        element.innerHTML = '';
        return element;
    },

    // --- SVG FACTORY (Namespace: http://www.w3.org/2000/svg) ---

    createSvgCircle(cx, cy, r, classList = [], id = null) {
        const circle = document.createElementNS(SVG_NAMESPACE, "circle");
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        circle.setAttribute("r", r);

        this._applyAttributes(circle, classList, id);
        return circle;
    },

    createSvgLine(x1, y1, x2, y2, classList = [], id = null) {
        const line = document.createElementNS(SVG_NAMESPACE, "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);

        this._applyAttributes(line, classList, id);
        return line;
    },


    createSvgGroup(id = null, classList = []) {
        const g = document.createElementNS(SVG_NAMESPACE, "g");
        this._applyAttributes(g, classList, id);
        return g;
    },

    // --- HTML FACTORY (Standard DOM) ---

    createButton(text, classList = [], id = null, onClick = null) {
        const button = document.createElement("button");
        button.textContent = text;
        this._applyAttributes(button, classList, id);

        if (onClick) {
            button.onclick = onClick;
        }
        return button;
    },

    createRoadPlacementGroup(coords, onclick = null) {
        const roadPlacementGroup = HtmlUtils.createSvgGroup(null, ["road-placement-group", "placement-mode"]);
        coords.array.forEach(element => {
            const [v1, v2] = HexUtils.getVerticesFromEdge(element);
            const p1 = HexUtils.vertexToPixel(v1);
            const p2 = HexUtils.vertexToPixel(v2);
            const roadLine = HtmlUtils.createSvgLine(p1, p2, ["road-highlight", "hitbox"]);
            roadPlacementGroup.appendChild(roadLine);
        });

        roadPlacementGroup.onclick = onclick;
        return roadPlacementGroup;
    },

    createSettlementPlacementGroup(coords, onclick = null) {
        const settlementPlacementGroup = HtmlUtils.createSvgGroup(null, ["settlement-placement-group", "placement-mode"]);
        coords.array.forEach(coord => {
            const p = HexUtils.vertexToPixel(coord);
            const settlementCircle = HtmlUtils.createSvgCircle(p.x, p.y, 10, ["settlement-highlight", "hitbox"]);
            settlementPlacementGroup.appendChild(settlementCircle);
        });
        settlementPlacementGroup.onclick = onclick;
        return settlementPlacementGroup;
    },

    createCityPlacementGroup(coords, onclick = null) {
        const cityPlacementGroup = HtmlUtils.createSvgGroup(null, ["city-placement-group", "placement-mode"]);
        coords.array.forEach(coord => {
            const p = HexUtils.vertexToPixel(coord);
            const cityCircle = HtmlUtils.createSvgCircle(p.x, p.y, 12, ["city-highlight", "hitbox"]);
            cityPlacementGroup.appendChild(cityCircle);
        });
        cityPlacementGroup.onclick = onclick;
        return cityPlacementGroup;
    },


    // render road/settlement/city

    renderRoad(roadCoord, color, hexSize = HEX_SIZE) {
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
        const [x1, y1] = HexUtils.vertexToPixel(vCoord1, hexSize);
        const [x2, y2] = HexUtils.vertexToPixel(vCoord2, hexSize);

        const shortened = HtmlUtils.getShortenedLine(x1, y1, x2, y2, 0.2);
        const roadLine = HtmlUtils.createSvgLine(shortened.x1, shortened.y1, shortened.x2, shortened.y2, ["road", `road-${roadId}`]);
        roadLine.dataset.id = roadId;
        roadLine.style.stroke = `${color}`;
        roadLayer.appendChild(roadLine);
    },

    renderSettlement(vertexId, color, level, hexSize = HEX_SIZE) {
        // render a settlement at the given vertexId with the given color and level
        const vertexLayer = document.getElementById('settlement-layer');
        if (!vertexLayer) {
            console.error("Renderer: Vertex layer not found in SVG. Cannot render settlement.");
            return;
        }

        // create a circle element for the settlement
        const vCoord = HexUtils.idToCoord(vertexId);
        const [x, y] = HexUtils.vertexToPixel(vCoord, hexSize);
        const settlementCircle = HtmlUtils.createSvgCircle(x, y, level === 1 ? 12 : 18, level === 1 ? ["settlement"] : ["city"]);
        settlementCircle.setAttribute("fill", color);
        settlementCircle.dataset.id = vertexId;
        vertexLayer.appendChild(settlementCircle);
    },

    // --- INTERNAL HELPER ---

    _applyAttributes(element, classList, id) {
        if (classList && classList.length > 0) {
            element.classList.add(...classList);
        }
        if (id) {
            element.id = id;
        }
    },

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
});