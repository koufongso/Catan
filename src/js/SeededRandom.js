export class SeededRandom {
    constructor(seed = Date.now()) {
        // We hash the seed if it's a string to get a number
        this.seed = typeof seed === 'string' ? this.hashString(seed) : seed;
    }

    // A simple hash function for string seeds
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    // Returns a float between 0 and 1
    next() {
        // Standard LCG parameters (used by glibc)
        this.seed = (this.seed * 1103515245 + 12345) % 2147483648;
        return this.seed / 2147483648;
    }

    // Returns an integer between min and max (inclusive)
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
}