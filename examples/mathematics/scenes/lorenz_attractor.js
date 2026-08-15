import {Color} from "three";
import {StrangeAttractor, LineSegmentsView, Simulation, Vec3} from "../../../src/index.js";

export class LorenzAttractor extends StrangeAttractor {
    constructor({
        sigma = 10,
        rho = 28,
        beta = 8 / 3,
        initialPosition = new Vec3(0.1, 0, 0),
        dt = 0.004,
        steps = 22500,
        maxDistance = 1.9
    } = {}) {
        super({dt, steps, initialPosition});

        this.sigma = sigma;
        this.rho = rho;
        this.beta = beta;
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
}

const lorenz = new LorenzAttractor();
const lorenzView = new LineSegmentsView({ lineWidth: 1.25 });

const simulation = Simulation
    .with({
        htmlDivId: "lorenzAttractorContainer"
    })
    //.provideAxesAround(lorenzView)
    // .frameSceneOn(lorenzView)
    .bind(lorenz.alwaysWith(lorenzView));

simulation.provideAxesAround(lorenzView, {
    tickLabels: false
});
simulation.frameSceneOn(lorenzView, {translationY: -40, padding: 0.9});