import {DiscreteScalarField} from "../../../src/index.js";

export class DiamondSquareOperator {
    constructor({
        roughness = 1,
        amplitude = 100
    } = {}) {
        this._roughness = roughness;
        this._amplitude = amplitude;
    }

    apply(field) {
        const size = field.nx - 1;

        // corners
        field.setValueAt(0, 0, 0);
        field.setValueAt(size, 0, 0);
        field.setValueAt(0, size, 0);
        field.setValueAt(size, size, 0);

        let step = size;
        let scale = this._amplitude;

        while (step > 1) {
            const half = step >> 1;

            //
            // diamond step
            //
            for (let x = half; x < size; x += step)
                for (let y = half; y < size; y += step) {
                    const average = 0.25 * (
                        field.valueAt(x - half, y - half) +
                        field.valueAt(x + half, y - half) +
                        field.valueAt(x - half, y + half) +
                        field.valueAt(x + half, y + half)
                    );

                    field.setValueAt(x, y, average + this.#random(scale));
                }

            //
            // square step
            //
            for (let x = 0; x <= size; x += half)
                for (let y = (x + half) % step; y <= size; y += step) {
                    let sum = 0;
                    let count = 0;

                    if (x >= half) {
                        sum += field.valueAt(x - half, y);
                        count++;
                    }

                    if (x + half <= size) {
                        sum += field.valueAt(x + half, y);
                        count++;
                    }

                    if (y >= half) {
                        sum += field.valueAt(x, y - half);
                        count++;
                    }

                    if (y + half <= size) {
                        sum += field.valueAt(x, y + half);
                        count++;
                    }

                    field.setValueAt(x, y, sum / count + this.#random(scale));
                }

            step >>= 1;
            scale *= Math.pow(2, -this._roughness);
        }
    }

    #random(scale) { return (Math.random() * 2 - 1) * scale; }
}

const field = new DiscreteScalarField({
    nx: 257,
    ny: 257
});

field.apply(new DiamondSquareOperator({
    amplitude: 50,
    roughness: 1.1
}));

