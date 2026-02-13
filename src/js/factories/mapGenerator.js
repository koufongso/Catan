import { NUMBER_TOKENS_ORDER, TERRAIN_TYPES_DISTRIBUTION } from "../constants/GameRuleConstants.js";
import { initGameMap } from "./mapFactory.js";
import { MapUtils } from "../utils/MapUtils.js";
import { HexUtils } from "../utils/HexUtils.js";


function _getSpiralIndex(coordStart, coordEnd, spiralIn = true, ccw = true) {
    const results = [];

    let startCorner = coordStart;

    // check number of layers and the start corner
    let moveCorner = null;
    let [q, r, s] = coordStart;
    if (q == 0 && s > r) {//top-left corner
        moveCorner = spiralIn ? [0, 1, -1] : [0, -1, 1];
    } else if (q == 0 && r > s) {//bot-right corner
        moveCorner = spiralIn ? [0, -1, 1] : [0, 1, -1];
    } else if (r == 0 && s > q) {//left corner
        moveCorner = spiralIn ? [1, 0, -1] : [-1, 0, 1];
    } else if (r == 0 && q > s) {//right corner
        moveCorner = spiralIn ? [-1, 0, 1] : [1, 0, -1];
    } else if (s == 0 && q > r) {//top-right corner
        moveCorner = spiralIn ? [-1, 1, 0] : [1, -1, 0];
    } else if (s == 0 && r > q) {//bot-left corner
        moveCorner = spiralIn ? [1, -1, 0] : [-1, 1, 0];
    } else if (q == 0 && r == 0 && s == 0) {
        // center case
        if (spiralIn) {
            return [coordStart];
        } else {
            moveCorner = [0, -1, 1]; // (arbitrary) moving to top-left corner
        }
    } else {
        throw new Error("Invalid start corner for spiralIndex");
    }


    let coord = startCorner; // current hex coord
    let move = null;
    // assume we start at a corner
    while (true) {
        if (HexUtils.areCoordsEqual(coord, coordEnd)) {
            // reached the end
            results.push(coord);
            break;
        }


        // check if we need to change direction
        let [q, r, s] = coord;

        if (q == 0 && s > r) {//top-left corner
            move = ccw ? [-1, 1, 0] : [1, 0, -1];
        } else if (q == 0 && r > s) {//bot-right corner
            move = ccw ? [1, -1, 0] : [-1, 0, 1];
        } else if (r == 0 && s > q) {//left corner
            move = ccw ? [0, 1, -1] : [1, -1, 0];
        } else if (r == 0 && q > s) {//right corner
            move = ccw ? [0, -1, 1] : [-1, 1, 0];
        } else if (s == 0 && q > r) {//top-right corner
            move = ccw ? [-1, 0, 1] : [0, 1, -1];
        } else if (s == 0 && r > q) {//bot-left corner
            move = ccw ? [1, 0, -1] : [0, -1, 1];
        } else if (q == 0 && r == 0 && s == 0) {
            // center case, stop
            results.push(coord);
            return results;
        }

        results.push(coord);

        // move to next coord
        const newCoord = HexUtils.add(coord, move);

        if (HexUtils.areCoordsEqual(newCoord, startCorner)) {
            // we reached the starting corner (complete one ring), update startCorner
            startCorner = HexUtils.add(startCorner, moveCorner);
            coord = startCorner;
        } else {
            coord = newCoord;
        }

    }

    return results;
}


export const MapGenerator = {
    /**
     * Creates a fully populated Catan map.
     * @param {Object} rng - The RNG instance
     * @returns {Object} The complete GameMap POJO
     */
    createNewMap(rng) {
        // 1. Create the empty POJO container
        const gameMap = initGameMap();

        // 2. Prepare Terrain Pool
        const terrainPool = Object.entries(TERRAIN_TYPES_DISTRIBUTION).flatMap(([type, count]) =>
            Array(count).fill(type)
        );
        rng.shuffle(terrainPool);

        // 3. Fill the map with Tiles (Using MapUtils)
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                for (let s = -2; s <= 2; s++) {
                    if (HexUtils.isValidHex([q, r, s])) {
                        const type = terrainPool.pop();
                        MapUtils.updateTile(gameMap, [q, r, s], type, null);
                    }
                }
            }
        }

        // 4. Spiral Number Token Assignment
        // hardcoded corners for the 19-hex map, we can precompute this if needed
        // TODO: compute according to the actual map layout instead of hardcoding corners, to support different map shapes in the future
        const corners = [
            [0, -2, 2], [2, -2, 0], [2, 0, -2],
            [0, 2, -2], [-2, 2, 0], [-2, 0, 2]
        ];
        const startCorner = corners[rng.nextInt(0, corners.length - 1)];
        const endCorner = [0, 0, 0];

        // compute the spiral order of coordinates from start to end
        const spiralCoords = _getSpiralIndex(startCorner, endCorner, true, true);
        const numberTokenPool = NUMBER_TOKENS_ORDER.slice();

        for (let coord of spiralCoords) {
            const id = HexUtils.coordToId(coord);
            const tile = gameMap.tiles[id];

            let numberToken = null;

            if (tile.terrainType !== 'desert') {
                numberToken = numberTokenPool.shift();
            } else {
                // Direct assignment for simple properties
                gameMap.robberCoord = coord;
            }

            // Update the number token on the existing tile
            tile.numberToken = numberToken;
        }

        console.warn("MapGenerator: Ports generation not implemented yet.");

        MapUtils.updateAllEdgeId(gameMap);
        MapUtils.updateAllVertexId(gameMap);

        // 5. Return the Plain Object
        return gameMap;
    }
};