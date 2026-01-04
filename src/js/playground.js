import { Player } from "./player.js";
import { GameMap } from "./map/game_map.js";
import { ResourceType } from './map/resource_type.js';

// testing playground
let player1 = new Player("Alice");
let player2 = new Player("Bob");

// create a game map
let map = new GameMap();
await map.loadMapFromJson('src/assets/map_layout/standard_map.json');
// assign resources
map.assignResourceRandom(42, {
    [ResourceType.WOOD]: 4,
    [ResourceType.BRICK]: 3,
    [ResourceType.SHEEP]: 4,
    [ResourceType.WHEAT]: 4,
    [ResourceType.ROCK]: 3,
    [ResourceType.DESERT]: 1
});
// assign number tokens
map.assignNumberTokenRandom(42, [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12]);

// swap desert tile to the center
let desertTiles = map.searchTileByResource(ResourceType.DESERT);
map.swapTile(desertTiles[0], "0,0,0", true, true); 
// swap token 7 to the center tile
let token7Tiles = map.searchTileByNumberToken(7);
map.swapTile(token7Tiles[0], "0,0,0", false, true);

// the center tile should now be desert with token 7
console.log(map.convertMapToJson())
console.log(player1);
console.log(player2);


map.getSettlementByCoord([ -1, 1, 0 ]);