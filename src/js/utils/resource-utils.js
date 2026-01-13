import { ResourceType } from '../constants/ResourceType.js';

const VALID_RESOURCES = new Set(Object.values(ResourceType));

export const ResourceUtils = {
    /**
     * Checks if a string is a valid Catan resource
     */
    isValid(type) {
        return VALID_RESOURCES.has(type);
    },

    /**
     * Normalizes input and returns a valid ResourceType or null
     */
    from(type) {
        if (!type) return null;
        const normalized = type.toLowerCase();
        return this.isValid(normalized) ? normalized : null;
    }
};