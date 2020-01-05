class control {
    constructor(board, players) {
        this.board = board;
        this.players = players;
        this.info = $('<div>'); // to hold the control panel content;

        // to display player's info
        for (var i = 0; i < this.players.nPlayer; i++) {
            this.info.append(`
                <div class="player-div" id="player-${i}">
                    <p>Player ${i}</p>
                    <div class="r">
                        <div class="r-wood">
                            <img class="icon" src="assets/images/icons_resource/wood.png">
                            <span class="val-wood">?</span>
                        </div>
                        <div class="r-brick">
                            <img class="icon" src="assets/images/icons_resource/brick.png">
                            <span class="val-brick">?</span>
                        </div>
                        <div class="r-stone">
                            <img class="icon" src="assets/images/icons_resource/stone.png">
                            <span class="val-stone">?</span>
                        </div>
                        <div class="r-grain">
                            <img class="icon" src="assets/images/icons_resource/grain.png">
                            <span class="val-grain">?</span>
                        </div>
                        <div class="r-wool">
                            <img class="icon" src="assets/images/icons_resource/wool.png">
                            <span class="val-wool">?</span>
                        </div>
                    </div>
                </div>
            `);
        }

        this.panel = $('<div>').html(`       
            <div class="player_info">${this.info.html()}</div>
            <div class="dice_panel">
                <div class="dice" id="d1"></div>
                <div class="dice" id="d2"></div>
            </div>
            <div class="center-div">
                <button class="btn btn-roll">Roll</button>
                <button class="btn btn-next">Next</button>
            <div>
            <div class="btn_panel">
                <button class="btn btn-road">Build Road</button>
                <button class="btn btn-build">Build House</button>
                <button class="btn btn-upgrade">Upgrade</button>
                <button class="btn btn-trade">Trade</button>
                <button class="btn btn-cancel">Cancel</button>
                
            </div>
        `);
    }

    /*---------------------------------------button function-------------------------------*/

    /* roll 2 dice, display and return the result
    */
    roll() {
        var _this = this;
        console.log("roll!")
        $('.btn').off("click"); // turn off all btn
        var d1 = Math.floor(Math.random() * 6) + 1;
        var d2 = Math.floor(Math.random() * 6) + 1;
        $('#d1').html(`
                <img src="assets/images/dice/d${d1}.png">
            `);
        $('#d2').html(`
            <img src="assets/images/dice/d${d2}.png">
            `);

        if (d1 + d2 !== 7) {
            // get resource
            var tiles = this.board.tileLisener[d1 + d2]; // looking for coresponding tile
            for (var i = 0; i < tiles.length; i++) {
                // go to tile list
                tiles[i].sendResource();
                /*build road button*/
            }
            // turn on other button after rolling


        } else {
            // 7, robber
            // free previous forbidden tile
            console.log("rob!")
            $('.tile').addClass("tile-hover");
            $('.desert').removeClass("tile-hover");
            $(`#t${this.board.tileLisener[7][0].id}`).removeClass("tile-hover");


            $('.tile-hover').on("click", function () {
                _this.board.tileLisener[7][0].free();
                var pre = $(`#t${_this.board.tileLisener[7][0].id}`).attr("class").split(" ")
                $(`#t${_this.board.tileLisener[7][0].id}`)[0].style.fill = `url(#pattern-${pre[1]})`;
                _this.board.tileLisener[7].pop(); // pop the forbiddens

                // console.log($(this));
                $(this)[0].style.fill = "black";
                var tid = parseInt($(this).attr("id").slice(1));
                _this.board.tileLisener[7].push(_this.board.tileList[tid]);
                // console.log(tid);
                _this.board.tileList[tid].forbid();
                var adjNode = _this.board.tileList[tid].getNode(); // get all builded node on this tile
                var adjPlayer = []
                for (var i = 0; i < adjNode.length; i++) {
                    if ((!adjPlayer.includes(adjNode[i].owner))
                        && (adjNode[i].owner !== _this.players.currentPlayer.id)
                        && _this.players.list[adjNode[i].owner].hasResource(1)) {
                        adjPlayer.push(adjNode[i].owner);
                    }
                }

                console.log(adjPlayer);
                // choose one player
                if (adjPlayer.length != 0) {
                    console.log("hi")
                    var rob = $('<div>').addClass("rob_panel");
                    rob.html(`
                        <p> Choose one player</p>
                    `)
                    for (var i = 0; i < adjPlayer.length; i++) {
                        rob.append(`
                            <div class="rob-player text-hover" id=${adjPlayer[i]}> Player ${adjPlayer[i]} </div>
                        `);
                    }
                    $('#main_panel').append(rob);
                    $('.rob-player').on("click", function () {
                        // randomly take 1 resource
                        _this.players.currentPlayer.getResource(_this.players.list[parseInt($(this).attr("id"))].random());
                        $('.rob_panel').remove();
                    });
                }

                $('.tile').off("click");
                $('.tile').removeClass("tile-hover");
            });
        }


        $('.btn-road').on("click", () => { this.buildRoad() });
        /*build house button*/
        $('.btn-build').on("click", () => { this.build() });
        /* upgrade house button*/
        $('.btn-upgrade').on("click", () => { this.upgrade() });
        /*trade button*/
        $('.btn-trade').on("click", () => { this.trade() })
        /*cancel button*/
        $('.btn-cancel').on("click", () => { this.cancel() });
        /* next button*/
        $('.btn-next').on("click", () => { this.next(); });
        // console.log(`activate btn`);
    }


    /* build road button function*/
    buildRoad() {
        var _this = this;
        console.log("buildRoad");
        this.cancel();
        $('.btn-road').addClass('btn-on');
        $('.node').off("click");
        // must start with a node that connected by road : loop over all the road node
        for (var i = 0; i < this.players.currentPlayer.roadNode.length; i++) {
            var myRoadNode = this.players.currentPlayer.roadNode[i];
            // check if current node has adjacent node
            // adjNode is the current node's unconnected adjacent nodes = nodes that can be used to build road
            if (myRoadNode.adjNode.length != 0) {
                $(`#${myRoadNode.id}`).css("visibility", "visible");
                $(`#${myRoadNode.id}`).addClass("node-hover");
            }
        }

        $(".node-hover").on("click", function () {
            // console.log(_this);
            // get the click point's location (starting node)
            var x1 = parseInt($(this).find(".node-circle").attr("cx"));
            var y1 = parseInt($(this).find(".node-circle").attr("cy"));
            // console.log(`${x1},${y1}`);

            // remove all other nodes' hover event lisener and class
            $('.node-hover').off("click");
            $('.node-hover').removeClass("node-hover");

            var startNode = _this.board.nodeList[parseInt($(this).attr("id"))];
            // loop over this startNode adj node
            for (var j = 0; j < startNode.adjNode.length; j++) {
                $(`#${startNode.adjNode[j]}`).css("visibility", "visible");
                $(`#${startNode.adjNode[j]}`).addClass("node-hover");
            }

            // all the .node-hover class are now the starting node's adj nodes
            // assign all them the function for selection
            $(".node-hover").on("click", function () {
                // get the click point's location (end node)
                var id = parseInt($(this).attr("id"));
                var x2 = parseInt($(this).find(".node-circle").attr("cx"));
                var y2 = parseInt($(this).find(".node-circle").attr("cy"));
                // console.log(`${x1},${y1}`);
                // console.log(`${x2},${y2}`);
                if (cost(_this.players.currentPlayer, { wood: 1, brick: 1 })) {
                    _this.draw(x1, y1, x2, y2); // draw the "road" (x1,y1)->(x2,y2)
                    // deduct the resource from the player)
                    // remove these nodes from their adj list
                    _this.board.nodeList[id].adjNode.splice(_this.board.nodeList[id].adjNode.indexOf(startNode.id), 1);
                    startNode.adjNode.splice(startNode.adjNode.indexOf(id), 1);

                    // add this node to the player road node list
                    // console.log(_this);
                    _this.players.currentPlayer.addRoad(_this.board.nodeList[id]);
                } else {
                    console.log("not enought matrial")
                }

                // process complete                      
                $('.node').css("visibility", "hidden");
                $('.btn-on').removeClass('btn-on');
            });

        });    // give these node the event listener



        // assgin canel button
        $('.btn-cancel').off("click");
        $('.btn-cancel').on("click", this.cancel);
    }

    /* build button function*/
    build() {
        var _this = this;
        console.log("buildhouse");
        this.cancel();
        // find potentail spot for house building
        // spot must be road node
        $('.btn-build').addClass('btn-on');
        var spot = this.players.currentPlayer.roadNode;
        for (var i = 0; i < spot.length; i++) {
            // spot cannot be house node
            if (spot[i].owner === "") {
                // it adj node cannot have house
                var adj = getAdjecentNode(spot[i].id);
                var pass = true;
                for (var j = 0; j < adj.length; j++) {
                    if (_this.board.nodeList[adj[j]].house != 0) {
                        pass = false;
                        break
                    }
                }
                if (pass) {
                    $(`#${spot[i].id}`).addClass("spot");
                }
            }
        }

        $('.spot').css("visibility", "visible");
        $('.spot').on("click", function () {
            if (_this.board.nodeList[parseInt($(this).attr("id"))].build(_this.players.currentPlayer)) {
                // add this node to its adjacent tile
                var tile = _this.board.nodeList[parseInt($(this).attr("id"))].tile; // this node's adjacent tile coordinate
                for (var i = 0; i < tile.length; i++) {
                    var tileID = coord2ID(tile[i]);
                    _this.board.tileList[tileID].addNode(_this.board.nodeList[parseInt($(this).attr("id"))]);
                }

                // change this node class and style
                $(`#${this.id}`).removeClass("node");
                $(`#${this.id}`).removeClass("spot");
                $(`#${this.id}`).off("click");
                $(`#${this.id}`).css({
                    "fill": _this.players.currentPlayer.color, "stroke": "white",
                    "stroke-width": "4px",
                    "visibility": "visible",
                    "opacity": 1
                });
                $(`#${this.id} .shadow`).css("visibility", "hidden");
            }

            $('.spot').off("click");
            $('.spot').css("visibility", "hidden");
            $(".spot").removeClass("spot");

            $('.btn-on').removeClass('btn-on');
        });

        // assign cancel butotn
        $('.btn-cancel').on("click", _this.cancel);
    }

    /* upgrad button function*/
    upgrade() {
        console.log("upgrade");
        this.cancel();
        $('.btn-upgrade').addClass('btn-on');
        var _this = this;
        // show the current player's house node
        var house = _this.players.currentPlayer.houseNode;
        for (var i = 0; i < house.length; i++) {
            $(`#${house[i].id}`).addClass("house node-hover");
        }

        $('.house .shadow').css({ "visibility": "visible", "opacity": "0.8" });

        $('.house').on("click", function () {
            var nid = parseInt($(this).attr("id"));
            if (_this.board.nodeList[nid].upgrade(_this.players.currentPlayer)) {
                // change the node appreaence
                $(`#${nid}`).empty();
                var x = _this.board.nodeList[nid].location[0];
                var y = _this.board.nodeList[nid].location[1];
                $(`#${nid}`).html(`
                    <rect class="node-rect" x=${x-10} y=${y-10} width="20" height="20" />
                    <rect class ="shadow" x=${x-15} y=${y-15} width="30" height ="30" fill="#ffffe6"/>
                `);
            }

            $('.house').off("click");
            $('.node-hover').removeClass("node-hover");
            $('.house .shadow').css("visibility", "hidden");
            $('.house').removeClass("house");
            $('.btn-on').removeClass('btn-on');
        });


        $('.btn-cancel').on("click", _this.cancel);

    }


    /* use 4 same resource to get 1 specific resource*/
    trade() {
        var _this = this;
        var option = $('<div>');
        var get = $('<div>');
        console.log("trade!")
        // show the trade panel in the center of the screen
        var myResource = this.players.currentPlayer.myResource();
        var keys = Object.keys(myResource);
        for (var i = 0; i < keys.length; i++) {
            if (myResource[keys[i]] >= 4) {
                option.append(`
                    <div>
                        <img class="icon option" name=${keys[i]} src="assets/images/icons_resource/${keys[i]}.png">
                        <span>${myResource[keys[i]]}</span>
                    <div>
                `)
            } else {
                option.append(`
                    <div style="visibility:hidden">
                        <img class="icon">
                    <div>
                `)
            }
        }

        var rList = ["wood", "brick", "stone", "grain", "wool"];
        for (var i = 0; i < rList.length; i++) {
            get.append(`
                <div style="display:block">
                    <img class="icon res" name=${rList[i]} src="assets/images/icons_resource/${rList[i]}.png">
                </div>  
            `)
        }

        var tr = $('<div>').addClass("trade_panel");
        tr.html(`
            <div> 4  <img class="give" style="border:2px solid red"> ==> <img class="get" style="border:2px solid green"> </div>
            <div style="margin-bottom:20px; margin-top:20px">
                <div style="display:inline-block; margin-right:30px">${option.html()}</div>
                <div style="display:inline-block">${get.html()}</div>
            </div>
            <button class="btn btn-trade-cancel"> Cancel </button>
            <button class="btn btn-trade-confirm"> Confirm </button>
        `);

        $('#main_panel').append(tr);

        $('.option').on("click", function () {
            $('.give').attr("src", $(this).attr("src"));
            $('.give').attr("name", $(this).attr("name"));
        });


        $('.res').on("click", function () {
            $('.get').attr("src", $(this).attr("src"));
            $('.get').attr("name", $(this).attr("name"));
        });


        $('.btn-trade-confirm').on("click", function () {
            var give = $('.give').attr("name");
            var get = $('.get').attr("name");
            cost(_this.players.currentPlayer, { [give]: 4 });
            _this.players.currentPlayer.getResource({ [get]: 1 });
            $('.trade_panel').remove();
        });

        $('.btn-trade-cancel').on("click", function () {
            $('.trade_panel').remove();
        });
    }


    next() {
        console.log("next!")
        this.cancel();
        console.log(`before:${this.players.currentPlayer.id}`);
        $(`#player-${this.players.currentPlayer.id}`).css("font-weight", "normal");
        this.players.nextPlayer();
        console.log(`after:${this.players.currentPlayer.id}`);
        $(`#player-${this.players.currentPlayer.id}`).css("font-weight", "bold");
        $('.dice').empty();

        $('.btn').off("click");
        $('.btn-roll').on("click", () => { this.roll() });
    }


    cancel() {
        // console.log("cancel!")
        $('.btn').removeClass('btn-on');
        $('.node').off("click");
        $('.node-hover').off("click");
        $('.node-hover').removeClass("node-hover");
        $('.spot').off("click");
        $('.spot').removeClass("spot");
        $('.house').off("click");
        $('.house').removeClass("house");
        $('.node').css("visibility", "hidden");
    }

    /* allow player to set house at any node to start*/
    initial(house) {
        var _this = this;
        $('.node').css("visibility", "visible");
        // console.log(house);
        if (house == undefined) {
            var house = [];
        } else {
            for (var i = 0; i < house.length; i++) {
                $(`#${house[i]}`).off("click");
                var houseAdj = getAdjecentNode(house[i]);
                for (var j = 0; j < houseAdj.length; j++) {
                    // console.log(`off ${houseAdj[j]}`);
                    $(`#${houseAdj[j]}`).off("click");
                    $(`#${houseAdj[j]}`).css("visibility", "hidden");
                }
            }
        }

        $('.node').on("click", function () {
            var thisID = parseInt($(this).attr("id"));
            // console.log(_this.players.currentPlayer);
            _this.board.nodeList[thisID].build(_this.players.currentPlayer);
            // add this node to its adjacent tile
            var tile = _this.board.nodeList[parseInt($(this).attr("id"))].tile; // this node's adjacent tile coordinate
            for (var i = 0; i < tile.length; i++) {
                var tileID = coord2ID(tile[i]);
                _this.board.tileList[tileID].addNode(_this.board.nodeList[parseInt($(this).attr("id"))]);
            }

            // change this node class and style
            $(`#${thisID}`).off("click");
            $(`#${thisID}`).removeClass("node");
            $(`#${thisID}`).css({
                "fill": _this.players.currentPlayer.color, "stroke": "white",
                "stroke-width": "4px",
                "visibility": "visible",
                "opacity": 1
            });
            $(`#${thisID} .shadow`).css("visibility", "hidden");

            house.push(thisID);
            var thisAdj = getAdjecentNode(thisID);
            // console.log(thisID);
            // console.log(thisAdj);
            for (var j = 0; j < thisAdj.length; j++) {
                $(`#${thisAdj[j]}`).css("visibility", "hidden");
            }

            if (_this.players.currentPlayer.house[0] === 2) {
                // move to next player
                $('.node').off("click");
                // make all node invisible
                $('.node').css("visibility", "hidden");
                // check if it go to the end
                if (_this.players.nextPlayer().id != 0) {
                    // console.log("next player")
                    _this.initial(house);

                } else {
                    // console.log("initialization process done!");
                    /* roll button*/
                    $('.btn-roll').on("click", () => { _this.roll() });
                    // console.log("process done. activate roll");
                }
            }
        });



    }


    /* Display the control panel
    */
    display() {
        $('#main_panel').append(`
        <div class="control_panel">
            ${this.panel.html()}
        </div>
    `);
        for (var i = 0; i < this.players.nPlayer; i++) {
            this.players.list[i].updateResource();
        }
        $(`#player-${this.players.currentPlayer.id}`).css("font-weight", "bold");
    }


    /*----------------------------------------------Helper function------------------------------------------*/



    /* helper function, draw a line between (x1,x2) and (x2,y2) and update the svg
    */
    draw(x1, y1, x2, y2) {
        // get the vector (x1,y1)->(x2,y2)
        var ux = x2 - x1;
        var uy = y2 - y1;

        // get the unit vector
        ux /= this.board.tileSize;
        uy /= this.board.tileSize;

        // scale factor
        var a = 10;

        // adjust the end points of this line
        // do not want it cover the node svg element (for node click event)
        $("#board").append(`<line x1=${x1 + a * ux} y1=${y1 + a * uy} x2=${x2 - a * ux} y2=${y2 - a * uy} stroke-width="10" stroke=${this.players.currentPlayer.color}/>`);
        // refresh the svg
        $('#board').html($('#board').html() + "");
    }

}





















