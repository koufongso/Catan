var availableResource = ["wood", "wood", "wood", "wood",
    "brick", "brick", "brick",
    "stone", "stone", "stone",
    "grain", "grain", "grain", "grain",
    "wool", "wool", "wool", "wool"]; // total resource


var dice = [2, 3, 3, 4, 4, 5, 5, 6, 6,7, 8, 8, 9, 9, 10, 10, 11, 11, 12]; // all possible dice value

var players;
var myBoard;
var myControl;


function startGame(nPlayer) {
    myBoard = new board(3, 60, dice, availableResource); // be sure dice has enough number!
    myBoard.display();
    players = new playerList(nPlayer);
    myControl = new control(myBoard,players);
    myControl.display();
    myControl.initial();
}

startGame(2);

