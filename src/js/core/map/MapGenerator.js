    // load the map from json file to initializes the interactable elements
    async loadMapFromJson(path) {
        // load the json file
        try {
            const response = await fetch(path); // Path to your file
            const data = await response.json();

            // parse tiles
            // first check if range is defined, and generate tiles with default
            if (data.tiles.range.q !== undefined && data.tiles.range.r !== undefined && data.tiles.range.s !== undefined) {
                let qRange = data.tiles.range.q;
                let rRange = data.tiles.range.r;
                let sRange = data.tiles.range.s;
                let default_terrain = data.tiles.defaults.terrainType;
                let default_numberToken = data.tiles.defaults.numberToken;

                // check validity of default resource and numberToken
                if (typeof default_numberToken !== 'number' && default_numberToken !== null) {
                    throw new Error(`Invalid default token number: ${default_numberToken}`);
                }

                for (let q = qRange[0]; q <= qRange[1]; q++) {
                    for (let r = rRange[0]; r <= rRange[1]; r++) {
                        for (let s = sRange[0]; s <= sRange[1]; s++) {
                            const hCoord = [q, r, s];
                            if (HexUtils.isValidHex(hCoord)) { // valid hex coordinate
                                this.updateTileByCoord(hCoord, default_terrain, default_numberToken);
                            }
                        }
                    }
                }
            }

            // then override with specific tiles
            for (let terrainData of data.tiles.overrides) {
                this.updateTileByCoord(terrainData.coord, terrainData.type, terrainData.numberToken);
            }

            // parse tradingposts
            for (let tpData of data.tradingposts.overrides) {
                this.updateTradingPostByCoord(tpData.coord, tpData.indexList, tpData.tradeList);
            }

            this.allVertexIdSet = this.getAllVertexIdSet();
            this.allEdgeIdSet = this.getAllEdgeIdSet();

            this.initialized = true;

        } catch (error) {
            console.error('Error loading JSON:', error);
        }
    }

    convertMapToJson() {
        // only need to save the overridden tiles, roads, and settlements
        let data = {
            tiles: {
                overrides: []
            },
            roads: {
                overrides: []
            },
            settlements: {
                overrides: []
            },
            tradingposts: {
                overrides: []
            }
        };

        // save tiles
        for (let [id, tile] of this.tiles) {
            data.tiles.overrides.push({ "coord": tile.coord, "type": tile.type, "numberToken": tile.numberToken });
        }
        // save roads
        for (let [id, road] of this.roads) {
            data.roads.overrides.push({ "coord": road.coord, "owner": road.owner });
        }
        // save settlements
        for (let [id, settlement] of this.settlements) {
            data.settlements.overrides.push({ "coord": settlement.vertex.coord, "owner": settlement.owner, "level": settlement.level });
        }
        // save trading posts
        for (let [id, tradingPost] of this.tradingPosts) {
            data.tradingposts.overrides.push({ "coord": tradingPost.coord, "indexList": tradingPost.indexList, "tradeList": tradingPost.tradeList });
        }

        let json_str = JSON.stringify(data, null, 2); // pretty print with 2 spaces indentation

        // download the json file
        return json_str;

    }



        /* -------------------------------------------- Service Functions-------------------------------------------- */
    
        /**
         * Shuffles a distribution and applies it to the map.
         * If a tile doesn't exist at the target coordinate, it can be created.
         * @param {Array} targetCoords - An array of hex coordinates where tiles should be assigned.
         * @param {Object} attributeDist - An object mapping tile attributes (terrainType, numberToken) to their counts.
         * @param {Object} attributeType - The type of attribute being assigned ('terrainType' or 'numberToken').
         */
        assignTerrainAttributeRandom(targetCoords, attributeDist, attributeType) {
            // Sanity check for attributeType
            if (attributeType !== 'terrainType' && attributeType !== 'numberToken') {
                throw new Error("attributeType must be either 'terrainType' or 'numberToken'");
            }
    
            // 1. Create the shuffled pool
            const attributePool = Object.entries(attributeDist).flatMap(([type, count]) =>
                Array(count).fill(type)
            );
    
            // check pool size matches
            if (attributePool.length !== targetCoords.length) {
                throw new Error(`Terrain ${attributeType} pool size (${attributePool.length}) does not match target coordinates size (${targetCoords.length}).`);
            }
    
    
            // shuffle the pool
            this.rng.shuffle(attributePool);
            const assignTerrain = attributeType === 'terrainType';
            // 2. Apply as overrides
            targetCoords.forEach((coord, i) => {
                const id = HexUtils.coordToId(coord); // Assuming you have a helper for [q,r,s] -> "q,r,s"
                const val = (assignTerrain ? attributePool[i] : Number(attributePool[i]));
    
                if (this.tiles.has(id)) {
                    // Update existing
                    const tile = this.tiles.get(id);
                    if (assignTerrain) {
                        tile.updateTerrainType(val);
                    } else {
                        // convert val to number
                        tile.updateNumberToken(val);
                    }
                } else {
                    // create new tile
                    this.tiles[id] = new Tile({
                        coord: coord,
                        terrainType: assignTerrain ? val : 'desert', // default to 'desert'
                        numberToken: !assignTerrain ? val : 0
                    });
                }
            });
        }
    
        assignTerrainTypesRandom(targetCoords, typeDist) {
            this.assignTerrainAttributeRandom(targetCoords, typeDist, 'terrainType');
        }
    
        assignNumberTokensRandom(targetCoords, numberTokenDist) {
            this.assignTerrainAttributeRandom(targetCoords, numberTokenDist, 'numberToken');
        }
    
        swapTerrainById(idA, idB, swapResources = true, swapTokens = true) {
            const tileA = this.tiles[idA];
            const tileB = this.tiles[idB];
    
            if (!tileA || !tileB) {
                console.warn(`Cannot swap: one or both tiles do not exist (${idA}, ${idB})`);
                return;
            }
    
            // Swap resources
            if (swapResources) {
                const tempResource = tileA.resource;
                tileA.resource = tileB.resource;
                tileB.resource = tempResource;
            }
    
            // Swap tokens (if you are using them)
            if (swapTokens) {
                const tempToken = tileA.numberToken;
                tileA.numberToken = tileB.numberToken;
                tileB.numberToken = tempToken;
            }
        }