export class Hex {
    constructor(q = 0, r = 0, s = 0) {
        // unique hex axial coordinates (q,r,s)
        // we also use it as the hex id
        if (q + r + s !== 0) {
            throw new Error("Invalid hex coordinates: q + r + s must equal 0");
        }

        this.coord = [q, r, s];
        this.id = `${q},${r},${s}`;
    }

    getAdjacentHexCoord() {
        // six possible adjacent offsets
        let offsets = [
            [1, -1, 0], [1, 0, -1], [0, 1, -1],
            [-1, 1, 0], [-1, 0, 1], [0, -1, 1]
        ];

        let results = [];
        for (let offset of offsets) {
            let newCoord = [this.coord[0] + offset[0], this.coord[1] + offset[1], this.coord[2] + offset[2]];
            results.push(newCoord);
        }
        return results;
    }

    getVertexCoord() {
        let q = this.coord[0];
        let r = this.coord[1];
        let s = this.coord[2];

        return [[q, r - 1, s,], [q + 1, r, s], [q, r, s - 1], [q, r + 1, s], [q - 1, r, s], [q, r, s + 1]];
    }
}