// an edge is defined by two (hex) vertices
export class HexEdge {
    constructor(vertex1, vertex2) {
        // under the axial coordinate system (q,r,s), 
        // the sum of its two vertices' coordinates is unique
        // and we used it as the edge id
        this.coord = vertex1.add(vertex2).coord;
        this.id = `${this.coord[0]},${this.coord[1]},${this.coord[2]}`;
        this.v1 = vertex1;
        this.v2 = vertex2;
    }
}