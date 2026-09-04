import {
    Simulation, Vec3, Block, degToRad, toCartesian, Segments, BoxSegmentsView, Slider, Range, Interval
} from "../../../src/index.js";

const functionToIntegrate = (theta, phi) => theta * theta * (phi - Math.PI) * (phi - Math.PI);

class SegmentedSphere extends Segments {
    constructor(radius = 1, da = 0.05) {
        super();
        this._thetaPhi = [];
        this._radius = radius;
        this._da = da;
        this.thetaMin = 0;
        this.phiMin = 0;
        this.thetaMax = 180;
        this.phiMax = 360;

        const values = [];
        for (let theta = 0; theta <= Math.PI; theta += da)
            for (let phi = 0; phi <= 2 * Math.PI; phi += da)
                this.#createCell(theta, phi, values);
        this._interval = new Interval(Math.min(...values), Math.max(...values));
    }

    #createCell(theta, phi, values) {
        const val = functionToIntegrate(theta, phi);
        values.push(val);
        this.push(new Block({
            position: toCartesian(this._radius, theta, phi),
            size: new Vec3(this._da, this._da, this._da)
        }));
        this._thetaPhi.push({theta:theta, phi:phi});
    }

    segmentVisibleAt(index) {
        const {theta, phi} = this.thetaPhiAt(index);
        return (
            theta >= degToRad(this.thetaMin) &&
            theta <= degToRad(this.thetaMax) &&
            phi >= degToRad(this.phiMin) &&
            phi <= degToRad(this.phiMax)
        );
    }

    normalize = (value) => this._interval.normalize(value);

    integrate(func) {
        let sum = 0;
        for (let index = 0; index < this.count; index++) {
            const {theta, phi} = this.thetaPhiAt(index);
            if (this.segmentVisibleAt(index))
                sum += func(theta, phi) * Math.sin(theta);
        }
        return sum * this._radius * this._radius * this._da * this._da;
    }

    thetaPhiAt(index) { return this._thetaPhi[index]; }
}

const sphere = new SegmentedSphere();
const sphereView = new BoxSegmentsView({
    opacity: 0.75,
    colorMapper: (segment, index, targetColor) => {
        const {theta, phi} = sphere.thetaPhiAt(index);
        const t = sphere.normalize(functionToIntegrate(theta, phi));
        targetColor.setRGB(.2 - t, t, t * .25);
    },
    visibilityMapper: (segment, index) => sphere.segmentVisibleAt(index)
});

const simulation = Simulation
    .with({
        htmlDivId: "polarCoordinatesIntegration",
        headUpDisplay: {
            enabled: false
        }
    })
    .bind(sphere.onceWith(sphereView))
    .frameSceneOn(sphereView, {padding: 1, translationY: -1.5})
    .append(new Slider("θ_min")
        .on(sphere)
        .withProperty("thetaMin")
        .withRange(new Range(0, 180, 1))
        .withValue(sphere.thetaMin)
        .onInput(() => updateIntegral(sphere.integrate(functionToIntegrate)))
    )
    .append(new Slider("θ_max")
        .on(sphere)
        .withProperty("thetaMax")
        .withRange(new Range(0, 180, 1))
        .withValue(sphere.thetaMax)
        .onInput(() => updateIntegral(sphere.integrate(functionToIntegrate)))
    )
    .append(new Slider("φ_min")
        .on(sphere)
        .withProperty("phiMin")
        .withRange(new Range(0, 360, 1))
        .withValue(sphere.phiMin)
        .onInput(() => updateIntegral(sphere.integrate(functionToIntegrate)))
    )
    .append(new Slider("φ_max")
        .on(sphere)
        .withProperty("phiMax")
        .withRange(new Range(0, 360, 1))
        .withValue(sphere.phiMax)
        .onInput(() => updateIntegral(sphere.integrate(functionToIntegrate)))
    )
    .provideAxesAround(sphereView);

const updateIntegral = value =>
    simulation.setLatexTitle("\\Large\\iint\\theta^2 (\\phi - \\pi)^2 d\\phi d\\theta=" + Number(value).toFixed(2));

updateIntegral(sphere.integrate(functionToIntegrate));
