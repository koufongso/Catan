import { RESOURCE_TYPES } from '../constants/ResourceTypes.js';

const VALID_RESOURCES = new Set(Object.values(RESOURCE_TYPES));

export const ResourceUtils = {
    /**
     * Checks if a string is a valid Catan resource
     */
    isValid(type) {
        return VALID_RESOURCES.has(type);
    },

    /**
     * Normalizes input and returns a valid RESOURCE_TYPES or null
     */
    from(type) {
        if (!type) return null;
        const normalized = type.toLowerCase();
        return this.isValid(normalized) ? normalized : null;
    }
};