var resourceList = ["wood", "brick", "stone", "grain", "wool", "desert", "sea"]; // tile type for rendering

var availableResource = ["wood", "wood", "wood", "wood",
    "brick", "brick", "brick",
    "stone", "stone", "stone",
    "grain", "grain", "grain", "grain",
    "wool", "wool", "wool", "wool",
    "desert"]; // total resource


var dice = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]; // all possible dice value

var tileLisener = { 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [] }; // inform the corresponding tiles when the dice hit the value 
var tileList = []; // store all the tiles
var nodeList = []; // store all the nodes

var players;
var myBoard;
var myControl;


function startGame(nPlayer) {
    myBoard = new board(3, 60); // be sure dice has enough number!
    myBoard.display();
    players = new playerList(nPlayer);
    myControl = new control(players);
    myControl.display();
    myControl.initial();
}

startGame(2);

