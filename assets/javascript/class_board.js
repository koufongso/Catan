class board {
    constructor(boardSize, tileSize) {
        this.boardSize = boardSize;
        this.tileSize =tileSize;
        this.map = $("<div>");
        this.map_node = $("<div>");
        this.w = Math.sqrt(3) * tileSize;
        var cx = $('#board').width() / 2;
        var cy = $('#board').height() / 2;
        var theta = 0;
        var local_theta = -Math.PI / 6;
        var id = 0; // current tile id
        var coord = [0, 0, 0]; // current tile hexagon coordinate [x,y,z];
        var travel = [[0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1], [1, 0, 0], [0, 1, 0]]; // a matrix used to control the tile "travel direction"
        var nid = 0; // node id

        // center tile
        this.createTile(cx, cy, id++, availableResource.splice(Math.floor(Math.random() * availableResource.length), 1), coord);
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
            var resource = "sea";
            for (var c = 0; c < 6; c++) {
                // find the corner coord and draw the coner
                var x = cx + lv * this.w * Math.cos(theta);
                var y = cy - lv * this.w * Math.sin(theta);

                if (lv < boardSize) {
                    var resource = availableResource.splice(Math.floor(Math.random() * availableResource.length), 1);
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
                }

                this.createTile(x, y, id++, resource, coord);

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
                    if (lv < boardSize) {
                        var resource = availableResource.splice(Math.floor(Math.random() * availableResource.length), 1);
                        var local_edge_theta = local_start;
                        // create node for edge tile
                        // console.log(`coord:[${coord[0]},${coord[1]},${coord[2]}`);
                        for (var j = 1; j <= 2; j++) {
                            var xn_temp = x_temp + tileSize * Math.cos(local_edge_theta);
                            var yn_temp = y_temp - tileSize * Math.sin(local_edge_theta);
                            this.createNode(xn_temp, yn_temp, nid++, this.getAdjacent(coord, c, j));
                            local_edge_theta += Math.PI / 3;
                        }
                    }
                    this.createTile(x_temp, y_temp, id++, resource, coord);

                    local_theta += Math.PI / 3;
                }
                // one edge finished, enter next corner
                
                coord[0] += travel[c][0];
                coord[1] += travel[c][1];
                coord[2] += travel[c][2];
                

                // increase the coners angle
                theta += Math.PI / 3;
            }
            theta = 0; // reset
        }
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
            ${this.map.html()}
        </g>
        <g id="group-node">
            ${this.map_node.html()}
        </g>
    </svg >
    `);
        this.render();
    }

    /* render the tile based on the pattern*/
    render() {
        // loop over resource list
        for (var i = 0; i < resourceList.length; i++) {
            // get corresponding class
            var tiles = $('.' + resourceList[i]);
            // console.log(tiles);
            for (var j = 0; j < tiles.length; j++) {
                tiles[j].style.fill = `url(#pattern-${resourceList[i]})`;
            }
        }
        var temp = $('.shadow')
        for (var i = 0; i < temp.length; i++) {
            temp[i].style.filter = `url(#filter_shadow)`;
        }
    }


    /* create a tile(hexagon) object and added it to the svg panel
    */
    createTile(x, y, id, resource, coord) {
        if (resource == "desert") {
            var val = 7;
            tileLisener[7].push(id);
            this.map.append(`
            <g class="tile ${resource}" id = t${id} val = ${val} >
                <use xlink: href="#hexagon" transform="translate(${x}, ${y})" />
            </g>
        `);
        } else if (resource == "sea") {
            var val=0;
            this.map.append(`
            <g class="tile ${resource}" id = t${id} >
                <use xlink: href="#hexagon" transform="translate(${x}, ${y})" />
            </g>
        `);
        } else {
            var val = dice.splice(Math.floor(Math.random() * dice.length), 1);
            tileLisener[val].push(id);
            this.map.append(`
            <g class="tile ${resource}" id = t${id} val = ${val} coord = ${JSON.stringify(coord)} >
                <use xlink: href="#hexagon" transform="translate(${x}, ${y})" />
                <circle class="circle" cx=${x} cy=${y} r="20" />
                <text class="tile-val" x="${x}" y="${y + 10}" > ${val}</text>
            </g>
        `);
        }
        tileList.push(new tile(id, resource,val));
    }

    /* create a node and added it to the svg node group
    */
    createNode(x, y, id, adjacent) {
        nodeList.push(new node(id, adjacent));

        this.map_node.append(`
        <g class="node" id = ${ id} >
            <circle class="node-circle" cx=${x} cy=${y} r="10" />
            <circle class ="shadow" cx=${x} cy=${y} r="15" fill="#ffffe6"/>
        </g>
    `);
    }

    /* for every node, find the adjacent tile and add the tile to the node tiles
        local: 0,1,2 represent the starting angle index
        corner: represent current corner num: 0,1,2,3,4,5
    */
    getAdjacent(coord, corner, local) {
        var origin = [...coord];
        var acoord =[];
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




