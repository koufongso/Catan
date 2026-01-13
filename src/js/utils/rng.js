/**
 * Custom Seeded Random Number Generator
 */
export class RNG {
    constructor(seed = Date.now()) {
        this.state = (typeof seed === 'string' ? this.hashString(seed) : seed);
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0; // Force 32-bit integer
        }
        return hash;
    }

    /**
     * Advances the internal state and returns a float [0, 1)
     */s
    next() {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * shuffles an array in place
     * @param {*} array 
     * @returns 
     */
    shuffle(array) {
        let currentIndex = array.length;
        while (currentIndex !== 0) {
            let randomIndex = Math.floor(this.next() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]
            ];
        }
    }
}