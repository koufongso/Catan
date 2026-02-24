import { HexUtils } from "./HexUtils.js";

export const RoadUtils = {
    /**
     * Get a set of adjacent road IDs that are directly connected to the given road ID.
     * @param {Array || string} roadLocation
     * @param {Object} player Optional player object to filter adjacent roads that belong to the player. If null, returns all adjacent roads regardless of ownership.
     * @returns {Set} A set of adjacent road IDs
     */
    getAdjacentRoads: (roadLocation, player = null) => {
        const eCoord = Array.isArray(roadLocation) ? roadLocation : HexUtils.idToCoord(roadLocation);
        const eId = HexUtils.coordToId(eCoord);

        let adjacentRoadIds = new Set();
        // get the two vertices that this road connects
        const vertices = HexUtils.getVerticesFromEdge(eCoord);
        vertices.forEach(vertex => { // get the roads connected to each vertex, excluding the original road 
            const adjRoadCoords = HexUtils.getAdjEdgesFromVertex(vertex);
            adjRoadCoords.forEach(adjRoadCoord => {
                const adjRoadId = HexUtils.coordToId(adjRoadCoord);
                if (adjRoadId !== eId && (player === null || player.roads[adjRoadId])) {
                    adjacentRoadIds.add(adjRoadId); // add to set, automatically handles duplicates
                }
            });
        });
        return adjacentRoadIds;
    },

    /**
     * BFS to get all connected roads starting from a given road ID. Returns a Set of road IDs in the same connected component.
     */
    getAllConnectedRoadsBFS: (roadLocation, player) => {
        const roadId = typeof roadLocation === 'string' ? roadLocation : HexUtils.coordToId(roadLocation);

        const visited = new Map(); // all the visted road IDs and the number of connected roads
        const queue = [roadId]; // this is the road id, not coord

        while (queue.length > 0) {
            const currentRoadId = queue.shift();
            // Get adjacent roads that are connected to the current road
            const adjacentRoadIds = RoadUtils.getAdjacentRoads(currentRoadId, player);
            let connectedCount = 0;
            adjacentRoadIds.forEach(adjRoadId => {
                connectedCount++; // count the number of connected roads for the current road (including vistied and unvisited)
                if (!visited.has(adjRoadId)) {
                    queue.push(adjRoadId); // add to queue for BFS
                }
            });
            visited.set(currentRoadId, connectedCount); // mark as visited and store the number of connected roads
        }

        return visited;
    },
    /**
     * Get a list of the starting roards from a player's road assets
     * The staring roads should either be a "dead end" road (connected to only 1 road) 
     * or
     * a road in a circle (connected to 2 roads that are also connected to each other).
     * Each group/cluster will randomly pick one of the starting roads as the starting point for longest road calculation. 
     * @param {*} player 
     * @return {Set} Set of road IDs that are the starting roads for longest road calculation
     */
    _getStartingRoads(player) {
        // create a copy of reamining roads
        let remainingRoads = new Set(structuredClone(Object.keys(player.roads))); // this is a set of road IDs
        let startingRoads = new Set();

        while (remainingRoads.size > 0) {
            const roadId = remainingRoads.values().next().value;
            const connectedRoads = this.getAllConnectedRoadsBFS(roadId, player); // get all connected roads in the same cluster/group

            // iterate to remove roads and get road with only 1 connection (dead end)
            // if no road with only 1 connection, then we have a circle and we can start from any road in the circle, so we just pick the first one
            let startingRoad = null;
            for (let [roadId, connectionCount] of connectedRoads) {
                remainingRoads.delete(roadId); // remove from remaining roads
                if (connectionCount === 1) {
                    startingRoad = roadId;
                    startingRoads.add(startingRoad); // we need to try all the dead ends as starting roads to ensure we get the correct longest path in cases where there are branches of different lengths
                }
            }

            if (startingRoad === null) {
                startingRoad = connectedRoads.keys().next().value; // if no dead end, pick the first road in the connected roads set
            }

            
        }
        return startingRoads;
    },

    /**
     * Using Dynamic Programming to calculate the longest path starting from a given road. Returns the length of the longest path.
     * The longest path  = current path length + longest path from the branches
     * @param {*} roadLocation 
     * @param {*} player 
     * @param {*} visited_parent visited roads from it parents, no need to worry abou the starting road
     * @param {*} noEnterRoad the road that we are not allowed to enter for 1 step, used for handling the case of circles where we want to prevent going back to the other branch
     */
    findLongestPathDP(roadLocation, player, visited, noEnterRoads = null) {
        const roadId = typeof roadLocation === 'string' ? roadLocation : HexUtils.coordToId(roadLocation);

        // just add roadLocation to ensure it is included in the visited set
        visited.add(roadId); // mark the current road as visited

        let longestPath = 1; // longest base for the current "session", there is always a starting road so start with 1

        // get adjacent road that are connected to the current road
        let adjacentRoadIds = RoadUtils.getAdjacentRoads(roadId, player);

        //remove visited in the current path to prevent cycles
        visited.forEach(roadId => {
            adjacentRoadIds.delete(roadId); 
        });

        // remove the noEnterRoad to prevent going back to the other branch in case of circles
        // but can be enter after 1 step in case there is cycle
        if (noEnterRoads) {
            noEnterRoads.forEach(noEnter => {
                adjacentRoadIds.delete(noEnter);
            });
        }

        // continously traverse down as long as there is only one path to take (no branches)
        while (adjacentRoadIds.size <= 1) {
            if (adjacentRoadIds.size === 0) {
                return longestPath; // no more adjacent roads/reach dead end, return the longest path
            }
            const nextRoadId = adjacentRoadIds.values().next().value;
            visited.add(nextRoadId); // mark the next road as visited
            longestPath++; // increment the path length
            adjacentRoadIds.clear(); // clear adjacent roads for next iteration
            adjacentRoadIds = RoadUtils.getAdjacentRoads(nextRoadId, player);

            //remove visited in the current path
            adjacentRoadIds.forEach(roadId => {
                if (visited.has(roadId)) {
                    adjacentRoadIds.delete(roadId);
                }
            });
        }

        // reach here means there are branches, we need to explore each branch and take the max path
        if (adjacentRoadIds.size > 1) {
            const currentLength = longestPath; // this is the path length before the branch
            for (let nextRoadId of adjacentRoadIds) {
                const newVisited = new Set(structuredClone(visited)); // create a new visited set for each branch to prevent interference between branches
                
                // copy the other branch (excluding the current branch road/nextRoadId)
                let noEnterRoads = new Set(structuredClone(adjacentRoadIds)); // create a set of roads that are not allowed to be entered in the next step
                noEnterRoads.delete(nextRoadId); // remove the current road from noEnterRoads to allow entering it in the next step

                // the total path length for the current branch =  current legnth + longest path from the next road
                const branchLength = currentLength + this.findLongestPathDP(nextRoadId, player, newVisited, noEnterRoads);
                longestPath = Math.max(longestPath, branchLength);
            }
        }

        // there are branches and we have explored all branches, return the longest path
        return longestPath;
    },

    findLongestPath(player) {
        // 1. get all the starting roads (dead ends or circles)
        const startingRoads = this._getStartingRoads(player);
        console.log(`Player ${player.name} has starting roads: ${[...startingRoads].join(", ")}`);

        // 2. for each starting road, sesarch for the longest path using dynamic programming
        let longestPath = 0;
        for (let roadId of startingRoads) {
            const visited = new Set(); // create a visited set to prevent cycles, start with the current road
            const currentPathLength = this.findLongestPathDP(roadId, player, visited);
            longestPath = Math.max(longestPath, currentPathLength);
        }
        console.log(`Player ${player.name} has longest path: ${longestPath}`);
        return longestPath;
    }

}