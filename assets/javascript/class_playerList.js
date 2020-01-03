class playerList {
    constructor(nPlayer) {
        this.nPlayer = nPlayer;  // num of players
        this.list = [];          // player list

        // connect player
        for (var i = 0; i < nPlayer; i++) {
            this.list.push(new player(i, { wood: 8, brick: 8, stone: 4, grain: 6, wool: 6 }));
        }


        // connect player
        for (var i = 0; i < nPlayer - 1; i++) {
            this.list[i].next = this.list[i + 1];
        }

        // console.log(this.list);
        this.list[i].next = this.list[0];
        this.currentPlayer = this.list[0];
    }


    nextPlayer() {
        this.currentPlayer = this.currentPlayer.myNext();
        return this.currentPlayer;
    }
}