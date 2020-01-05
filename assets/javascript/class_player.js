
class player {
    constructor(id, resource,color) {
        this.id = id;
        this.name = "Player " + id;
        this.color = color;
        this.resource = resource;
        this.houseNode = [];
        this.roadNode = [];     // nodes owned by this player that is a "road node"


        this.hands = [];
        this.vp = 0;            // victory point 
        this.vpc = [0, 0]       // vicotry point card [2pt,2pt]
        this.house = [0, 0];    // # of house this player own [#small,#big]
        this.road = 0;          // # of road this player own
        this.next;              // my next player
        this.pre;             // previous player
    }

    addRoad(node) { this.roadNode.push(node); }
    addHouse(node) { this.houseNode.push(node); }

    addCard(card) {
        this.hands.push(card);
    }

    checkHands() {
        return this.hands;
    }

    getResource(r) {
        // console.log("get resource");
        var keys = Object.keys(r);
        for (var i = 0; i < keys.length; i++) {
            this.resource[keys[i]] += r[keys[i]];
        }
        this.updateResource();
    }


    updateResource() {
        // console.log("update resource")
        $(`#player-${this.id} .val-wood`).text(`${(this.resource.wood)}`);
        $(`#player-${this.id} .val-wool`).text(`${(this.resource.wool)}`);
        $(`#player-${this.id} .val-stone`).text(`${(this.resource.stone)}`);
        $(`#player-${this.id} .val-brick`).text(`${(this.resource.brick)}`);
        $(`#player-${this.id} .val-grain`).text(`${(this.resource.grain)}`);
    }

    updateScore() { this.score = this.house[0] + 2 * this.house[1] + 2 * vpc[0] + 2 * vpc[1]; }

    myScore() { return this.score; }

    myNext() { return this.next; }

    myPre() {return this.pre;}

    myResource() {
        return this.resource;
    }

    /* give the 1 random resource*/
    random() {
        var giveAway = {};
        var keys = Object.keys(this.resource);              // all resource name

        for (var i = 0; i < keys.length; i++) {
            var rand = keys.splice(Math.floor(Math.random() * keys.length), 1); // randomly take out 1 resource
            if (this.resource[rand] != 0) {
                this.resource[rand]--;
                console.log(rand);
                this.updateResource()
                return { [rand]: 1 };
            }
        }
        this.updateResource();
        // no aviaiable resource
        return {}
    }

    /* check if player has at least n resource*/
    hasResource(n) {
        var keys = Object.keys(this.resource);              // all resource name
        for (var i = 0; i < keys.length; i++) {
            n -= this.resource[keys[i]];
            if(n<=0){
                return true;
            }
        }
        return false;
    }
}