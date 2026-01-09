export class Dice {
    constructor(rng) {
        this.rng = rng; // an instance of SeededRandom
        this.currentRoll = []; // Store individual dice for UI/debug
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
        this.currentRoll = newValues;
        this.sum = newSum;
        return this.sum;
    }

    getCurrent() {
        return {
            values: this.currentRoll,
            sum: this.sum
        };
    }
}