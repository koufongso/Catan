// and manges the tiles and maintain their coordinates
// Arguments:
//   seed: integer seed for random generation
//   layout: an list of grid (id, coordinates pair) that need resources
//   strategy: strategy for placing tiles
// Returns:
//   a Map object with 
function generateMap(seed, layout, strategy) {
        this.seed = seed;
        this.layout = layout; // layout type (e.g., 6 for standard Catan)
        this.tiles = [];
}
