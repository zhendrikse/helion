import {MathPhysicsModelBehavior} from "../../core/helion.js";
import {Complex, Vec3} from "../math/math.js";

export class OneDimensionalPlaneWave extends MathPhysicsModelBehavior {
    static c = 3e8;

    constructor({
        position = new Vec3(),
        amplitude = 1,
        lambda = 2,
        omega = 2 * Math.PI * OneDimensionalPlaneWave.c / lambda
    } = {}) {
        super();
        this.position = position.clone();
        this.amplitude = amplitude;
        this.omega = omega;
        this._lambda = lambda;
        this._time = 0;
        this._k = 2 * Math.PI / lambda;
    }

    set lambda(lambdaValue) { this._lambda = lambdaValue; this._k = 2 * Math.PI / lambdaValue; }
    set k(kValue) { this._k = kValue; this._lambda = kValue / 2 * Math.PI; }
    get lambda() { return this._lambda; }
    get k() { return this._k; }

    propagate(t) { this._time = t; }

    valueAt(x) {
        return this.amplitude * Math.cos(this.k * x - this.omega * this._time);
    }
}

export class OneDimensionalComplexPlaneWave extends OneDimensionalPlaneWave {
    constructor({
        position = new Vec3(),
        amplitude = 1,
        lambda = 2,
        omega = 3 * Math.PI
    } = {}) {
        super({position, amplitude, lambda, omega });
    }

    valueAt(x) {
        const phase = this.k * x - this.omega * this._time;
        return new Complex( Math.cos(phase) * this.amplitude, Math.sin(phase) * this.amplitude);
    }
}
