import {LaplaceOperator} from "./operators.js";
import {Slider} from "../../core/controls.js";
import {Range} from "./math.js";

export class BarrierWaveEquation {
    constructor({
        obstacleField,
        velocity = 1,
        damping = 0.1
    } = {}) {
        this._velocity = velocity;
        this._damping = damping;
        this._obstacleField = obstacleField;
    }

    get damping() { return this._damping; }

    acceleration(field, i, j) {
        const transmission = 1.0 - this._obstacleField.valueAt(i, j);
        //const transmission = Math.exp(-1e2 * this._obstacleField.valueAt(i, j));
        return transmission * this._velocity * this._velocity * LaplaceOperator.at(field, i, j);
    }

    controls() {
        return new Slider("💤 Damping")
            .withValue(this._damping * 100)
            .withRange(new Range(0, .1, 1e-4))
            .addEventListener("input", event => this._damping = Number(event.target.value) / 100)
    }
}