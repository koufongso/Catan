// utils/PlayerUtils.js

export const PlayerUtils = {
    // --- Asset Management (The changed part) ---
    canBuild: (player, buildingType) => {
        switch (buildingType) {
            case 'SETTLEMENT': return player.settlementsLeft > 0;
            case 'CITY': return player.citiesLeft > 0;
            case 'ROAD': return player.roadsLeft > 0;
            default: throw new Error(`Invalid building type: ${buildingType}`);
        }
    },

    addSettlement: (player, settlementId) => {
        // Use ID as key. Value can just be true.
        if (!player.settlements[settlementId]) {
            player.settlements[settlementId] = true;
            player.settlementsLeft--;
        }
    },

    addRoad: (player, roadId) => {
        if (!player.roads[roadId]) {
            player.roads[roadId] = true;
            player.roadsLeft--;
        }
    },

    addCity: (player, cityId) => {
        // Upgrade logic: Remove from settlements, add to cities
        if (player.settlements[cityId]) {
            delete player.settlements[cityId]; // The 'Set.delete' equivalent
            player.settlementsLeft++;
        }

        if (!player.cities[cityId]) {
            player.cities[cityId] = true;
            player.citiesLeft--;
        }
    },

    hasAsset: (player, type, id) => {
        // specific check helper
        if (type === 'road') return !!player.roads[id];
        if (type === 'settlement') return !!player.settlements[id];
        if (type === 'city') return !!player.cities[id];
        return false;
    },

    // --- Data Retrieval ---


    /**
     * Get Set of vertex IDs (derived from settlement keys)
     */
    getSettlementVerticesIdSet: (player) => {
        // Since the keys ARE the vertex IDs, we just return them
        // If you specifically need a Set object for math operations:
        return new Set(Object.keys(player.settlements));
    },

    getDevCards: (player) => {
        return player.devCards || [];
    },

    getResources(player) {
        return player.resources || {};
    },

    // --- Resource Management (Unchanged logic, just adapted style) ---

    canAfford: (player, cost) => {
        for (const [type, amount] of Object.entries(cost)) {
            if ((player.resources[type] || 0) < amount) return false;
        }
        return true;
    },

    addResources: (player, resources, allowNegative = false) => {
        for (const [type, amount] of Object.entries(resources)) {
            const current = player.resources[type] || 0;
            player.resources[type] = allowNegative ? current + amount : Math.max(0, current + amount);
        }
        player.totalResourceCount = null; // Invalidate cache
    },

    deductResources: (player, cost, allowNegative = false) => {
        for (const [type, amount] of Object.entries(cost)) {
            const current = player.resources[type] || 0;
            player.resources[type] = allowNegative ? current - amount : Math.max(0, current - amount);
        }
        player.totalResourceCount = null; // Invalidate cache
    },

    getTotalResourceCount: (player, type = null) => {
        if (type) return player.resources[type] || 0; // for specific type
        if (player.totalResourceCount === null) { // if null, compute and cache it
            player.totalResourceCount = Object.values(player.resources).reduce((a, b) => a + b, 0);
        }
        return player.totalResourceCount;
    },

    // --- Serialization ---

    serialize: (player, isPrivate = true) => {
        return {
            id: player.id,
            name: player.name,
            color: player.color,
            achievements: player.achievements,
            roadsLeft: player.roadsLeft,
            settlementsLeft: player.settlementsLeft,
            citiesLeft: player.citiesLeft,

            // Computed public info
            resourceCount: PlayerUtils.getTotalResourceCount(player),
            devCardCount: player.devCards.length,

            // Public assets (The raw objects are fine to send!)
            settlements: player.settlements,
            cities: player.cities,
            roads: player.roads,

            // Secret info
            resources: isPrivate ? null : player.resources,
            devCards: isPrivate ? null : player.devCards
        };
    },

    /**
     * Remove resources by their "virtual index" from the player's hand.
     * Useful for the Robber logic (stealing a random card).
     * * @param {Object} player - The player POJO
     * @param {Array<number>} indicies - Array of random indices to remove
     * @returns {Object} A map of removed resources { resourceType: amount }
     */
    removeResourceByIndicies: (player, indicies) => {
        // 1. Get all available resource types that have count > 0
        const resourceTypes = Object.keys(player.resources);

        // 2. Compute "Boundaries"
        // Example: If Wood=2, Brick=1
        // Boundaries: [0, 2, 3]
        // Indices 0,1 are Wood. Index 2 is Brick.
        const boundaries = [];
        let cumulative = 0;
        const toRemove = {};

        for (const type of resourceTypes) {
            boundaries.push(cumulative);
            cumulative += (player.resources[type] || 0);
            toRemove[type] = 0; // Initialize tally
        }
        boundaries.push(cumulative); // Final total count

        // 3. Tally which resources to remove based on random indices
        for (const index of indicies) {
            if (index < 0 || index >= cumulative) {
                console.error(`PlayerUtils: Invalid resource index ${index} for total ${cumulative}`);
                continue; // Skip invalid indices
            }

            let typeIndex = 0;
            // Find the bucket this index falls into
            // We increment typeIndex until the *next* boundary is greater than our index
            while (typeIndex < boundaries.length - 1 && index >= boundaries[typeIndex + 1]) {
                typeIndex++;
            }

            const type = resourceTypes[typeIndex];
            toRemove[type]++;
        }

        // 4. Execute the removal
        // We use our existing helper to ensure safety (not going below 0)
        PlayerUtils.deductResources(player, toRemove);

        // 5. Clean up the result (remove types with 0 count)
        // This makes the return value cleaner: { WOOD: 1 } instead of { WOOD: 1, BRICK: 0, ... }
        const finalRemoved = {};
        for (const [type, count] of Object.entries(toRemove)) {
            if (count > 0) {
                finalRemoved[type] = count;
            }
        }

        player.totalResourceCount = null; // Invalidate cache
        return finalRemoved;
    },

    addDevCard: (player, devCard) => {
        player.devCards.push(devCard);
    }
};