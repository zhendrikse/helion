import { Color } from "three";
import {
    Button, LineSegments, LineSegmentsView, normalDistribution, randomInt, Simulation, uniform, Vec3
} from "../../../src/index.js";

function scale(length) {
    const mx = 4;
    const scaleFactor = 5.0;

    let a1, a2, max;

    while (true) {
        a1 = randomInt(-mx, mx);
        a2 = randomInt(-mx, mx);
        max = Math.abs(a1) + Math.abs(a2);

        if (max > 0)
            break;
    }

    return [a1, a2, length / (scaleFactor * max)];
}

export class Harmonograph extends LineSegments {
    constructor({
        depth = 600,
        width = 600,
        iterations = 150,
        hueIncrement = 0.159,
        decayFactor = 0.9999
    } = {}) {
        super();

        this._depth = depth;
        this._width = width;
        this._iterations = iterations;
        this._hueIncrement = hueIncrement;
        this._decayFactor = decayFactor;
    }

    generate(standardDeviation = 0.002) {
        this.clear();
        const mx = 4;

        const [ax1, ax2, xscale] = scale(this._width);
        const [ay1, ay2, yscale] = scale(this._width);
        const [az1, az2, zscale] = scale(this._depth);

        const fx1 = randomInt(1, mx) + normalDistribution(0, standardDeviation);
        const fx2 = randomInt(1, mx) + normalDistribution(0, standardDeviation);
        const fy1 = randomInt(1, mx) + normalDistribution(0, standardDeviation);
        const fy2 = randomInt(1, mx) + normalDistribution(0, standardDeviation);
        const fz1 = randomInt(1, mx) + normalDistribution(0, standardDeviation);
        const fz2 = randomInt(1, mx) + normalDistribution(0, standardDeviation);

        const px1 = uniform(0, 2 * Math.PI);
        const px2 = uniform(0, 2 * Math.PI);
        const py1 = uniform(0, 2 * Math.PI);
        const py2 = uniform(0, 2 * Math.PI);
        const pz1 = uniform(0, 2 * Math.PI);
        const pz2 = uniform(0, 2 * Math.PI);

        const dt = 0.02;

        let previous = null;
        let hue = 0;
        let t = 0;
        let k = 1;

        for (let i = 0; i < this._iterations * this._iterations; i++) {
            const x = xscale * k * (
                ax1 * Math.sin(t * fx1 + px1) +
                ax2 * Math.sin(t * fx2 + px2)
            );

            const y = yscale * k * (
                ay1 * Math.sin(t * fy1 + py1) +
                ay2 * Math.sin(t * fy2 + py2)
            );

            const z = zscale * k * (
                az1 * Math.sin(t * fz1 + pz1) +
                az2 * Math.sin(t * fz2 + pz2)
            );

            const current = new Vec3(x, y, z);
            if (previous) {
                const color = new Color();
                color.setHSL((hue % 360) / 360, 1, 0.5);
                this.add(previous, current, color);
            }

            previous = current;

            hue += dt * this._hueIncrement * 50;
            t += dt;
            k *= this._decayFactor;
        }
    }
}

const harmonograph = new Harmonograph();
harmonograph.generate();
const harmonographView = new LineSegmentsView({
    segments: model => model.segments,
    lineWidth: 1.25
});

Simulation
    .with({
        htmlDivId: "harmonographContainer"
    })
    .bind(harmonograph.alwaysWith(harmonographView))
    .frameSceneOn(harmonographView, {padding: 0.9})
    .withMouseClickEventListener(() => harmonograph.generate());
