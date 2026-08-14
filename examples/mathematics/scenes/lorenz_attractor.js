import {Color} from "three";
import {LineSegments, LineSegmentsView, Simulation, Vec3} from "../../../src/index.js";

export class LorenzAttractor extends LineSegments {
    constructor({
        sigma = 10,
        rho = 28,
        beta = 8 / 3,
        point = new Vec3(0.1, 0, 0),
        dt = 0.004,
        steps = 22500,
        maxDistance = 1.9
    } = {}) {
        super();

        this.sigma = sigma;
        this.rho = rho;
        this.beta = beta;
        this.point = point;
        this.dt = dt;
        this.steps = steps;
        this.maxDistance = maxDistance;

        this.generate();
    }

    derivative(point) {
        return new Vec3(
            this.sigma * (point.y - point.x),
            point.x * (this.rho - point.z) - point.y,
            point.x * point.y - this.beta * point.z
        );
    }

    color(distance) {
        const hue = distance / this.maxDistance;
        const color = new Color();
        color.setHSL(hue % 1, 1.0, 0.5);
        return color;
    }

    generate() {
        this.clear();

        let current = this.point.clone();
        for (let i = 0; i < this.steps; i++) {
            const derivative = this.derivative(current);
            const next = current.clone().add(derivative.clone().multiplyScalar(this.dt));
            const distance = next.clone().sub(current).length();
            this.add(current, next, this.color(distance));
            current = next;
        }
    }
}

const lorenz = new LorenzAttractor();
const lorenzView = new LineSegmentsView({
    segments: model => model.segments,
    lineWidth: 1.5
});

const simulation = Simulation
    .with({
        htmlDivId: "lorenzAttractorContainer"
    })
    //.provideAxesAround(lorenzView)
    // .frameSceneOn(lorenzView)
    .bind(lorenz.alwaysWith(lorenzView));

simulation.provideAxesAround(lorenzView);
simulation.frameSceneOn(lorenzView, {translationY: -40, padding: 1});