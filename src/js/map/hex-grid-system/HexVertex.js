export class HexVertex {
    constructor(coord) {
        // a unique hex axial coordinates (q,r,s),
        // defined by its three adjacent (q,r,s) values 
        // we also used it as the vertex id
        // check if this is a valid vertex

        if (!HexVertex.isHexVertexCoordValid(coord)) {
            throw new Error(`Invalid Hex Vertex Coordinate: (${q},${r},${s}). The sum of coordinates must be 1 or -1.`);
        }
        this.coord = coord;
        this.id = `${coord[0]},${coord[1]},${coord[2]}`;
    }

    static isHexVertexCoordValid(coord) {
        // check if the vertex coordinate is valid
        let q = coord[0];
        let r = coord[1];
        let s = coord[2];
        return (Math.abs(q + r + s) == 1);
    }

    // check if two hexes are adjacent
    isAdjacentVertex(other) {
        // two hexes are adjacent if the difference between their coordinates 
        // is one of the six possible adjacent offsets
        let val = this.subtract(other);
        return ((val[0] == 0 && val[1] == 1 && val[2] == 1) ||
            (val[0] == 1 && val[1] == 0 && val[2] == 1) ||
            (val[0] == 1 && val[1] == 1 && val[2] == 0) ||
            (val[0] == 0 && val[1] == -1 && val[2] == -1) ||
            (val[0] == -1 && val[1] == 0 && val[2] == -1) ||
            (val[0] == -1 && val[1] == -1 && val[2] == 0));
    }

    // get a list of adjacent vertex coordinates
    getAdjacentVertexCoord() {
        // either add [-1,0,-1] or [0,-1,-1] or [-1,-1,0]
        // or add [1,0,1] or [0,1,1] or [1,1,0]
        // check: add with a valid vertex x should have two odd and one even number
        let results = [];
        let offsets = [];
        // first try with [-1,0,-1] offset
        let newCoord = [this.coord[0] - 1, this.coord[1] - 1, this.coord[2]];
        
        // check if this is valid vertex
        if (HexVertex.isHexVertexCoordValid(newCoord)) {
            // this mean offset1 is valid
            offsets = [[-1, -1, 0], [-1, 0, -1], [0, -1, -1]];
        }
        else {
            // this mean offset2 is valid
            offsets = [[1, 0, 1], [0, 1, 1], [1, 1, 0]];
        }

        for (let offset of offsets) {
            let newCoord = [this.coord[0] + offset[0], this.coord[1] + offset[1], this.coord[2] + offset[2]];
            results.push(newCoord);
        }
        return results;
    }

    getAdjacentHexCoord() {
        // get the three hexes that share this vertex
        let results = [];
        let offsets = [[1, 0, 0], [-1, 0, 0], [0, 1, 0],[0, -1, 0], [0, 0, 1], [0, 0, -1]];
        for (let offset of offsets) {
            let candidate_coord = [this.coord[0] + offset[0], this.coord[1] + offset[1], this.coord[2] + offset[2]];
            if ((candidate_coord[0] + candidate_coord[1] + candidate_coord[2]) == 0) {
                // valid hex coord should sum to 1 (q+r+s=1)
                let newCoord = [this.coord[0] + offset[0], this.coord[1] + offset[1], this.coord[2] + offset[2]];
                results.push(newCoord);
            }
        }
        return results;
    }

    // get the position in the hex (0,1,2,3,4,5)
    //       1
    //    2 / \ 0
    //    |     |
    //    3 \ / 2 
    //       4 
    getHexIndex(hexCoord) {
        // 0: [1,0,0]
        // 1: [0,-1,0]
        // 2: [0,0,1]
        // 3: [-1,0,0]
        // 4: [0,1,0]
        // 5: [0,0,-1]
        // this make compute the angle easier:
        // angle = rad(60deg) * index + rad(30deg)
        let diff = [this.coord[0] - hexCoord[0], this.coord[1] - hexCoord[1], this.coord[2] - hexCoord[2]];
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
        else if (diff[0] == 0 && diff[1] == 0 && diff[2] == 1) {
            return 5;
        }
        return null; // not adjacent to the given hex
    }
    // helper function: add two hex coordinates
    add(other) {
        let result = [0, 0, 0]
        result[0] = this.coord[0] + other.coord[0];
        result[1] = this.coord[1] + other.coord[1];
        result[2] = this.coord[2] + other.coord[2];
        return result;
    }

    // helper function: subtract two hex coordinates
    subtract(other) {
        let result = [0, 0, 0]
        result[0] = this.coord[0] - other.coord[0];
        result[1] = this.coord[1] - other.coord[1];
        result[2] = this.coord[2] - other.coord[2];
        return result;
    }


}