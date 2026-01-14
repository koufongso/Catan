// some useful constants
const SQRT3 = Math.sqrt(3);
const SQRT3_HALF = SQRT3 / 2;
const RAD60 = Math.PI / 3; // 60 degrees in radians
const RAD30 = Math.PI / 6; // 30 degrees in radians

// hex utility functions
export const HexUtils = Object.freeze({
    /* --------------------- add/subtract ----------------------------- */
    add(coord1, coord2) {
        return [coord1[0] + coord2[0], coord1[1] + coord2[1], coord1[2] + coord2[2]];
    },

    subtract(coord1, coord2) {
        return [coord1[0] - coord2[0], coord1[1] - coord2[1], coord1[2] - coord2[2]];
    },


    /* --------------------- coord/id ----------------------------- */
    coordToId(coord) {
        return `${coord[0]},${coord[1]},${coord[2]}`;
    },

    idToCoord(id) {
        let parts = id.split(",");
        return [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])];
    },

    isValidHex(hCoord) {
        // check if a hex coordinate is valid (sum of coordinates must be 0)
        return (hCoord[0] + hCoord[1] + hCoord[2]) == 0;
    },

    isValidVertex(vCoord) {
        // check if a vertex coordinate is valid (sum of coordinates must be 1 or -1)
        return Math.abs(vCoord[0] + vCoord[1] + vCoord[2]) == 1;
    },

    isValidEdge(eCoord) {
        let q = eCoord[0];
        let r = eCoord[1];
        let s = eCoord[2];

        // a valid coord should have two odd and one even number
        let val1 = Math.abs(q) % 2; // even: 0, odd: 1
        let val2 = Math.abs(r) % 2;
        let val3 = Math.abs(s) % 2;

        return ((val1 == 0 && val2 == 1 && val3 == 1) ||
            (val1 == 1 && val2 == 0 && val3 == 1) ||
            (val1 == 1 && val2 == 1 && val3 == 0));
    },

    areCoordsEqual(coord1, coord2) {
        return (coord1[0] === coord2[0] && coord1[1] === coord2[1] && coord1[2] === coord2[2]);
    },
    /* --------------------------rendering--------------------------------------- */
    /**
     * Convert hex axial coordinate to pixel coordinate (x to right, y to down)
     * @param {Array} hcoord hex axial coordinate [q,r,s]
     * @param {number} hexSize size of the hex, distance from center to any corner
     * @returns {Array} pixel coordinate [x,y]
     */
    hexToPixel(hcoord, hexSize) {
        // convert axial (q,r,s) to pixel (x,y)
        // reference: https://www.redblobgames.com/grids/hexagons/
        const x = hexSize * (SQRT3 * hcoord[0] + SQRT3_HALF * hcoord[1]);
        const y = hexSize * (1.5 * hcoord[1]);
        return [x, y];
    },

    /**
     * Convert hex vertex coordinate to pixel coordinate (x to right, y to down)
     * @param {Array} vCoord vertex coordinate [q,r,s] (this is not the same as hex center coordinate)
     * @param {number} tileSize 
     * @returns {Array} pixel coordinate [x,y]
     */
    vertexToPixel(vCoord, tileSize) {
        // 1. get one of the adjacent hex coord
        let hCoord = this.getAdjHexesFromVertex(vCoord)[0];

        // 2. get the index of this vertex relative to this hex
        let hex_idx = this.getIndexOfVertex(hCoord, vCoord);

        // 3. calculate pixel position based on hex center and hex index (0: 30deg, 1: 90deg, 2:150deg, 3:210deg, 4:270deg, 5:330deg)
        const [x0, y0] = this.hexToPixel(hCoord, tileSize);
        const angle = RAD60 * hex_idx + RAD30; // 30 degree offsets
        const x = tileSize * Math.cos(angle) + x0;
        const y = -tileSize * Math.sin(angle) + y0; // negate it since SVG y-axis is inverted (down is positive)
        return [x, y];
    },


    /* -------------------------------------------------------------------------- */
    /* The below utility functions are all operating in coordiante (not id) level */
    /* -------------------------------------------------------------------------- */

    /* --------------------- hex ----------------------------- */
    getAdjHexes(hCoord) {
        // input valid check
        if (!this.isValidHex(hCoord)) {
            throw new Error("Invalid hex coordinate");
        }

        // one hex has six adjacent hexes:
        let offsetsList = [
            [1, -1, 0], [1, 0, -1], [0, 1, -1],
            [-1, 1, 0], [-1, 0, 1], [0, -1, 1]
        ];

        let results = [];
        for (let offset of offsetsList) {
            let newCoord = this.add(hCoord, offset);
            results.push(newCoord);
        }
        return results;
    },

    /**
     * return the six vertex coordinates of a hex in order (0: 30deg, 1: 90deg, 2:150deg, 3:210deg, 4:270deg, 5:330deg)
     * @param {Array} hCoord [q,r,s] axial coordinate of the hex
     * @returns Array of six vertex coordinates
     */
    getVerticesFromHex(hCoord) {
        // input valid check
        if (!this.isValidHex(hCoord)) {
            throw new Error("Invalid hex coordinate");
        }
        const q = hCoord[0];
        const r = hCoord[1];
        const s = hCoord[2];

        return [[q, r - 1, s,], [q + 1, r, s], [q, r, s - 1], [q, r + 1, s], [q - 1, r, s], [q, r, s + 1]];
    },


    /*--------------------- hex vertex ----------------------------- */
    /**
     * Get three adjacent hex coordinates from a vertex coordinate
     * @param {Array} vCoord: [q,r,s] axial coordinate of the vertex
     * @returns Array of three adjacent hex coordinates 
     */
    getAdjHexesFromVertex(vCoord) {
        // input valid check
        if (!this.isValidVertex(vCoord)) {
            throw new Error("Invalid hex vertex coordinate");
        }

        let results = [];
        let offsets = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
        for (let offset of offsets) {
            let hCoord = this.add(vCoord, offset);
            if (this.isValidHex(hCoord)) {
                results.push(hCoord);
            }
        }
        return results;
    },

    /**
     * Check if two hex vertices are adjacent
     * @param {Array} vCoord1 hex vertex 1
     * @param {Array} vCoord2 hex vertex 2
     * @returns {boolean} whether the two vertices are adjacent
     */
    isHexVertexAdjacent(vCoord1, vCoord2) {
        // input valid check
        if (!this.isValidVertex(vCoord1) || !this.isValidVertex(vCoord2)) {
            throw new Error("Invalid hex vertex coordinate");
        }

        // two hexes are adjacent if the difference between their coordinates 
        // is one of the six possible adjacent offsets
        let val = subtract(vCoord1, vCoord2);
        const offsets = [
            [0, 1, 1], [1, 0, 1], [1, 1, 0],
            [0, -1, -1], [-1, 0, -1], [-1, -1, 0]
        ];

        for (let offset of offsets) {
            if (val[0] == offset[0] && val[1] == offset[1] && val[2] == offset[2]) {
                return true;
            }
        }
        return false;
    },

    /**
     * Get the three adjacent hex vertices from a hex vertex
     * @param {Array} vCoord input vertex
     * @returns {Array} Array of adjacent hex vertices
     */
    getAdjVerticesFromVertex(vCoord) {
        // input valid check
        if (!this.isValidVertex(vCoord)) {
            throw new Error("Invalid hex vertex coordinate");
        }

        // either add [-1,0,-1] or [0,-1,-1] or [-1,-1,0]
        // or add [1,0,1] or [0,1,1] or [1,1,0]
        // check: add with a valid vertex x should have two odd and one even number
        let results = [];
        let offsets = [];
        // first try with [-1,0,-1] offset
        let vCandidateCoord = [vCoord[0] - 1, vCoord[1] - 1, vCoord[2]];

        // check if this is valid vertex
        if (this.isValidVertex(vCandidateCoord)) {
            // this mean offset1 is valid
            offsets = [[-1, -1, 0], [-1, 0, -1], [0, -1, -1]];
        } else {
            // this mean offset2 is valid
            offsets = [[1, 0, 1], [0, 1, 1], [1, 1, 0]];
        }

        for (let offset of offsets) {
            let newCoord = [vCoord[0] + offset[0], vCoord[1] + offset[1], vCoord[2] + offset[2]];
            // sanity check
            if (!this.isValidVertex(newCoord)) {
                throw new Error("Logic error: generated invalid hex vertex coordinate");
            }
            results.push(newCoord);
        }
        return results;
    },


    /**
     * Get the index of a vertex relative to a hex (0: 30deg, 1: 90deg, 2:150deg, 3:210deg, 4:270deg, 5:330deg)
     * @param {Array} hCoord hex coordinate
     * @param {Array} vCoord vertex coordiante
     * @returns {number} index of the vertex relative to the hex, or null if not adjacent
     */
    getIndexOfVertex(hCoord, vCoord) {
        // input valid check
        if (!this.isValidHex(hCoord)) {
            throw new Error("Invalid hex coordinate");
        }

        if (!this.isValidVertex(vCoord)) {
            throw new Error("Invalid hex vertex coordinate");
        }
        // 0: [1,0,0]
        // 1: [0,-1,0]
        // 2: [0,0,1]
        // 3: [-1,0,0]
        // 4: [0,1,0]
        // 5: [0,0,-1]
        // this make compute the angle easier:
        // angle = rad(60deg) * index + rad(30deg)
        let diff = [vCoord[0] - hCoord[0], vCoord[1] - hCoord[1], vCoord[2] - hCoord[2]];
        if (diff[0] == 1 && diff[1] == 0 && diff[2] == 0) {
            return 0;
        }
        else if (diff[0] == 0 && diff[1] == -1 && diff[2] == 0) {
            return 1;
        }
        else if (diff[0] == 0 && diff[1] == 0 && diff[2] == 1) {
            return 2;
        }
        else if (diff[0] == -1 && diff[1] == 0 && diff[2] == 0) {
            return 3;
        }
        else if (diff[0] == 0 && diff[1] == 1 && diff[2] == 0) {
            return 4;
        }
        else if (diff[0] == 0 && diff[1] == 0 && diff[2] == -1) {
            return 5;
        }
        return null; // not adjacent to the given hex
    },


    /*--------------------- hex edge ----------------------------- */
    /**
     * Get the edge coordinate from two vertex coordinates
     * @param {Array} vCoord1 vertex 1
     * @param {Array} vCoord2 vertex 2
     * @returns {Array} edge coordinate
     */
    getEdgeFromVertices(vCoord1, vCoord2) {
        if (!this.isValidVertex(vCoord1) || !this.isValidVertex(vCoord2)) {
            throw new Error("Invalid hex vertex coordinate");
        }

        const eCoord = this.add(vCoord1, vCoord2);
        if (!this.isValidEdge(eCoord)) {
            throw new Error("The two given vertex coordinates do not form a valid hex edge");
        }
        return eCoord;
    },

    /**
     * Get the two vertex coordinates from an edge coordinate
     * @param {Array} eCoord edge coordinate
     * @returns {Array} array of two vertex coordinates that form this edge
     */
    getVerticesFromEdge(eCoord) {
        // input valid check
        if (!this.isValidEdge(eCoord)) {
            throw new Error("Invalid hex edge coordinate");
        }

        // given an edge coordinate (q,r,s), return the two vertex coordinates that form this edge
        let q = eCoord[0];
        let r = eCoord[1];
        let s = eCoord[2];

        // first find the two hexes that share this 
        // then the two edges is:
        // if q is even, then the two vertices are at:
        // [q, (r+1)/2, (s-1)/2] and [q, (r-1)/2, (s+1)/2]
        // if r is even, then the two vertices are at:
        // [(q+1)/2, r, (s-1)/2] and [(q-1)/2, r, (s+1)/2]
        // if s is even, then the two vertices are at:
        // [(q+1)/2, (r-1)/2, s] and [(q-1)/2, (r+1)/2, s]

        if (Math.abs(q) % 2 === 0) {
            // q is even
            let qHalf = q / 2;
            return [[qHalf, (r + 1) / 2, (s + 1) / 2], [qHalf, (r - 1) / 2, (s - 1) / 2]];
        } else if (Math.abs(r) % 2 === 0) {
            // r is even
            let rHalf = r / 2;
            return [[(q + 1) / 2, rHalf, (s + 1) / 2], [(q - 1) / 2, rHalf, (s - 1) / 2]];
        } else {
            // s is even
            let sHalf = s / 2;
            return [[(q + 1) / 2, (r + 1) / 2, sHalf], [(q - 1) / 2, (r - 1) / 2, sHalf]];
        }
    }
});