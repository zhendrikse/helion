import {Color} from "three";
import {LineSegmentsView, StrangeAttractor, Simulation, Vec3, ColorMappers} from "../../../src/index.js";

export class RoesslerAttractor extends StrangeAttractor {
    constructor({
        a = 0.343,
        b = 1.82,
        c = 9.75,
        initialPosition = new Vec3(10, -2, 0.2),
        dt = 0.01,
        duration = 200,
        maxDistance = 3.70356
    } = {}) {
        const steps = Math.floor(duration / dt);
        super({initialPosition, dt, steps});

        this.a = a;
        this.b = b;
        this.c = c;

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

    hue(distance) {
        return distance / this.maxDistance;
    }
}

const roessler = new RoesslerAttractor({
    a: 0.343,
    b: 1.82,
    c: 9.75
});

const view = new LineSegmentsView({
    lineWidth: 1.25,
    colorMapper: ColorMappers.get(ColorMappers.Hue)
});
view.rotation.x = -Math.PI / 2
Simulation
    .with({
        htmlDivId: "rosslerAttractorContainer",
        fieldOfView: 30
    })
    .bind(roessler.alwaysWith(view))
    .provideAxesAround(view, {tickLabels: false})
    .frameSceneOn(view, {padding: .9, translationY: -100});

