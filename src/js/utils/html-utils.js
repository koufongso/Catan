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

    createSvgButton(x, y, width, height, text, onClick = null, imageHref = null) {

        // 1. The Container Group
        const group = this.createSvgGroup(`btn-${text.replace(/\s/g, '')}`, ["svg-btn"]);
        // Move group to position so internal elements can be relative (0,0)
        // Note: Standard SVG doesn't support x/y on <g>, so we use transform
        group.setAttribute("transform", `translate(${x}, ${y})`);

        // 2. The Background (Image or Rect)
        if (imageHref) {
            const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
            img.setAttribute("href", imageHref);
            img.setAttribute("width", width);
            img.setAttribute("height", height);
            img.setAttribute("x", -width / 2); // Center horizontally
            img.setAttribute("y", -height / 2); // Center vertically
            group.appendChild(img);
        } else {
            // Fallback: Stylish Rectangle
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("width", width);
            rect.setAttribute("height", height);
            rect.setAttribute("x", -width / 2);
            rect.setAttribute("y", -height / 2);
            rect.setAttribute("rx", 10); // Rounded corners
            rect.classList.add("btn-bg"); // Add CSS class for styling
            group.appendChild(rect);
        }

        // 3. The Text Label
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.textContent = text;
        label.setAttribute("text-anchor", "middle");      // Horizontal Center
        label.setAttribute("dominant-baseline", "middle"); // Vertical Center
        label.setAttribute("pointer-events", "none");     // Let clicks pass through to the rect/group
        label.classList.add("btn-text");
        group.appendChild(label);

        // 4. Interaction
        group.onclick = (e) => {
            e.stopPropagation(); // Prevent clicking the map underneath
            if (onClick) onClick(e);
        };

        return group;
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

    createRoadPlacementGroup(coords, onclick = null, attributes = {}, classList = [], hexSize = HEX_SIZE) {
        const roadPlacementGroup = HtmlUtils.createSvgGroup(null, ["road-placement-group", "placement-mode"]);
        coords.forEach(eCoord => {
            const edgeLine = HtmlUtils.createRoadElement(eCoord, attributes, classList, hexSize);
            roadPlacementGroup.appendChild(edgeLine);
        });
        roadPlacementGroup.id = 'road-placement-group';
        roadPlacementGroup.onclick = onclick;
        return roadPlacementGroup;
    },

    createSettlementPlacementGroup(coords, onclick = null, attributes = {}, classList = [], hexSize = HEX_SIZE) {
        const settlementPlacementGroup = HtmlUtils.createSvgGroup(null, ["settlement-placement-group", "placement-mode"]);
        coords.forEach(coord => {
            const settlementCircle = HtmlUtils.createSettlementElement(coord, attributes, classList, hexSize);
            settlementPlacementGroup.appendChild(settlementCircle);
        });
        settlementPlacementGroup.id = 'settlement-placement-group';
        settlementPlacementGroup.onclick = onclick;
        return settlementPlacementGroup;
    },

    createCityPlacementGroup(coords, onclick = null, attributes = {}, classList = [], hexSize = HEX_SIZE) {
        const cityPlacementGroup = HtmlUtils.createSvgGroup(null, ["city-placement-group", "placement-mode"]);
        coords.forEach(coord => {
            const p = HexUtils.vertexToPixel(coord, hexSize);
            const cityCircle = HtmlUtils.createSvgCircle(p.x, p.y, 12, classList);
            cityCircle.style.fill = attributes.color;
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
            return; z
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

    renderSettlement(settlementCoord, color, level, hexSize = HEX_SIZE) {
        // render a settlement at the given vertexId with the given color and level
        const vertexLayer = document.getElementById('settlement-layer');
        if (!vertexLayer) {
            console.error("Renderer: Vertex layer not found in SVG. Cannot render settlement.");
            return;
        }

        // create a circle element for the settlement
        const settlementId = HexUtils.coordToId(settlementCoord);
        const [x, y] = HexUtils.vertexToPixel(settlementCoord, hexSize);
        const settlementCircle = HtmlUtils.createSvgCircle(x, y, level === 1 ? 12 : 18, level === 1 ? ["settlement"] : ["city"]);
        settlementCircle.setAttribute("fill", color);
        settlementCircle.dataset.id = settlementId;
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
    },

    createRoadElement(eCoord, attributes = {}, classList = [], hexSize = HEX_SIZE) {
        const edgeId = HexUtils.coordToId(eCoord);
        const [v1Coord, v2Coord] = HexUtils.getVerticesFromEdge(eCoord);
        const [x1, y1] = HexUtils.vertexToPixel(v1Coord, hexSize);
        const [x2, y2] = HexUtils.vertexToPixel(v2Coord, hexSize);

        // Use your shortening logic for a better look
        const shortened = HtmlUtils.getShortenedLine(x1, y1, x2, y2, 0.2);
        const edgeLine = HtmlUtils.createSvgLine(shortened.x1, shortened.y1, shortened.x2, shortened.y2, classList);
        edgeLine.dataset.id = edgeId;
        if (attributes.color) {
            edgeLine.style.stroke = attributes.color;
        }
        return edgeLine;
    },

    createSettlementElement(vCoord, attributes = {}, classList = [], hexSize = HEX_SIZE) {
        const vertexId = HexUtils.coordToId(vCoord);
        const [x, y] = HexUtils.vertexToPixel(vCoord, hexSize);
        const settlementCircle = HtmlUtils.createSvgCircle(x, y, 10, classList);
        settlementCircle.dataset.id = vertexId;
        if (attributes.color) {
            settlementCircle.style.fill = attributes.color;
        }
        return settlementCircle;
    }
});