import { GameMap } from "../models/GameMap.js";
import { HexUtils } from "./hex-utils.js";
import { NUMBER_TOKENS_ORDER, TERRAIN_TYPES_DISTRIBUTION } from "../constants/GameRuleConstants.js";


export const MapGenerator = Object.freeze({
    createNewMap(rng) {
        const gameMap = new GameMap();

        // get the standar terrian type distribution
        const terrainPool = Object.entries(TERRAIN_TYPES_DISTRIBUTION).flatMap(([type, count]) =>
            Array(count).fill(type)
        );
        // randomly distribute terrain types
        rng.shuffle(terrainPool);
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                for (let s = -2; s <= 2; s++) {
                    if (HexUtils.isValidHex([q, r, s])) {
                        gameMap.updateTile([q, r, s], terrainPool.pop(), null); // create tile with no number token for nows
                    }
                }
            }
        }

        // according to the standard rule, randomly select a corner to start the spiral assignment number tokens
        const corners = [
            [0, -2, 2],  // top-left
            [2, -2, 0],  // top-right
            [2, 0, -2],  // right
            [0, 2, -2],  // bottom-right
            [-2, 2, 0],  // bottom-left
            [-2, 0, 2],  // left
        ];
        const startCorner = corners[rng.nextInt(0, corners.length - 1)];
        const endCorner = [0, 0, 0]// center

        // get the list of tile coordinates in spiral order
        const spiralCoords = MapGenerator._spiralIndex(startCorner, endCorner, true, true);

        const numberTokenPool = NUMBER_TOKENS_ORDER.slice(); // copy the standard order

        for (let coord of spiralCoords) {
            const tile = gameMap.getTile(coord);
            let numberToken = undefined;
            if (tile.terrainType !== 'desert') {
                numberToken = numberTokenPool.shift();
            }else{
                numberToken = null; // desert has no number token
                gameMap.updateRobberCoord(coord); // place robber on desert
            }

            gameMap.updateTile(coord, null, numberToken); // update tile with number token

        }

        //TODO : add ports
        console.warn("MapGenerator: Ports generation not implemented yet.");

        return gameMap;
    },


    /**
     * helpter function to generate a spiral in index range
     * to make it easier, always start at the corner of the ring
     * @param {*} coordStart 
     * @param {*} coordEnd  
     * @param {*} ccw 
     */
    _spiralIndex(coordStart, coordEnd, spiralIn = true, ccw = true) {
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
    },

});