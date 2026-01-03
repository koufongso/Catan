export const ResourceType = Object.freeze({
    WOOD: 'WOOD',
    ROCK: 'ROCK',
    BRICK: 'BRICK',
    SHEEP: 'SHEEP',
    WHEAT: 'WHEAT',
    DESERT: 'DESERT',

    // The Validity Checker
    isValid(type) {
        return Object.values(this).includes(type);
    },

    // The Safe Converter
    from(type) {
        const upperType = type?.toUpperCase();
        if (this.isValid(upperType)) {
            return upperType;
        }
        // Handle the "Wrong Type" case
        console.warn(`Invalid Resource: "${type}". Defaulting to DESERT.`);
        return this.DESERT;
    }
});