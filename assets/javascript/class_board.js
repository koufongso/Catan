class board {
    constructor(boardSize, tileSize, diceVal, availableResource) {
        // states
        this.availableResource = availableResource;
        this.diceVal = diceVal;
        this.tileLisener = { 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [] }; // inform the corresponding tiles when the dice hit the value 
        this.tileList = [];
        this.nodeList = [];
        this.boardSize = boardSize;         // the number of layer of the board, center tile count as 0 layer
        this.tileSize = tileSize;            // the size of a tile, from the center to the corner
        this.w = Math.sqrt(3) * tileSize;   // the width of a tile

        this.boardTile = $("<div>"); // 
        this.boardNode = $("<div>");

        // coordinate of the center tile
        var cx = $('#board').width() / 2;
        var cy = $('#board').height() / 2;

        var theta = 0; // [rad]
        var local_theta = -Math.PI / 6;
        var tid = 0; // current tile tid
        var coord = [0, 0, 0]; // current tile hexagon coordinate [x,y,z];
        var travel = [[0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1], [1, 0, 0], [0, 1, 0]]; // a matrix used to control the tile "travel direction"
        var nid = 0; // node tid

        // center tile
        this.createTile(cx, cy, tid++, coord, undefined, undefined);
        // create node
        for (var j = 0; j < 6; j++) {
            var xn = cx + tileSize * Math.cos(local_theta);
            var yn = cy - tileSize * Math.sin(local_theta);
            this.createNode(xn, yn, nid++, this.getAdjacent(coord, -1, j));
            local_theta += Math.PI / 3;
        }
        // loop over each level/layer
        for (var lv = 1; lv <= boardSize; lv++) {
            coord = [lv, 0, 0];
            // for each level, loop over 6 coners

            for (var c = 0; c < 6; c++) {
                // find the corner coord and draw the coner
                var x = cx + lv * this.w * Math.cos(theta);
                var y = cy - lv * this.w * Math.sin(theta);


                this.createTile(x, y, tid++, coord, undefined, undefined); // create the corner tile
                // create node on corner tile
                var local_start = theta - Math.PI / 6;
                local_theta = local_start;
                // console.log(`coord:[${coord[0]},${coord[1]},${coord[2]}`);
                for (var j = 0; j < 3; j++) {
                    var xn = x + tileSize * Math.cos(local_theta);
                    var yn = y - tileSize * Math.sin(local_theta);
                    this.createNode(xn, yn, nid++, this.getAdjacent(coord, c, j));
                    local_theta += Math.PI / 3;
                }



                local_start += Math.PI / 3;
                // define the travel direction
                var dir = theta + 2 * Math.PI / 3;
                // loop over its edge each lv has lv-1 tile for each edge
                for (var i = 1; i < lv; i++) {
                    coord[0] += travel[c][0];
                    coord[1] += travel[c][1];
                    coord[2] += travel[c][2];
                    // fine the next edge coord and draw the edge tile
                    var x_temp = x + i * this.w * Math.cos(dir);
                    var y_temp = y - i * this.w * Math.sin(dir);

                    var local_edge_theta = local_start;
                    // create node for edge tile
                    // console.log(`coord:[${coord[0]},${coord[1]},${coord[2]}`);
                    for (var j = 1; j <= 2; j++) {
                        var xn_temp = x_temp + tileSize * Math.cos(local_edge_theta);
                        var yn_temp = y_temp - tileSize * Math.sin(local_edge_theta);
                        this.createNode(xn_temp, yn_temp, nid++, this.getAdjacent(coord, c, j));
                        local_edge_theta += Math.PI / 3;
                    }

                    this.createTile(x_temp, y_temp, tid++, coord, undefined, undefined);

                    local_theta += Math.PI / 3;
                }
                // one edge finished, enter next corner
                coord[0] += travel[c][0];
                coord[1] += travel[c][1];
                coord[2] += travel[c][2];

                theta += Math.PI / 3; // increase the coners angle
            }
            theta = 0; // reset
        }

        this.resourceDistribute(this.diceVal, this.availableResource)
        this.drawTile(); // append tile to the svg div
        this.drawNode(); // append node ot the svg div
    }





    display() {
        $('#main_panel').empty(); // clear main_panel
        // define tile/hexagon pattern, hexagon shape
        $('#main_panel').html(`
            <svg id = "board" >
                <defs>
                    <pattern id="pattern-desert" height="100%" width="100%" patternContentUnits="objectBoundingBox">
                        <image height="1" width="1" preserveAspectRatio="none" xlink:href="assets/images/desert.jpg" />
                    </pattern>

                    <pattern id="pattern-wood" height="100%" width="100%" patternContentUnits="objectBoundingBox">
                        <image height="1" width="1" preserveAspectRatio="none" xlink:href="assets/images/forest.jpg" />
                    </pattern>

                    <pattern id="pattern-brick" height="100%" width="100%" patternContentUnits="objectBoundingBox">
                        <image height="1" width="1" preserveAspectRatio="none" xlink:href="assets/images/brick.jpg" />
                    </pattern>

                    <pattern id="pattern-stone" height="100%" width="100%" patternContentUnits="objectBoundingBox">
                        <image height="1" width="1" preserveAspectRatio="none" xlink:href="assets/images/stone.jpg" />
                    </pattern>

                    <pattern id="pattern-grain" height="100%" width="100%" patternContentUnits="objectBoundingBox">
                        <image height="1" width="1" preserveAspectRatio="none" xlink:href="assets/images/grain.jpg" />
                    </pattern>

                    <pattern id="pattern-wool" height="100%" width="100%" patternContentUnits="objectBoundingBox">
                        <image height="1" width="1" preserveAspectRatio="none" xlink:href="assets/images/wool.jpg"/ >
                    </pattern>

                    <pattern id="pattern-sea" height="100%" width="100%" patternContentUnits="objectBoundingBox">
                        <image height="1" width="1" preserveAspectRatio="none" xlink:href="assets/images/sea.jpg" />
                    </pattern>

                    <g id="hexagon">
                        <polygon points="0,${-this.tileSize} ,${this.w / 2},${-this.tileSize / 2}, ${this.w / 2},${this.tileSize / 2}, 0,${this.tileSize}, ${-this.w / 2},${this.tileSize / 2}, ${-this.w / 2},${-this.tileSize / 2}" />
                    </g>

                    <filter id="filter_shadow">
                        <feGaussianBlur stdDeviation="5"/>
                    </filter>
                </defs>

                <g id="group-tile">
                    ${this.boardTile.html()}
                </g>
                <g id="group-node">
                    ${this.boardNode.html()}
                </g>
            </svg >
        `);
        this.render();
    }

    /* render the tile based on the pattern*/
    render() {
        // loop over resource list
        for (var i = 0; i < this.tileList.length; i++) {
            $(`#t${this.tileList[i].id}`)[0].style.fill = `url(#pattern-${this.tileList[i].resource})`;

        }

        var temp = $('.shadow');
        for (var i = 0; i < temp.length; i++) {
            temp[i].style.filter = `url(#filter_shadow)`;
        }
    }


    /* create a tile(hexagon) object and added it to the svg panel
    */
    createTile(x, y, tid, coord, resource, val) {
        this.tileList.push(new tile(x, y, tid, coord, resource, val));
    }

    /* create a node and added it to the svg node group
    */
    createNode(x, y, nid, adjacent) {
        this.nodeList.push(new node(x, y, nid, adjacent));
    }

    /* draw tile on the svg div*/
    drawTile() {
        console.log("draw tile");
        for (var i = 0; i < this.tileList.length; i++) {
            var x = this.tileList[i].location[0];
            var y = this.tileList[i].location[1];
            var val = this.tileList[i].val;
            // console.log(`${this.tileList[i].resource}`);

            if (this.tileList[i].val == undefined || this.tileList[i].resource == "desert") {
                 this.boardTile.append(`
                    <g class="tile ${this.tileList[i].resource}" id = t${this.tileList[i].id}>
                        <use xlink: href="#hexagon" transform="translate(${x}, ${y})" />
                    </g>
                `);
            } else {
                this.boardTile.append(`
                    <g class="tile ${this.tileList[i].resource}" id = t${this.tileList[i].id} val = ${val}>
                        <use xlink: href="#hexagon" transform="translate(${x}, ${y})" />
                        <circle class="circle" cx=${x} cy=${y} r="20" />
                        <text class="tile-val" x=${x} y=${y + 10} > ${val}</text>
                    </g>
                `);
            }
        }
    }

    /* draw node on the svg div*/
    drawNode() {
        console.log("draw node");
        for (var i = 0; i < this.nodeList.length; i++) {
            var x = this.nodeList[i].location[0];
            var y = this.nodeList[i].location[1];

            this.boardNode.append(`
                <g class="node" id = ${this.nodeList[i].id} >
                    <circle class="node-circle" cx=${x} cy=${y} r="10" />
                    <circle class ="shadow" cx=${x} cy=${y} r="15" fill="#ffffe6"/>
                </g>
            `);
        }
    }


    /* resource distribution system
        assign val to each tile and resource to each tile
    */
    resourceDistribute() {
        console.log("distribute")
        // assgin 0 ~ boardSize-1 tile val
        // for each layer id = [3lv(lv-1)+1......3lv(lv-1)+6lv]
        for (var i = 0; i <= 3 * (this.boardSize - 1) * (this.boardSize); i++) {
            this.tileList[i].val = this.diceVal.splice(Math.floor(Math.random() * this.diceVal.length), 1); // randomly take 1 val from the diceval list
        }


        for (var i = 0; i < this.tileList.length; i++) {
            if (this.tileList[i].val != undefined) {
                if (this.tileList[i].val == 7) {
                    console.log(this.tileList[i].val);
                    this.tileList[i].resource = "desert";

                } else {
                    this.tileList[i].resource = this.availableResource.splice(Math.floor(Math.random() * this.availableResource.length), 1); // randomly take 1 val from the diceval list
                    // console.log(this.tileList[i].resource);
                }

            } else {
                this.tileList[i].resource = "sea";
                // console.log(this.tileList[i].resource);
            }
        }
    }


    /* helper function
        for every node, find the adjacent tile and add the tile to the node tiles
        local: 0,1,2 represent the starting angle index
        corner: represent current corner num: 0,1,2,3,4,5
    */
    getAdjacent(coord, corner, local) {
        var origin = [...coord];
        var acoord = [];
        acoord.push(origin);
        var ct = [[0, 0, -1], [1, 0, 0], [0, 1, 0],
        [0, 0, 1], [-1, 0, 0], [0, -1, 0],
        [0, 0, -1], [1, 0, 0], [0, 1, 0]]; // coordination transform for coner
        if (corner == -1) {
            acoord.push([coord[0] + ct[local][0], coord[1] + ct[local][1], coord[2] + ct[local][2]]);
            acoord.push([coord[0] + ct[local + 1][0], coord[1] + ct[local + 1][1], coord[2] + ct[local + 1][2]]);
        } else {
            acoord.push([coord[0] + ct[corner + local][0], coord[1] + ct[corner + local][1], coord[2] + ct[corner + local][2]]);
            acoord.push([coord[0] + ct[corner + local + 1][0], coord[1] + ct[corner + local + 1][1], coord[2] + ct[corner + local + 1][2]]);
        }
        return acoord;
    }
}





