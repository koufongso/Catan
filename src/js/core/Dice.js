import { RNG } from '../utils/rng.js';

export class Dice {
    constructor(rng) {
        // check rng is an instance of RNG
        if (!(rng instanceof RNG)) {
            throw new Error("Dice requires an instance of RNG");
        }

        this.rng = rng; // an instance of RNG
        this.currentRolls = []; // Store individual dice
        this.sum = 0; // sum of the current roll
    }
    
    roll(nDice = 2) {
        let newSum = 0;
        let newValues = [];
        for (let i = 0; i < nDice; i++) {
            const val = this.rng.nextInt(1, 6);
            newValues.push(val);
            newSum += val;
        }
        this.currentRolls = newValues;
        this.sum = newSum;
        return this.getCurrentRolls();
    }

    getCurrentRolls() {
        return {
            values: this.currentRolls,
            sum: this.sum
        };
    }
}