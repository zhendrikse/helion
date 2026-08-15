import {Color} from "three";
import { LineSegments, LineSegmentsView, Simulation, Vec3} from "../../../src/index.js";

class Integrators {
    static rk4VectorStep(state, dt, derivativeFn) {
        const k1 = derivativeFn(state);

        const s2 = state.clone().addScaledVector(k1, dt / 2);
        const k2 = derivativeFn(s2);

        const s3 = state.clone().addScaledVector(k2, dt / 2);
        const k3 = derivativeFn(s3);

        const s4 = state.clone().addScaledVector(k3, dt);
        const k4 = derivativeFn(s4);

        state
            .addScaledVector(k1, dt / 6)
            .addScaledVector(k2, dt / 3)
            .addScaledVector(k3, dt / 3)
            .addScaledVector(k4, dt / 6);
    }
}

export class RoesslerAttractor extends LineSegments {
    constructor({
        a = 0.343,
        b = 1.82,
        c = 9.75,
        initialPosition = new Vec3(10, -2, 0.2),
        dt = 0.01,
        duration = 200,
        maxDistance = 3.70356
    } = {}) {
        super();

        this.a = a;
        this.b = b;
        this.c = c;

        this.initialPosition = initialPosition;
        this.dt = dt;
        this.duration = duration;
        this.maxDistance = maxDistance;

        this.generate();
    }

    derivative(position) {
        return new Vec3(
            -position.y - position.z,
            position.x + this.a * position.y,
            this.b + position.z * (position.x - this.c)
        );
    }

    color(distance) {
        const hue = distance / this.maxDistance;
        return new Color().setHSL(hue % 1, 1, 0.5);
    }

    generate() {
        this.clear();
        let position = this.initialPosition.clone();
        const steps = Math.floor(this.duration / this.dt);

        for (let i = 0; i < steps; i++) {
            const previous = position.clone();
            Integrators.rk4VectorStep(position, this.dt, p => this.derivative(p));
            const distance = position.distanceTo(previous);
            this.add(previous, position, this.color(distance));
        }
    }
}

const roessler = new RoesslerAttractor({
    a: 0.343,
    b: 1.82,
    c: 9.75
});

const view = new LineSegmentsView({ lineWidth: 1.25 });
view.rotation.x = -Math.PI / 2
Simulation
    .with({
        htmlDivId: "rosslerAttractorContainer",
        fieldOfView: 30
    })
    .bind(roessler.alwaysWith(view))
    .provideAxesAround(view, {tickLabels: false})
    .frameSceneOn(view, {padding: .9, translationY: -100});

