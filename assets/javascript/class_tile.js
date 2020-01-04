class tile {
    constructor(x, y, id, coord, resource, val) {
        this.location = [x, y];
        this.id = id;                       // tile id
        this.coord = coord;                 // tile coordination in [x,y,z], id = coord2ID(coord)
        this.val = val
        this.resource = resource;
        this.nodeLisener = [];              // store house node
        this.forbidden = false;
    }
    /* add node to this tile for getting this tile's resource*/
    addNode(node) {
        this.nodeLisener.push(node);
    }

    sendResource() {
        if (!this.forbidden) {
            for (var i = 0; i < this.nodeLisener.length; i++) {
                var player = this.nodeLisener[i].owner;
                var house = this.nodeLisener[i].house;
                // console.log(`${this.val}: send ${house} ${this.resource} to player ${player}`);
                if (player !== "") {
                    // console.log("send!");
                    players.list[player].getResource({ [this.resource]: house });
                }
            }
        }
    }

    forbid() { this.forbidden = true; }

    free() { this.forbidden = false; }

    getNode() { return this.nodeLisener; }

}