// an edge is defined by two (hex) vertices
export class HexEdge {
    constructor(coord) {
        // under the axial coordinate system (q,r,s), 
        // the sum of its two vertices' coordinates is unique
        // and we used it as the edge id/coordinate
        this.coord = coord;
        this.id = `${this.coord[0]},${this.coord[1]},${this.coord[2]}`;
        const vertices = HexEdge.getVertexCoordsFromEdgeCoord(this.coord);
        this.v1 = vertices[0];
        this.v2 = vertices[1];
    }

    static fromVertices(vertex1, vertex2) {
        // given two vertex coordinates, return the HexEdge instance
        let coord = vertex1.add(vertex2);
        return new HexEdge(coord);
    }

    static isHexEdgeCoordValid(coord) {
        // check if the edge coordinate is valid
        let q = coord[0];
        let r = coord[1];
        let s = coord[2];

        // a valid coord should have two odd and one even number
        let val1 = Math.abs(q) % 2; // even: 0, odd: 1
        let val2 = Math.abs(r) % 2;
        let val3 = Math.abs(s) % 2;

        return ((val1 == 0 && val2 == 1 && val3 == 1) ||
            (val1 == 1 && val2 == 0 && val3 == 1) ||
            (val1 == 1 && val2 == 1 && val3 == 0));
    }


    static getVertexCoordsFromEdgeCoord(edgeCoord) {
        if (!HexEdge.isHexEdgeCoordValid(edgeCoord)) {
            throw new Error(`Invalid Hex Edge Coordinate: (${edgeCoord[0]},${edgeCoord[1]},${edgeCoord[2]}). A valid edge coordinate must have two odd and one even number.`);
        }
        // given an edge coordinate (q,r,s), return the two vertex coordinates that form this edge
        let q = edgeCoord[0];
        let r = edgeCoord[1];
        let s = edgeCoord[2];

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
            return [[qHalf, (r + 1)/2, (s + 1)/2], [qHalf, (r - 1)/2, (s - 1)/2]];
        } else if (Math.abs(r) % 2 === 0) {
            // r is even
            let rHalf = r / 2;
            return [[(q + 1)/2, rHalf, (s + 1)/2], [(q - 1)/2, rHalf, (s - 1)/2]];
        } else {
            // s is even
            let sHalf = s / 2;
            return [[(q + 1)/2, (r + 1)/2, sHalf], [(q - 1)/2, (r - 1)/2, sHalf]];
        }
    }
}