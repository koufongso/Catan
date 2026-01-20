export const DEV_CARD_TYPES = {
    KNIGHT: 'knight',
    VICTORY_POINT: 'victory_point',
    ROAD_BUILDING: 'road_building',
    YEAR_OF_PLENTY: 'year_of_plenty',
    MONOPOLY: 'monopoly'
};

// for UI display and descriptions
export const DEV_CARD_INFO = {
    [DEV_CARD_TYPES.KNIGHT]: {
        name: 'Knight',
        description: 'Move the robber and steal 1 resource.',
    },
    [DEV_CARD_TYPES.VICTORY_POINT]: {
        name: 'Victory Point',
        description: 'Gives you 1 permanent point.',
    },
    [DEV_CARD_TYPES.ROAD_BUILDING]: {
        name: 'Road Building',
        description: 'Build 2 roads for free.',
    },
    [DEV_CARD_TYPES.YEAR_OF_PLENTY]: {
        name: 'Year of Plenty',
        description: 'Draw 2 resource cards.',
    },
    [DEV_CARD_TYPES.MONOPOLY]: {
        name: 'Monopoly',
        description: 'Choose a resource type and collect all of that resource.',
    }
};

// Standard Catan Deck Distribution
export const DEV_CARD_DISTRIBUTION = [
    { type: DEV_CARD_TYPES.KNIGHT, count: 14 },
    { type: DEV_CARD_TYPES.VICTORY_POINT, count: 5 },
    { type: DEV_CARD_TYPES.ROAD_BUILDING, count: 2 },
    { type: DEV_CARD_TYPES.YEAR_OF_PLENTY, count: 2 },
    { type: DEV_CARD_TYPES.MONOPOLY, count: 2 }
];


export const PLAYERABLDE_DEVCARDS = [
    DEV_CARD_TYPES.KNIGHT,
    DEV_CARD_TYPES.ROAD_BUILDING,
    DEV_CARD_TYPES.YEAR_OF_PLENTY,
    DEV_CARD_TYPES.MONOPOLY
];