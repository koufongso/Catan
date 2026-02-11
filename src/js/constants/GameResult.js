export const GameResult = {
    // Factory for Success
    success: (payload = {}) => ({
        ok: true,
        ...payload
    }),

    // Factory for Error
    error: (code, message) => ({
        ok: false,
        code,    // e.g. 'NOT_ENOUGH_RESOURCES'
        message  // Human readable: "You need 1 more brick."
    })
};

// Error Codes (Strings are better than numbers for debugging!)
export const ErrorCodes = {
    INVALID_MOVE: 'INVALID_MOVE',
    NOT_ENOUGH_RESOURCES: 'NOT_ENOUGH_RESOURCES',
    NOT_YOUR_TURN: 'NOT_YOUR_TURN',
    GAME_OVER: 'GAME_OVER'
};