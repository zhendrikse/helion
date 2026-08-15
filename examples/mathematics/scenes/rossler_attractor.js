import {Color} from "three";
import { Integrators, LineSegment, LineSegmentsView, Segments, Simulation, Vec3 } from "../../../src/index.js";

export class RoesslerAttractor extends Segments {
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
            this.push(new LineSegment(previous, position.clone(), this.color(distance)));
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

