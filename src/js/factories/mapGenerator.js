import { NUMBER_TOKENS_ORDER, TERRAIN_TYPES_DISTRIBUTION } from "../constants/GameRuleConstants.js";
import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";

import { initGameMap } from "./mapFactory.js";
import { createTradingPost } from "./tradingPostFactory.js";

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
        let gameMap = initGameMap();

        gameMap = this._generateTiles(gameMap, rng);
        gameMap = this._generateNumberTokens(gameMap, rng);
        gameMap = this._generatePorts(gameMap, rng);

        // create a cache for all exist vertexId and edgeId for easy reference later (e.g., for validating settlement/road placement)
        MapUtils.updateAllEdgeId(gameMap);
        MapUtils.updateAllVertexId(gameMap);

        return gameMap;
    },

    _generateTiles(gameMap, rng) {
        // get the terrain pool according to the distribution, and shuffle it
        const terrainPool = Object.entries(TERRAIN_TYPES_DISTRIBUTION).flatMap(([type, count]) =>
            Array(count).fill(type)
        );
        rng.shuffle(terrainPool);

        // fill the map with tiles
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

        return gameMap;
    },

    _generateNumberTokens(gameMap, rng) {
        // Spiral Number Token Assignment
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

        return gameMap;
    },

    _generatePorts(gameMap, rng) {
        // there are 6 pices for the port, each has 3 slots position:
        // 1: [None], [3:1 wild], [None]
        // 2: [None], [2:1 lumber], [None]
        // 3: [2:1 wool], [None], [3:1 wild]
        // 4: [2:1 brick], [None], [3:1 wild]
        // 5: [None], [2:1 ore], [None]
        // 6: [2:1 wheat], [None], [3:1 wild]

        // there are these positions for the port (the order matter!):
        // 1: [2,-3,1], [1,-3,2],[0,-3,3]
        // 2: [-1,-2,3], [-2,-1,3],[-3,0,3]
        // 3: [-3,1,2], [-3,2,1],[-3,3,0]
        // 4: [-2,3,-1], [-1,3,-2],[0,3,-3]
        // 5: [1,2,-3], [2,1,-3],[3,0,-3]
        // 6: [3,-1,-2], [3,-2,-1],[3,-3,0]

        // prepare port types (equivalent to the trading list) and position groups
        const wildPort = {[RESOURCE_TYPES.LUMBER]: 3, [RESOURCE_TYPES.WHEAT]: 3, [RESOURCE_TYPES.ORE]: 3, [RESOURCE_TYPES.BRICK]: 3, [RESOURCE_TYPES.WOOL]: 3};
        const lumberPort = {[RESOURCE_TYPES.LUMBER]: 2};
        const woolPort = {[RESOURCE_TYPES.WOOL]: 2};
        const brickPort = {[RESOURCE_TYPES.BRICK]: 2};
        const orePort = {[RESOURCE_TYPES.ORE]: 2};
        const wheatPort = {[RESOURCE_TYPES.WHEAT]: 2};

        const ports = [
            [null, wildPort, null],
            [null,lumberPort, null],
            [woolPort, null, wildPort],
            [brickPort, null, wildPort],
            [null, orePort, null],
            [wheatPort, null, wildPort]
        ];

        // shuffle the ports
        rng.shuffle(ports);

        const portPositions = [
            [[2,-3,1], [1,-3,2],[0,-3,3]],
            [[-1,-2,3], [-2,-1,3],[-3,0,3]],
            [[-3,1,2], [-3,2,1],[-3,3,0]],
            [[-2,3,-1], [-1,3,-2],[0,3,-3]],
            [[1,2,-3], [2,1,-3],[3,0,-3]],
            [[3,-1,-2], [3,-2,-1],[3,-3,0]]
        ];

        // the bridge position is the index list of the hex that indicate the vertex that connect to the port
        // 0-5, counter-clockwise, starting at 30 deg position
        const bridgePosition = [
            [[3,4], [4,5], [4,5]],
            [[4,5], [5,0], [5,0]],
            [[5,0], [0,1], [0,1]],
            [[0,1], [1,2], [1,2]],
            [[1,2], [2,3], [2,3]],
            [[2,3], [3,4], [3,4]]
        ];

        // assign ports to the positions
        for (let i = 0; i < ports.length; i++) {
            const portGroup = ports[i];
            const positionGroup = portPositions[i];
            const bridgeGroup = bridgePosition[i];

            // create port for each position in the group
            for (let j = 0; j < portGroup.length; j++) {
                const portType = portGroup[j];
                const position = positionGroup[j];
                const bridge = bridgeGroup[j];
                if (portType !== null) {
                    const tradingPost = createTradingPost(position, bridge, portType);
                    MapUtils.updateTradingPost(gameMap, tradingPost);
                }
            }
        }

        return gameMap;
    }


};