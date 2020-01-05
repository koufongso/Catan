class playerList {
    constructor(nPlayer) {
        this.nPlayer = nPlayer;  // num of players
        this.list = [];          // player list
        this.colorSet = ["red", "green", "blue", "yellow"];

        // connect player
        for (var i = 0; i < nPlayer; i++) {
            this.list.push(new player(i, { wood: 4, brick: 4, stone: 2, grain: 4, wool: 4 }, this.colorSet[i]));
        }


        // connect player
        for (var i = 0; i < nPlayer - 1; i++) {
            this.list[i].next = this.list[i + 1];
        }

        // console.log(this.list);
        this.list[i].next = this.list[0];


        for (var i = 1; i < nPlayer; i++) {
            this.list[i].pre = this.list[i - 1];
        }

        this.list[0].pre = this.list[nPlayer - 1];


        this.currentPlayer = this.list[0];
    }


    nextPlayer() {
        this.currentPlayer = this.currentPlayer.myNext();
        return this.currentPlayer;
    }

    prePlayer() {
        this.currentPlayer = this.currentPlayer.myPre();
        return this.currentPlayer;
    }
}