class node {
    constructor(x, y, id, adj) {
        this.location = [x, y];
        this.id = id;
        this.tile = adj;        // adjacent tile
        this.owner = "";
        this.house = 0;
        this.houseCap = 2;
        this.connection = [];
        this.adjNode = getAdjecentNode(id);
        this.port="";
    }

    build(player) {
        // check if this node is occupied
        if (this.owner == "") {
            // check if the player has enough resource to build
            if (cost(player, { wood: 1, wool: 1, brick: 1, grain: 1 })) {
                this.owner = player.id;
                this.house++;
                // register this node to all the adjacent tile to obtain resource

                player.house[0]++;
                player.addHouse(this); // add this node 
                // build finish
                player.addRoad(this);
                console.log("build!");
                return true;
            } else {
                // not enoguth material
                alert("Not enough material!");
                return false;
            }
        } else {
            console.log(`it's occupied by ${this.owner} and cannot build a new house here`);
            return false;
        }
    }

    /* upgrade the house*/
    upgrade(player) {
        // check if the node/house owner is the current player
        // check if the house reach the max lv cap
        if (this.owner == player.id && this.canUpgrade()) {
            // check if the player has enough resource to upgrade
            if (cost(player, { grain: 2, stone: 3 })) {
                this.house++;
                player.house[0]--;
                player.house[1]++;
                return true;
            } else {
                alert("Not enougth material!");
                return false;
            }
        } else {
            console.log("It is not your house!");
            return false;
        }
    }

    canUpgrade(){
        return this.house<this.houseCap;
    }
}


/* helper function
   check and take the consumption from the player's resource
   @para player: player object ,  consumption: dictionary {resource:amount} 
   return true if the player has enought material
   return false if the player does not ave enough materila
*/
function cost(player, consumption) {
    // console.log(player);
    var keys = Object.keys(consumption);
    // check
    for (var i = 0; i < keys.length; i++) {
        // console.log(player.resource);
        if (player.resource[keys[i]] < consumption[keys[i]]) {
            return false;
        }
    }
    // deduct
    for (var i = 0; i < keys.length; i++) {
        player.resource[keys[i]] -= consumption[keys[i]];
    }

    player.updateResource();
    return true;
}



/* helper function
   convert hexagon coordinate[x,y,z] to id
*/
function coord2ID(coord) {
    var x = coord[0] - coord[2];
    var y = coord[1] + coord[2];
    // special case: center
    if (x == 0 && y == 0) {
        return 0;
    }

    var lv;
    var edge;
    var corner;

    if (x * y > 0) {
        lv = Math.abs(x) + Math.abs(y);
        edge = Math.abs(y);
        if (x > 0) {
            corner = 0
        } else {
            corner = 3;
        }
    }

    if (x * y < 0) {
        var d = Math.abs(y) - Math.abs(x);
        if (d > 0) {
            lv = Math.abs(x) + d;
            edge = Math.abs(x);
            if (x > 0) {
                corner = 4;
            } else {
                corner = 1;
            }
        } else {
            lv = Math.abs(x);
            edge = Math.abs(d);
            if (x > 0) {
                corner = 5;
            } else {
                corner = 2;
            }
        }
    }

    if (x == 0) {
        lv = Math.abs(y);
        edge = 0;
        if (y > 0) {
            corner = 1
        } else {
            corner = 4;
        }
    }

    if (y == 0) {
        lv = Math.abs(x);
        edge = 0;
        if (x > 0) {
            corner = 0;
        } else {
            corner = 3;
        }
    }

    // console.log(`lv:${lv},corner:${corner},edge:${edge}`);
    var s = 3 * lv * (lv - 1) + 1;
    return s + corner * lv + edge;
}




/* helper function
   get the current node id and return the 3 adjacent node id
*/
function getAdjecentNode(id) {
    var adj = [];
    var lv = Math.floor(Math.sqrt(id / 6)); // get current lv
    var start = 6 * lv * lv;
    if (lv == 0) {
        var end = 5;
    } else {
        var end = 6 * lv * (lv + 2) + 5;
    }

    var corner = Math.floor((id - start) / (2 * lv + 1)); // get current corner
    var edge = (id - start) % (2 * lv + 1); // get current edge
    if (lv == 0) {
        corner = id;
        edge = 0;
    }

    if (id + 1 > end) {
        adj.push(start);
    } else {
        adj.push(id + 1)
    }


    if (id - 1 < start) {
        adj.push(end);
    } else {
        adj.push(id - 1);
    }

    // console.log(`lv:${lv},corner:${corner},edge:${edge}`);
    var newlv;
    var newCorner;
    var newEdge;


    if (edge == 0) {
        newlv = lv + 1;
        newEdge = 2 * newlv;
        newCorner = corner - 1;
        if (newCorner < 0) {
            newCorner = 5;
        }
    } else {
        if (edge % 2 == 0) {
            // even lv-1;
            newlv = lv - 1;
            newCorner = corner;
            newEdge = edge - 1;
            if (newEdge > newlv) {
                newEdge = 0;
                newCorner = corner + 1;
                if (newCorner > 5) {
                    newCorner = 0;
                }
            }
        } else {
            newlv = lv + 1;
            newCorner = corner;
            newEdge = edge + 1;
        }
    }
    // console.log(`newlv:${newlv},newcorner:${newCorner},newedge:${newEdge}`);
    adj.push(6 * newlv * newlv + newCorner * (2 * newlv + 1) + newEdge);
    return adj;
}
