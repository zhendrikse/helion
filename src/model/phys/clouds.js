import { MathPhysicsModelBehavior } from "../../core/helion.js";
import { PhysicsState } from "./bodies.js";
import { Integrators } from "../math/numerics/integrators/integrators.js";

export class PointCloud extends MathPhysicsModelBehavior {
    constructor({
                    positions = [],
                    velocities = [],
                    masses = [],
                    colors = [],
                    sizes = [],
                } = {}) {
        super();
        this._positions = positions;
        this._colors = colors;
        this._sizes = sizes;
        this._masses = masses;
        this._velocities = velocities;

        this._particleState = new PhysicsState();
    }

    particleAt(index) {
        this._particleState.position.copy(this._positions[index]);
        this._particleState.velocity.copy(this._velocities[index]);
        this._particleState.mass = this._masses[index];
        return this._particleState;
    }

    apply(dt, accelerationFn, integrator = Integrators.symplecticEulerStep) {
        for (let i = 0; i < this.length; i++) {
            const particle = this.particleAt(i);
            integrator(particle, dt, accelerationFn);
            this._positions[i] = this._particleState.position;
            this._velocities[i] = this._particleState.velocity;
        }
    }

    get length() { return this._positions.length; }

    positionAt(index) { return this._positions[index]; }
    colorAt(index) { return this._colors[index]; }
    sizeAt(index) { return this._sizes[index]; }
}