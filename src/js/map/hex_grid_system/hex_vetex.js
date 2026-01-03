export class HexVertex {
    constructor(q = 0, r = 0, s = 0) {
        // a unique hex axial coordinates (q,r,s),
        // defined by its three adjacent (q,r,s) values 
        // we also used it as the vertex id
        this.coord = [q, r, s];
        this.id = `${q},${r},${s}`;
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
        let val = [this.coord[0] + newCoord[0], this.coord[1] + newCoord[1], this.coord[2] + newCoord[2]];
        let val1 = val[0] % 2;
        let val2 = val[1] % 2;
        let val3 = val[2] % 2;

        if (!((val1 == 0 && val2 == 1 && val3 == 1) ||
            (val1 == 1 && val2 == 0 && val3 == 1) ||
            (val1 == 1 && val2 == 1 && val3 == 0))) {// this mean offset1 is valid
            offsets = [[-1, 0, -1], [0, -1, -1], [-1, -1, 0]];
        }
        else {// this mean offset2 is valid
            offsets = [[1, 0, 1], [0, 1, 1], [1, 1, 0]];
        }

        for (let offset of offsets) {
            let newCoord = [this.coord[0] + offset[0], this.coord[1] + offset[1], this.coord[2] + offset[2]];
            results.push(newCoord);
        }
        return results;
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